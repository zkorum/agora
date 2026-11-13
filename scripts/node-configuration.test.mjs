import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Minimum patched releases from the November 2026 Node.js security advisory.
const expectedVersion = "26.13.1";
const expectedEngines = "^26.13.1";
const root = new URL("../", import.meta.url);

test("local and Netlify Node pins match the patched runtime", async () => {
  const nvmrc = await readFile(new URL(".nvmrc", root), "utf8");
  assert.equal(nvmrc.trim(), expectedVersion);

  const netlify = await readFile(
    new URL("services/app/netlify.toml", root),
    "utf8"
  );
  const [, version] = netlify.match(/^NODE_VERSION = "([^"]+)"$/m) ?? [];
  assert.equal(version, expectedVersion);
});

for (const service of [
  "agora",
  "api",
  "app",
  "conversation-email-update-worker",
]) {
  test(`${service}: supported Node releases require security patches`, async () => {
    const manifest = JSON.parse(
      await readFile(new URL(`services/${service}/package.json`, root), "utf8")
    );
    assert.equal(manifest.engines.node, expectedEngines);
  });
}

for (const file of [
  "services/agora/Dockerfile.production",
  "services/agora/Dockerfile.staging",
  "services/api/Dockerfile",
  "services/conversation-email-update-worker/Dockerfile",
]) {
  test(`${file}: every Node stage uses the patched runtime`, async () => {
    const dockerfile = await readFile(new URL(file, root), "utf8");
    const stages = [...dockerfile.matchAll(/^FROM .*?node:([^\s]+).*$/gm)];
    assert.ok(stages.length > 0, "expected at least one Node base image");
    for (const [, tag] of stages) {
      assert.ok(tag.startsWith(`${expectedVersion}-`), tag);
    }
  });
}
