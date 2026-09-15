import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  chmod,
  symlink,
  readdir,
  readFile,
  rm,
  cp,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";

const repository = resolve(import.meta.dirname, "..");

for (const mode of ["success", "podman", "workload-failure", "missing-events", "invalid-response", "final-change", "snapshot-failure", "interrupted", "check", "docker-port-failure"]) {
  test(`performance runner: ${mode}`, async (t) => {
    const parent = resolve(tmpdir(), "opencode");
    await mkdir(parent, { recursive: true });
    const dir = await mkdtemp(resolve(parent, "ranking-perf-test-"));
    t.after(async () => await rm(dir, { recursive: true, force: true }));
    const bin = resolve(dir, "bin");
    const logRoot = resolve(dir, "logs");
    const latest = resolve(logRoot, "latest");
    await mkdir(bin);
    await mkdir(latest, { recursive: true });
    // Run the real launcher/observer in an isolated repository. The real tsx
    // loader starts a protocol fixture directly; pnpm must never be involved.
    for (const relative of [
      "scripts/dev-log-runner.mjs", "scripts/log-markers.mjs", "scripts/ranking-performance.mjs",
      "services/load-testing/src/utils/solidagoWorkload.ts",
      "services/load-testing/src/utils/rankingStrategies.ts",
      "services/load-testing/src/utils/deterministicRandom.ts",
      "services/load-testing/src/shared-backend/rankingDiagnosticsProtocol.ts",
    ]) {
      await mkdir(dirname(resolve(dir, relative)), { recursive: true });
      await copyFile(resolve(repository, relative), resolve(dir, relative));
    }
    await cp(resolve(repository, "services/load-testing/tools"), resolve(dir, "services/load-testing/tools"), { recursive: true });
    for (const service of ["api", "load-testing"]) {
      await mkdir(resolve(dir, `services/${service}/node_modules`), { recursive: true });
      await writeFile(resolve(dir, `services/${service}/package.json`), JSON.stringify({ type: "module" }));
    }
    await symlink(resolve(repository, "services/load-testing/node_modules/zod"), resolve(dir, "services/load-testing/node_modules/zod"));
    await symlink(resolve(repository, "services/api/node_modules/tsx"), resolve(dir, "services/api/node_modules/tsx"));
    await mkdir(resolve(dir, "services/load-testing/node_modules/vite"));
    await writeFile(resolve(dir, "services/load-testing/node_modules/vite/package.json"), JSON.stringify({ type: "module", exports: "./index.mjs" }));
    await writeFile(resolve(dir, "services/load-testing/node_modules/vite/index.mjs"), "export async function build() { console.log('fixture build'); }\n");
    const sourcePaths = [
      resolve(latest, "api.events.jsonl"),
      resolve(latest, "scoring-worker.events.jsonl"),
    ];
    const advancedPath = resolve(dir, "advanced");
    for (const [index, path] of sourcePaths.entries())
      await writeFile(
        path,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          schemaVersion: 1,
          scenario: "solidago-ranking",
          phase: index === 0 ? "api" : "scoring-worker",
          action: "logging_configured",
          metadata: { performanceEnabled: true, pid: index === 0 ? process.pid : process.ppid, logLevel: "INFO" },
        }) + "\n"
      );
    const scores = ["a", "b", "c", "d"].map((itemSlugId, index) => ({
      itemSlugId,
      score: (4 - index) / 4,
      participantCount: 1,
    }));
    const server = createServer(async (_request, response) => {
      if (mode === "final-change") await writeFile(advancedPath, "yes");
      response.setHeader("Content-Type", "application/json");
      response.end(mode === "invalid-response" ? "PRIVATE_RESPONSE_BODY" : JSON.stringify({ rankings: scores }));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => server.close());
    const stub = resolve(bin, "stub.mjs");
    await writeFile(
      stub,
      `#!/usr/bin/env node
import { basename } from "node:path";
import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
const program = basename(process.argv[1]);
const args = process.argv.slice(2);
const scores = JSON.parse(process.env.FIXTURE_SCORES);
function output(data) { console.log(JSON.stringify(data)); }
if (program === "docker") {
  if (args[0] === "port" && process.env.FIXTURE_MODE === "docker-port-failure") { console.error("PRIVATE_DOCKER_ERROR"); process.exit(17); }
  if (args[0] === "info") output(process.env.FIXTURE_MODE === "podman" ? { host: { cpus: 4, memTotal: 8000000000 } } : { NCPU: 4, MemTotal: 8000000000 });
  else if (args[0] === "port") console.log("0.0.0.0:" + (args[1].includes("replica") ? "5433" : "5432"));
  else if (args[0] === "stats") output(process.env.FIXTURE_MODE === "podman" ? { Name: "postgres", ContainerID: "fixture-container", CPU: 1, CPUNano: 1000000000, MemUsage: 1024, MemLimit: 4096, MemPerc: 25, BlockInput: 0, BlockOutput: 0 } : { Name: "postgres", CPUPerc: "1%" });
  else if (args.includes("valkey-cli")) console.log("0");
  else {
    const query = args.at(-1);
    if (query.includes("extensionInstalled")) output({ database: "agora", serverVersion: "16", extensionInstalled: true, settings: { track_io_timing: "on", track_wal_io_timing: "on" } });
    else if (query.includes("pg_stat_activity")) output({ timestamp: new Date().toISOString(), activity: [], blockers: [], tables: [], database: {}, replication: [] });
    else { console.error("Unexpected SQL fixture operation"); process.exit(2); }
  }
} else if (program === "k6") {
  if (args[0] === "version") console.log("k6 fixture");
  else {
    const summary = args[args.indexOf("--summary-export") + 1];
    writeFileSync(summary, JSON.stringify({ metrics: { ranking_users_started: { count: 1 }, ranking_users_completed: { count: 1 }, ranking_comparisons_saved: { count: 1 } } }));
    const base = { schemaVersion: 1, timestamp: new Date().toISOString(), scenario: "solidago-ranking", conversationSlugId: "fixture", userId: "fixture:0" };
    const emit = event => output({ level: 30, msg: "AGORA_LOAD_EVENT " + JSON.stringify({ ...base, ...event }) });
    emit({ phase: "setup", action: "item_manifest", metadata: { itemOrder: JSON.stringify(["a","b","c","d"]), strategy: "unanimous", seed: "fixture-seed" } });
    if (process.env.FIXTURE_MODE !== "missing-events") emit({ phase: "participation", action: "user_started" });
    emit({ phase: "participation", action: "comparison_saved", count: 1 });
    emit({ phase: "participation", action: "user_completed" });
    const [api, worker] = JSON.parse(process.env.FIXTURE_SOURCES);
    appendFileSync(api, JSON.stringify({ ...base, phase: "api", action: "request_completed", responseTimeMs: 5, metadata: { operation: "save", transaction: 3 } }) + "\\n");
    appendFileSync(worker, JSON.stringify({ ...base, phase: "scoring-worker", action: "publication_completed", outcome: "success" }) + "\\n");
    writeFileSync(process.env.FIXTURE_FINISHED, "yes");
    if (process.env.FIXTURE_MODE === "interrupted") setInterval(() => {}, 1000);
    process.exitCode = process.env.FIXTURE_MODE === "workload-failure" ? 99 : 0;
  }
} else if (program === "ranking-diagnostics-probe.ts") {
  output({ id: 0, ok: true, data: { primary: "agora", replica: "agora", pid: process.pid, primaryPort: 5432, replicaPort: 5433, primaryStatsAccess: true, replicaStatsAccess: true } });
  for await (const line of createInterface({ input: process.stdin })) {
    const request = JSON.parse(line);
    if (request.operation === "query-stats" && process.env.FIXTURE_MODE === "snapshot-failure" && existsSync(process.env.FIXTURE_FINISHED)) {
      output({ id: request.id, ok: false, error: "database_error" }); continue;
    }
    const advanced = existsSync(process.env.FIXTURE_ADVANCED);
    const data = request.operation === "revisions" ? [{ id: 1, slug_id: "fixture", scoring_input_revision: advanced ? "3" : "2", processed_scoring_input_revision: advanced ? "3" : "2", snapshot_id: advanced ? 11 : 10, published_at: new Date().toISOString(), vote_count: 1, participant_count: 1 }]
      : request.operation === "scores" ? scores : request.operation === "plan" ? [{ Plan: { "Node Type": "Result" } }] : request.operation === "query-stats" ? { reset: "stable", dealloc: 0, queries: [] } : [];
    output({ id: request.id, ok: true, data });
  }
} else if (program === "git") { if (args[0] === "rev-parse") console.log("fixture-commit"); }
else if (program === "ps") { writeFileSync(process.env.FIXTURE_OBSERVER_PID, String(process.ppid)); console.log(process.env.FIXTURE_API_PID + " 1 5000"); console.log(process.env.FIXTURE_WORKER_PID + " 1 5000"); console.log(process.ppid + " 1 5000"); }
else { console.error("Unexpected package-manager or command launch"); process.exit(2); }
`
    );
    await chmod(stub, 0o755);
    await mkdir(resolve(dir, "services/api/scripts"));
    await copyFile(stub, resolve(dir, "services/api/scripts/ranking-diagnostics-probe.ts"));
    for (const name of ["docker", "k6", "git", "pnpm", "ps"])
      await symlink(stub, resolve(bin, name));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const child = spawn(
      process.execPath,
      [
        "scripts/dev-log-runner.mjs",
        "--service",
        "load-testing-solidago",
        "--",
        process.execPath,
        "--experimental-strip-types",
        "scripts/ranking-performance.mjs",
        mode === "check" ? "check" : "run",
      ],
      {
        cwd: dir,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          AGORA_LOG_DIR: logRoot,
          AGORA_LOG_RUN_ID: "fixture-run",
          CONVERSATION_SLUG_IDS: "fixture",
          RANKING_USERS_PER_CONVERSATION: "1",
          RANKING_VUS_PER_CONVERSATION: "1",
          RANKING_STRATEGY: "unanimous",
          RANKING_SEED: "fixture-seed",
          API_BASE_URL: `http://127.0.0.1:${address.port}`,
          BACKEND_DID: "did:web:localhost%3A8084",
          PERF_DRAIN_TIMEOUT_SECONDS: "0",
          FIXTURE_MODE: mode,
          FIXTURE_SOURCES: JSON.stringify(sourcePaths),
          FIXTURE_SCORES: JSON.stringify(scores),
          FIXTURE_API_PID: String(process.pid),
          FIXTURE_WORKER_PID: String(process.ppid),
          FIXTURE_ADVANCED: advancedPath,
          FIXTURE_FINISHED: resolve(dir, "finished"),
          FIXTURE_OBSERVER_PID: resolve(dir, "observer-pid"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    const exited = once(child, "exit");
    if (mode === "interrupted") {
      let observerPid;
      const deadline = Date.now() + 10000;
      while (!observerPid && Date.now() < deadline) {
        try { const [pid] = await Promise.all([readFile(resolve(dir, "observer-pid"), "utf8"), readFile(resolve(dir, "finished"), "utf8")]); observerPid = Number(pid); }
        catch { await new Promise(resolve => setTimeout(resolve, 25)); }
      }
      assert.ok(observerPid, output);
      process.kill(observerPid, "SIGTERM");
    }
    const [code] = await exited;
    assert.equal(
      code,
      mode === "success" || mode === "podman" || mode === "check" ? 0 : mode === "workload-failure" ? 99 : 1,
      output
    );
    const runDir = resolve(logRoot, "runs/fixture-run");
    if (mode === "check" || mode === "docker-port-failure") {
      assert.ok(!(await readdir(runDir)).some(name => name.startsWith("ranking-performance-")));
      if (mode === "check") assert.ok(output.includes("preflight_complete"));
      else { assert.ok(output.includes("docker port failed (17)"), output); assert.ok(!output.includes("PRIVATE_DOCKER_ERROR")); }
      return;
    }
    const artifacts = (await readdir(runDir)).find((name) =>
      name.startsWith("ranking-performance-")
    );
    assert.ok(artifacts, output);
    const report = JSON.parse(
      await readFile(resolve(runDir, artifacts, "report.json"), "utf8")
    );
    if (mode !== "invalid-response" && mode !== "interrupted") {
      assert.equal(report.evaluations[0].apiMatchesPublishedSnapshot, true);
      assert.equal(report.evaluations[0].kendallTauA, 1);
    } else if (mode === "invalid-response") {
      assert.equal(report.evaluations.length, 0);
      assert.ok(report.diagnostics.some(d => d.stage === "evaluate:fixture"));
      assert.ok(!JSON.stringify(report).includes("PRIVATE_RESPONSE_BODY"));
      assert.ok(!output.includes("PRIVATE_RESPONSE_BODY"));
    }
    if (mode === "final-change") assert.equal(report.finalFreshnessVerified, false);
    if (mode === "interrupted") assert.equal(report.interrupted, true);
    if (mode === "snapshot-failure") assert.ok(report.diagnostics.some(d => d.stage === "after"));
    assert.equal(
      report.completeParticipantEventCapture,
      mode !== "missing-events"
    );
    assert.equal(report.exitCode, mode === "workload-failure" ? 99 : mode === "interrupted" ? 1 : 0);
  });
}
