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
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

for (const mode of ["success", "workload-failure", "missing-events", "invalid-response", "final-change", "snapshot-failure", "interrupted"]) {
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
  if (args[0] === "info") output({ cpus: 4, memoryBytes: 8000000000 });
  else if (args[0] === "port") console.log("0.0.0.0:" + (args[1].includes("replica") ? "5433" : "5432"));
  else if (args[0] === "stats") output({ Name: "postgres", CPUPerc: "1%" });
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
} else if (program === "pnpm" && args.includes("scripts/ranking-diagnostics-probe.ts")) {
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
else if (program !== "pnpm") process.exit(2);
`
    );
    await chmod(stub, 0o755);
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
        "run",
      ],
      {
        cwd: resolve(import.meta.dirname, ".."),
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
        try { observerPid = Number(await readFile(resolve(dir, "observer-pid"), "utf8")); }
        catch { await new Promise(resolve => setTimeout(resolve, 25)); }
      }
      assert.ok(observerPid, output);
      process.kill(observerPid, "SIGTERM");
    }
    const [code] = await exited;
    assert.equal(
      code,
      mode === "success" ? 0 : mode === "workload-failure" ? 99 : 1,
      output
    );
    const runDir = resolve(logRoot, "runs/fixture-run");
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
