// Run with node --test scripts/email-build.test.mjs. Uses installed API tooling only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const repo = resolve(import.meta.dirname, "..");

async function waitFor(check) {
  const deadline = Date.now() + 30_000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, "Timed out waiting for fixture process");
    await delay(50);
  }
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

async function fixture(t) {
  const directory = await mkdtemp(resolve(tmpdir(), "email-build-test-"));
  const root = resolve(directory, "service");
  const email = resolve(root, "src/shared-backend/email");
  const runs = [];
  t.after(async () => {
    for (const run of runs) {
      if (run.child.exitCode === null && run.child.signalCode === null) {
        run.child.kill("SIGTERM");
        await Promise.race([run.closed, delay(5_000)]);
      }
      // Only fixture-owned groups, including cleanup if the script regresses.
      const groups = new Set(run.events().map((event) => event.group));
      groups.add(run.child.pid);
      for (const pid of groups) {
        if (pid === undefined) continue;
        try {
          process.kill(-pid, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
      await run.closed;
    }
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(email, { recursive: true });
  await mkdir(resolve(root, "src/shared/branding"), { recursive: true });
  await symlink(
    resolve(repo, "services/api/node_modules"),
    resolve(root, "node_modules"),
    "dir"
  );
  for (const name of ["build.mjs", "tsconfig.json"]) {
    await copyFile(
      resolve(repo, "services/shared-backend/src/email", name),
      resolve(email, name)
    );
  }
  await writeFile(
    resolve(root, "package.json"),
    JSON.stringify({ type: "module" })
  );
  await writeFile(
    resolve(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: true,
        baseUrl: ".",
        paths: { "@/*": ["src/*"] },
      },
    })
  );
  await writeFile(
    resolve(email, "render.ts"),
    `
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import Template from "./Template.vue";
export function render(): Promise<string> { return renderToString(createSSRApp(Template)); }
`
  );
  await writeFile(
    resolve(root, "src/shared/richTextHtml.ts"),
    `export { language as suffix } from "./languages.js";`
  );
  await writeFile(
    resolve(root, "src/shared/languages.ts"),
    `export { value as language } from "./shared.js";`
  );
  await writeFile(
    resolve(root, "src/shared/shared.ts"),
    `export const value = "shared-first";`
  );
  await writeFile(
    resolve(root, "src/index.ts"),
    `
import { render } from "./generated/email/render.js";
console.log("FIXTURE_EVENT " + JSON.stringify({ kind: "service", pid: process.pid, group: process.ppid, html: await render() }));
setInterval(() => {}, 1000);
`
  );
  // Hold real compiler startup when a test needs a deterministic cancellation window.
  await writeFile(
    resolve(root, "probe.mjs"),
    `
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
if (process.argv[1]?.endsWith("vue-tsc.js")) {
    console.log("FIXTURE_EVENT " + JSON.stringify({ kind: "compiler", pid: process.pid, group: process.pid }));
    while (existsSync("hold-compiler")) await delay(25);
}
`
  );
  async function template({ text, invalid = false }) {
    await writeFile(
      resolve(email, "Template.vue"),
      `
<script setup lang="ts">
import { suffix } from "@/shared/richTextHtml.js";
const text: string = ${invalid ? "42" : JSON.stringify(text)};
</script>
<template><p>{{ text }} {{ suffix }}</p></template>
`
    );
  }
  await template({ text: "vue-first" });
  function start(args = []) {
    const child = spawn(
      process.execPath,
      [resolve(email, "build.mjs"), ...args],
      {
        // Deliberately not the service root: build paths must be script-anchored.
        cwd: directory,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_OPTIONS: `--import=${resolve(root, "probe.mjs")}`,
          NO_COLOR: "1",
        },
      }
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const run = {
      child,
      closed: once(child, "close"),
      output: () => output,
      events: () =>
        Array.from(output.matchAll(/FIXTURE_EVENT (\{[^\n]+\})/gu), (match) =>
          JSON.parse(match[1])
        ),
    };
    runs.push(run);
    return run;
  }
  async function artifacts() {
    return await Promise.all(
      ["render.js", "render.js.map", "render.d.ts"].map(
        async (name) =>
          await readFile(resolve(root, "src/generated/email", name), "utf8")
      )
    );
  }
  async function assertStopped(run) {
    await waitFor(
      () => run.child.exitCode !== null || run.child.signalCode !== null
    );
    await run.closed;
    await waitFor(() =>
      run.events().every((event) => !alive(event.pid) && !alive(event.group))
    );
    assert.deepEqual(await readdir(resolve(root, ".email-build")), []);
  }
  return { root, email, start, template, artifacts, assertStopped };
}

test(
  "isolated concurrent builds preserve output paths and --copy-dist",
  { timeout: 60_000 },
  async (t) => {
    const f = await fixture(t);
    const runs = [f.start(), f.start()];
    for (const run of runs) {
      assert.deepEqual(await run.closed, [0, null], run.output());
    }
    const [runtime, map, declaration] = await f.artifacts();
    assert.match(runtime, /vue-first/u);
    assert.match(declaration, /render\(\): Promise<string>/u);
    assert.ok(
      JSON.parse(map).sources.every((source) => source.startsWith("/"))
    );
    const copy = f.start(["--copy-dist"]);
    assert.deepEqual(await copy.closed, [0, null], copy.output());
    assert.equal(
      await readFile(resolve(f.root, "dist/generated/email/render.js"), "utf8"),
      runtime
    );
    assert.equal(
      await readFile(
        resolve(f.root, "dist/generated/email/render.js.map"),
        "utf8"
      ),
      map
    );
    assert.deepEqual(await readdir(resolve(f.root, ".email-build")), []);
  }
);

test(
  "dev rebuilds dependencies, keeps checked output, recovers, and cancels dirty work",
  { timeout: 120_000 },
  async (t) => {
    const f = await fixture(t);
    const run = f.start(["--dev"]);
    async function rendered(text) {
      await waitFor(() =>
        run
          .events()
          .some(
            (event) => event.kind === "service" && event.html.includes(text)
          )
      );
    }
    await rendered("vue-first shared-first");
    await f.template({ text: "vue-second" });
    await rendered("vue-second shared-first");
    await writeFile(
      resolve(f.root, "src/shared/shared.ts"),
      `export const value = "shared-second";`
    );
    await rendered("vue-second shared-second");
    const checked = await f.artifacts();
    await f.template({ text: "broken", invalid: true });
    await waitFor(() =>
      run.output().includes("Email template typecheck failed")
    );
    assert.deepEqual(await f.artifacts(), checked);
    await f.template({ text: "recovered" });
    await rendered("recovered shared-second");
    const recovered = await f.artifacts();
    await writeFile(resolve(f.root, "hold-compiler"), "");
    const compilerCount = run
      .events()
      .filter((event) => event.kind === "compiler").length;
    await f.template({ text: "cancelled" });
    await waitFor(
      () =>
        run.events().filter((event) => event.kind === "compiler").length >
        compilerCount
    );
    await f.template({ text: "dirty-during-build" });
    await delay(400);
    run.child.kill("SIGTERM");
    await f.assertStopped(run);
    assert.equal(run.child.exitCode, 143, run.output());
    assert.deepEqual(await f.artifacts(), recovered);
    assert.equal(
      run.events().filter((event) => event.kind === "compiler").length,
      compilerCount + 1
    );
  }
);

for (const signal of ["SIGTERM", "SIGINT"]) {
  test(
    `${signal} cancels initial compilation without starting a service`,
    { timeout: 40_000 },
    async (t) => {
      const f = await fixture(t);
      await writeFile(resolve(f.root, "hold-compiler"), "");
      const run = f.start(["--dev"]);
      await waitFor(() =>
        run.events().some((event) => event.kind === "compiler")
      );
      run.child.kill(signal);
      await f.assertStopped(run);
      assert.equal(
        run.child.exitCode,
        signal === "SIGTERM" ? 143 : 130,
        run.output()
      );
      assert.ok(run.events().every((event) => event.kind !== "service"));
      assert.deepEqual(await readdir(resolve(f.root, "src")), [
        "index.ts",
        "shared",
        "shared-backend",
      ]);
    }
  );
}

test(
  "an unexpected tsx supervisor exit does not orphan its service",
  { timeout: 40_000 },
  async (t) => {
    const f = await fixture(t);
    const run = f.start(["--dev"]);
    await waitFor(() => run.events().some((event) => event.kind === "service"));
    const service = run.events().find((event) => event.kind === "service");
    assert.ok(service);
    process.kill(service.group, "SIGKILL");
    await f.assertStopped(run);
    assert.equal(run.child.exitCode, 1, run.output());
  }
);
