// Run with node --test scripts/shared-script.test.mjs. No database or real service is started.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

const repo = resolve(import.meta.dirname, "..");

test("Vue-only shared edits avoid schema exports without removing the existing TypeScript sync workflow", () => {
  const result = spawnSync("make", ["-n", "dev-sync-raw"], {
    cwd: repo,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.stdout.includes("-p 'services/shared/src/**/*.ts' -t sync ")
  );
  assert.ok(
    result.stdout.includes("-p 'services/shared/src/**/*.vue' -t sync-all")
  );
});

async function put({ path, content, executable = false }) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, { mode: executable ? 0o755 : 0o600 });
}

async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), "agora script tests "));
  t.after(async () => await rm(root, { recursive: true, force: true }));
  return root;
}

function run({ script, cwd, args = [], env = {} }) {
  return spawnSync("/bin/sh", [script, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 15_000,
  });
}

async function syncFixture(t) {
  const root = await fixture(t);
  for (const service of [
    "shared",
    "shared-backend",
    "shared-app-api",
    "api",
    "agora",
    "conversation-email-update-worker",
    "load-testing",
  ]) {
    await mkdir(resolve(root, "services", service, "src"), { recursive: true });
  }
  for (const service of ["shared", "shared-backend", "shared-app-api"]) {
    const target = resolve(
      root,
      "services",
      service,
      "scripts/rsync_and_sed.sh"
    );
    await mkdir(dirname(target), { recursive: true });
    await copyFile(
      resolve(repo, "services", service, "scripts/rsync_and_sed.sh"),
      target
    );
  }
  await put({
    path: resolve(root, "services/shared/src/branding/Avatar.vue"),
    content: "<template><span>Brand</span></template>\n",
  });
  await put({
    path: resolve(root, "services/shared/src/value.ts"),
    content: "export const value = 1;\n",
  });
  await put({
    path: resolve(root, "services/shared-app-api/src/value.ts"),
    content: "export const value = 2;\n",
  });
  await put({
    path: resolve(root, "services/shared-backend/src/schema.ts"),
    content: "export const schema = {};\n",
  });
  await put({
    path: resolve(root, "services/shared-backend/src/apiOnly.ts"),
    content: "export const apiOnly = true;\n",
  });
  await put({
    path: resolve(root, "services/shared-backend/src/email/Email.vue"),
    content: "<template><p>Email</p></template>\n",
  });
  await put({
    path: resolve(root, "services/shared-backend/src/email/build.mjs"),
    content: "export const build = true;\n",
  });
  return root;
}

function runSync({ root, service, env = {} }) {
  const cwd = resolve(root, "services", service);
  return spawnSync("/bin/bash", ["scripts/rsync_and_sed.sh"], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 15_000,
  });
}

test("source sync is repeatable, warns correctly, deletes stale copies and keeps the worker subset", async (t) => {
  const root = await syncFixture(t);
  const worker = resolve(root, "services/conversation-email-update-worker/src");
  await put({
    path: resolve(worker, "shared-backend/obsolete.ts"),
    content: "old\n",
  });
  for (let iteration = 0; iteration < 2; iteration += 1) {
    for (const service of ["shared", "shared-backend", "shared-app-api"]) {
      const result = runSync({ root, service });
      assert.equal(result.status, 0, result.stderr);
    }
  }
  for (const path of [
    "shared/value.ts",
    "shared/branding/Avatar.vue",
    "shared-backend/schema.ts",
    "shared-backend/email/Email.vue",
    "shared-backend/email/build.mjs",
  ]) {
    const content = await readFile(resolve(worker, path), "utf8");
    assert.equal(content.match(/WARNING: GENERATED/g)?.length, 1);
    assert.ok(content.startsWith(path.endsWith(".vue") ? "<!--" : "/**"));
  }
  await assert.rejects(
    readFile(resolve(worker, "shared-backend/obsolete.ts")),
    { code: "ENOENT" }
  );
  await assert.rejects(readFile(resolve(worker, "shared-backend/apiOnly.ts")), {
    code: "ENOENT",
  });
  assert.match(
    await readFile(
      resolve(root, "services/api/src/shared-backend/apiOnly.ts"),
      "utf8"
    ),
    /apiOnly/
  );
  assert.match(
    await readFile(
      resolve(root, "services/agora/src/shared-app-api/value.ts"),
      "utf8"
    ),
    /WARNING: GENERATED/
  );
});

