// Run with node --test scripts/schema-export.test.mjs. No real schema or DB tooling.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

const targets = ["sync-python-models", "sync-api-test-db-fixtures"];
const models = [
  ["scoring-worker", "scoring_worker"],
  ["shared-analysis-worker", "agora_analysis_worker_shared"],
  ["import-worker", "import_worker"],
  ["content-translation-worker", "content_translation_worker"],
];

async function fixture(t) {
  const parent = resolve(tmpdir(), "opencode");
  await mkdir(parent, { recursive: true });
  const root = await realpath(
    await mkdtemp(resolve(parent, "schema export test-"))
  );
  t.after(async () => await rm(root, { recursive: true, force: true }));
  const bin = resolve(root, "stub commands");
  const scratch = resolve(root, "scratch sql");
  const events = resolve(root, "events.jsonl");
  for (const path of [
    bin,
    scratch,
    resolve(root, "barrier"),
    resolve(root, "services/api"),
    resolve(root, "services/shared-backend"),
  ]) {
    await mkdir(path, { recursive: true });
  }
  await copyFile(
    resolve(import.meta.dirname, "../Makefile"),
    resolve(root, "Makefile")
  );
  await writeFile(events, "");
  const stub = resolve(bin, "command.mjs");
  await writeFile(
    stub,
    `
import assert from "node:assert/strict";
import { appendFileSync, existsSync, fstatSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
const [command, ...args] = process.argv.slice(2);
const root = process.env.TEST_ROOT;
const record = (event) => appendFileSync(resolve(root, "events.jsonl"), JSON.stringify(event) + "\\n");
const fail = (stage) => {
    if (process.env.FAIL_STAGE === stage) {
        console.error("Synthetic failure: " + stage);
        process.exit(73);
    }
};
if (command === "pnpm") {
    assert.equal(process.cwd(), resolve(root, "services/shared-backend"));
    assert.deepEqual(args, ["run", "sync"]);
    fail("sync");
    await delay(100);
    writeFileSync(resolve(root, "backend-synced"), "synced");
    record({ kind: "sync" });
} else if (command === "npx") {
    assert.equal(process.cwd(), resolve(root, "services/api"));
    assert.ok(existsSync(resolve(root, "backend-synced")), "export requires completed backend sync");
    if (args[0] === "drizzle-kit") {
        assert.deepEqual(args, ["drizzle-kit", "export"]);
        // Identify redirected stdout portably without Linux-only /proc or readlink.
        const output = fstatSync(1);
        const sql = readdirSync(process.env.TMPDIR).map(name => resolve(process.env.TMPDIR, name))
            .find(path => {
                const file = statSync(path);
                return file.dev === output.dev && file.ino === output.ino;
            });
        assert.ok(sql, "export must use the fixture scratch directory");
        const content = "synthetic export " + process.pid;
        writeFileSync(1, content);
        record({ kind: "export", sql, content });
        fail("export");
        writeFileSync(resolve(root, "barrier", String(process.pid)), "ready");
        const deadline = Date.now() + 5000;
        while (readdirSync(resolve(root, "barrier")).length < Number(process.env.EXPORT_COUNT)) {
            assert.ok(Date.now() < deadline, "exports did not overlap");
            await delay(10);
        }
    } else {
        assert.equal(args[0], "tsx");
        assert.ok(["scripts/sync-schema-cli.ts", "scripts/sync-api-test-schema-fixtures-cli.ts"].includes(args[1]));
        const sql = args[args.indexOf("--sql") + 1];
        const stage = args[1] === "scripts/sync-schema-cli.ts"
            ? args[args.indexOf("--service") + 1] : "fixtures";
        record({ kind: "consume", stage, args, sql, content: readFileSync(sql, "utf8") });
        fail(stage);
    }
} else {
    throw new Error("Unexpected command: " + command);
}
`
  );
  for (const command of ["pnpm", "npx"]) {
    const path = resolve(bin, command);
    await writeFile(
      path,
      `#!/bin/sh\nexec "$TEST_NODE" "$TEST_STUB" ${command} "$@"\n`
    );
    await chmod(path, 0o755);
  }
  async function run({
    goals = targets,
    failStage = "",
    missingScratch = false,
  } = {}) {
    const result = spawnSync("make", ["-j2", ...goals], {
      cwd: root,
      encoding: "utf8",
      timeout: 15_000,
      env: {
        ...process.env,
        MAKEFLAGS: "",
        MFLAGS: "",
        MAKEOVERRIDES: "",
        MAKEFILES: "",
        PATH: `${bin}:${process.env.PATH}`,
        TMPDIR: missingScratch ? resolve(scratch, "missing") : scratch,
        TEST_ROOT: root,
        TEST_NODE: process.execPath,
        TEST_STUB: stub,
        FAIL_STAGE: failStage,
        EXPORT_COUNT: String(goals.length),
      },
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.deepEqual(
      await readdir(scratch),
      [],
      "scratch SQL must be cleaned up"
    );
    const log = (await readFile(events, "utf8")).trim();
    return {
      ...result,
      events: log ? log.split("\n").map((line) => JSON.parse(line)) : [],
    };
  }
  return { run };
}

test("parallel targets use distinct exports after backend sync and preserve consumer arguments", async (t) => {
  const f = await fixture(t);
  const result = await f.run();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.events[0].kind, "sync");
  assert.equal(
    result.events.filter((event) => event.kind === "sync").length,
    1
  );
  const exports = result.events.filter((event) => event.kind === "export");
  assert.equal(exports.length, 2);
  assert.notEqual(exports[0].sql, exports[1].sql);
  const consumers = result.events.filter((event) => event.kind === "consume");
  assert.equal(consumers.length, 5);
  // Both exporters must reach the barrier before either target consumes SQL.
  assert.deepEqual(
    result.events.slice(1, 3).map((event) => event.kind),
    ["export", "export"]
  );
  for (const consumer of consumers) {
    assert.equal(
      consumer.content,
      exports.find((event) => event.sql === consumer.sql)?.content
    );
  }
  const python = consumers.filter((event) => event.stage !== "fixtures");
  const fixtures = consumers.find((event) => event.stage === "fixtures");
  assert.notEqual(fixtures.sql, python[0].sql);
  assert.deepEqual(
    python.map((event) => event.stage),
    models.map(([service]) => service)
  );
  for (const [index, [service, module]] of models.entries()) {
    assert.equal(python[index].sql, python[0].sql);
    assert.deepEqual(python[index].args, [
      "tsx",
      "scripts/sync-schema-cli.ts",
      "--service",
      service,
      "--schema-ts",
      "../shared-backend/src/schema.ts",
      "--sql",
      python[0].sql,
      "--output",
      `../${service}/src/${module}/generated_models.py`,
    ]);
  }
  assert.deepEqual(fixtures.args, [
    "tsx",
    "scripts/sync-api-test-schema-fixtures-cli.ts",
    "--sql",
    fixtures.sql,
    "--config",
    "tests/fixtures/db/schema-fixtures.json",
    "--output-dir",
    "tests/fixtures/db",
  ]);
});

for (const target of targets) {
  const stages =
    target === "sync-python-models"
      ? models.map(([service]) => service)
      : ["fixtures"];
  for (const failStage of ["sync", "export", ...stages]) {
    test(`${target}: ${failStage} failure stops the recipe and cleans scratch SQL`, async (t) => {
      const f = await fixture(t);
      const result = await f.run({ goals: [target], failStage });
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        new RegExp(`Synthetic failure: ${failStage}`)
      );
      const consumers = result.events.filter(
        (event) => event.kind === "consume"
      );
      assert.deepEqual(
        consumers.map((event) => event.stage),
        stages.slice(0, stages.indexOf(failStage) + 1)
      );
      assert.equal(
        result.events.filter((event) => event.kind === "export").length,
        failStage === "sync" ? 0 : 1
      );
    });
  }
  test(`${target}: mktemp failure prevents export`, async (t) => {
    const f = await fixture(t);
    const result = await f.run({ goals: [target], missingScratch: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /mktemp/);
    assert.deepEqual(result.events, [{ kind: "sync" }]);
  });
  test(`${target}: standalone invocation syncs backend and cleans scratch SQL`, async (t) => {
    const f = await fixture(t);
    const result = await f.run({ goals: [target] });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.events[0].kind, "sync");
    assert.deepEqual(
      result.events
        .filter((event) => event.kind === "consume")
        .map((event) => event.stage),
      stages
    );
  });
}
