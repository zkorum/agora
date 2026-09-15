import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const expectedPackageManager = "pnpm@12.4.1";
const servicesDirectory = new URL("../services/", import.meta.url);

for (const entry of await readdir(servicesDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const serviceDirectory = new URL(`${entry.name}/`, servicesDirectory);
  const files = await readdir(serviceDirectory);
  if (!files.includes("package.json")) continue;

  test(`${entry.name}: consistent pnpm version and supported configuration`, async () => {
    const manifest = JSON.parse(
      await readFile(new URL("package.json", serviceDirectory), "utf8")
    );
    assert.equal(manifest.packageManager, expectedPackageManager);
    assert.equal(
      Object.hasOwn(manifest, "pnpm"),
      false,
      "pnpm 12 ignores package.json pnpm settings"
    );
    assert.equal(
      Object.hasOwn(manifest.dependencies ?? {}, "pnpm"),
      false,
      "a runtime pnpm dependency shadows the pinned toolchain in scripts"
    );
    const workspace = await readFile(
      new URL("pnpm-workspace.yaml", serviceDirectory),
      "utf8"
    );
    assert.doesNotMatch(
      workspace,
      /^(?:ignoredBuiltDependencies|onlyBuiltDependencies):/m
    );
    assert.doesNotMatch(workspace, /set this to true or false/);
    assert.match(workspace, /^minimumReleaseAge: 7200$/m);

    for (const file of files.filter((name) => name.startsWith("Dockerfile"))) {
      const dockerfile = await readFile(
        new URL(file, serviceDirectory),
        "utf8"
      );
      const versions = [
        ...dockerfile.matchAll(/corepack prepare (pnpm@\S+) --activate/g),
      ];
      assert.ok(versions.length > 0, `${file} must pin pnpm`);
      for (const [, version] of versions)
        assert.equal(version, expectedPackageManager, file);
      assert.doesNotMatch(dockerfile, /pnpm-workspace-docker\.yaml/);
      assert.match(dockerfile, /COPY .*pnpm-workspace\.yaml/);
    }
    assert.equal(
      files.includes("pnpm-workspace-docker.yaml"),
      false,
      "Docker and local installs must use the same workspace settings"
    );
    if (files.includes(".dockerignore")) {
      const ignored = await readFile(
        new URL(".dockerignore", serviceDirectory),
        "utf8"
      );
      assert.doesNotMatch(
        ignored,
        /^\/?pnpm-workspace\.yaml\s*$/m,
        "Docker must receive the canonical workspace configuration"
      );
    }
  });
}