for (const service of ["shared", "shared-backend", "shared-app-api"]) {
  test(`${service} stops on an rsync failure instead of reporting success`, async (t) => {
    const root = await syncFixture(t);
    const bin = resolve(root, "bin");
    await put({
      path: resolve(bin, "rsync"),
      content: "#!/bin/sh\nexit 23\n",
      executable: true,
    });
    const result = runSync({
      root,
      service,
      env: { PATH: `${bin}:${process.env.PATH}` },
    });
    assert.equal(result.status, 23, result.stderr);
    assert.doesNotMatch(result.stdout, /sync complete|Universal sync complete/);
  });
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function exerciseFixture({ t, buildExit = 0 }) {
  const root = await fixture(t);
  const service = resolve(root, "worker service");
  await mkdir(service);
  const script = resolve(service, "run-dev-exercise.sh");
  await copyFile(
    resolve(
      repo,
      "services/conversation-email-update-worker/run-dev-exercise.sh"
    ),
    script
  );
  const log = resolve(root, "events.log");
  const envFile = resolve(root, "exercise.env");
  await put({
    path: envFile,
    content:
      "CONNECTION_STRING=postgresql://test@127.0.0.1/agora_email_exercise_local\nCONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER=test-marker\nCONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID=Ab12Cd34\n",
  });
  const bin = resolve(root, "bin");
  await put({
    path: resolve(bin, "node"),
    executable: true,
    content: `#!/bin/sh\nset -eu\n[ "$NODE_ENV" = production ]\n[ -z "\${CONNECTION_STRING:-}" ]\n[ -z "\${AWS_PROFILE:-}" ]\n[ -z "\${PGHOST:-}" ]\nprintf 'build:%s\\n' "$*" >> ${shellQuote(log)}\nexit ${buildExit}\n`,
  });
  await put({
    path: resolve(service, "node_modules/.bin/tsx"),
    executable: true,
    content: `#!/bin/sh\nset -eu\n[ "$NODE_ENV" = development ]\n[ "$CONVERSATION_EMAIL_UPDATE_PROVIDER" = simulated ]\n[ -n "$CONNECTION_STRING" ]\n[ -z "\${AWS_PROFILE:-}" ]\n[ -z "\${PGHOST:-}" ]\nprintf 'runtime:%s\\n' "$*" >> ${shellQuote(log)}\n`,
  });
  return {
    script,
    log,
    root,
    service,
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      AWS_PROFILE: "must-not-leak",
      PGHOST: "must-not-leak",
      CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_ENV_FILE: envFile,
    },
  };
}

test("direct exercise runtime commands compile first in a credential-free environment", async (t) => {
  const f = await exerciseFixture({ t });
  const result = run({ ...f, cwd: f.root, args: ["run"] });
  assert.equal(result.status, 0, result.stderr);
  const events = (await readFile(f.log, "utf8")).trim().split("\n");
  assert.deepEqual(events, [
    `build:${f.service}/src/shared-backend/email/build.mjs`,
    `runtime:${f.service}/src/devExercise/index.ts run`,
  ]);
});

test("failed email compilation prevents the exercise runtime from starting", async (t) => {
  const f = await exerciseFixture({ t, buildExit: 17 });
  const result = run({ ...f, cwd: f.root, args: ["run"] });
  assert.equal(result.status, 17);
  assert.doesNotMatch(await readFile(f.log, "utf8"), /runtime:/);
});

for (const args of [[], ["plan"]]) {
  test(`exercise ${args[0] ?? "usage"} does not need the compiled renderer`, async (t) => {
    const f = await exerciseFixture({ t, buildExit: 17 });
    const result = run({ ...f, cwd: f.root, args });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(await readFile(f.log, "utf8"), /build:/);
  });
}
