import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { extractMarkerPayload } from "./log-markers.mjs";

const repository = resolve(import.meta.dirname, "..");

test("k6 teardown observes remaining fixtures and fails when an evaluation fails", { timeout: 30_000 }, async (t) => {
  await promisify(execFile)(process.execPath, ["--input-type=module", "-e", "import { build } from 'vite'; await build();"], {
    cwd: resolve(repository, "services/load-testing"),
  });
  const parent = resolve(tmpdir(), "opencode");
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(resolve(parent, "ranking-teardown-"));
  t.after(async () => await rm(directory, { recursive: true, force: true }));
  const observed = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const { conversationSlugId } = JSON.parse(Buffer.concat(chunks).toString());
    observed.push(conversationSlugId);
    response.setHeader("Content-Type", "application/json");
    response.statusCode = conversationSlugId === "first" ? 503 : 200;
    response.end(JSON.stringify({ rankings: [] }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const script = resolve(directory, "teardown.js");
  await writeFile(script, `
import { teardown as evaluate } from ${JSON.stringify(resolve(repository, "services/load-testing/dist/scenario2-solidago-ranking.cjs"))};
export const options = { vus: 1, iterations: 1 };
export default function() {}
export async function teardown() {
  await evaluate({ fixtures: ["first", "second"].map(conversationSlugId => ({ conversationSlugId, itemOrder: ["a", "b", "c", "d"] })) });
}
`);
  const child = spawn("k6", ["run", "--quiet", "--env", "CONVERSATION_SLUG_IDS=first,second", "--env", "RANKING_COOLDOWN_SECONDS=0", "--env", `API_BASE_URL=http://127.0.0.1:${address.port}`, "--env", "BACKEND_DID=did:web:localhost", script], {
    cwd: repository,
    env: { ...process.env, K6_OUT: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const [code] = await once(child, "close");
  assert.notEqual(code, 0, output);
  assert.deepEqual(observed, ["first", "second"], output);
  const events = output.split("\n").flatMap((line) => {
    const payload = extractMarkerPayload({ line, prefix: "AGORA_LOAD_EVENT " });
    return payload === undefined ? [] : [JSON.parse(payload)];
  });
  assert.ok(events.some((event) => event.action === "ranking_evaluated" && event.conversationSlugId === "first" && event.outcome === "failure"), output);
  assert.ok(events.some((event) => event.action === "ranking_evaluated" && event.conversationSlugId === "second" && event.outcome === "info"), output);
  assert.ok(events.some((event) => event.action === "scenario_finished" && event.outcome === "failure"), output);
});
