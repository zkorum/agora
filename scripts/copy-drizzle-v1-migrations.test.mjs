import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { copyV1Migrations } from "../services/api/scripts/copy_drizzle_v1_migrations.mjs";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function contents(directory) {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    result[entry.name] = entry.isDirectory()
      ? await contents(path)
      : entry.isSymbolicLink()
        ? "symlink"
        : await readFile(path, "utf8");
  }
  return result;
}

async function fixture(t) {
  const parent = resolve(tmpdir(), "opencode");
  await mkdir(parent, { recursive: true });
  const directory = await realpath(
    await mkdtemp(join(parent, "drizzle v1 copy-"))
  );
  t.after(async () => await rm(directory, { recursive: true, force: true }));
  const sourceDirectory = join(directory, "drizzle history");
  const flywayDirectory = join(directory, "Flyway history");
  await mkdir(sourceDirectory);
  await mkdir(flywayDirectory);
  const history = [
    ["20260101000000_first", "-- historical Drizzle first\n"],
    ["20260102000000_second", "-- historical Drizzle second\n"],
  ];
  const anchor = "-- deployed SQL intentionally corrected independently\n";
  const baseline = {
    lastDrizzleMigration: "20260102000000_second",
    historyCount: 2,
    historySha256: hash(
      JSON.stringify(history.map(([name, sql]) => [name, hash(sql)]))
    ),
    flywayAnchor: "V0114__second.sql",
    flywayAnchorSha256: hash(anchor),
  };
  async function add({ name, sql }) {
    const path = join(sourceDirectory, name);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, "migration.sql"), sql);
    await writeFile(join(path, "snapshot.json"), "{}\n");
  }
  for (const [name, sql] of history) await add({ name, sql });
  await writeFile(
    join(flywayDirectory, "V0001__first.sql"),
    "-- deployed first\n"
  );
  await writeFile(join(flywayDirectory, baseline.flywayAnchor), anchor);
  await writeFile(
    join(flywayDirectory, "V0114.2__backfill.sql"),
    "-- deployed backfill\n"
  );
  const options = { sourceDirectory, flywayDirectory, baseline };
  return { ...options, options, add };
}

test("skips pinned converted history even when deployed Flyway SQL differs", async (t) => {
  const f = await fixture(t);
  const before = await contents(f.flywayDirectory);
  assert.deepEqual(await copyV1Migrations(f.options), []);
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("copies new folders in stable order, preserves source, and reruns idempotently", async (t) => {
  const f = await fixture(t);
  await f.add({ name: "20261114000001_same_name", sql: "SELECT 2;\n" });
  await f.add({ name: "20261114000000_same_name", sql: "SELECT 1;\n" });
  const sourceBefore = await contents(f.sourceDirectory);
  const before = await contents(f.flywayDirectory);
  const copied = await copyV1Migrations(f.options);
  assert.deepEqual(
    copied.map(({ destination }) => destination),
    [
      join(f.flywayDirectory, "V0115__20261114000000_same_name.sql"),
      join(f.flywayDirectory, "V0116__20261114000001_same_name.sql"),
    ]
  );
  const expected = {
    ...before,
    "V0115__20261114000000_same_name.sql": "SELECT 1;\n",
    "V0116__20261114000001_same_name.sql": "SELECT 2;\n",
  };
  assert.deepEqual(await contents(f.flywayDirectory), expected);
  assert.deepEqual(await copyV1Migrations(f.options), []);
  assert.deepEqual(await contents(f.flywayDirectory), expected);
  assert.deepEqual(await contents(f.sourceDirectory), sourceBefore);
});

test("dry-run validates and reports copies without writing SQL", async (t) => {
  const f = await fixture(t);
  await f.add({ name: "20261114000000_new", sql: "SELECT 1;\n" });
  const before = await contents(f.flywayDirectory);
  assert.equal(
    (await copyV1Migrations({ ...f.options, dryRun: true })).length,
    1
  );
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

for (const mode of ["changed", "missing", "additional"]) {
  test(`rejects ${mode} converted history before copying new SQL`, async (t) => {
    const f = await fixture(t);
    await f.add({ name: "20261114000000_new", sql: "SELECT 1;\n" });
    const path = join(
      f.sourceDirectory,
      "20260101000000_first",
      "migration.sql"
    );
    if (mode === "changed") await writeFile(path, "-- changed history\n");
    if (mode === "missing")
      await rm(join(f.sourceDirectory, "20260101000000_first"), {
        recursive: true,
      });
    if (mode === "additional")
      await f.add({
        name: "20260101000001_extra",
        sql: "-- unexpected legacy SQL\n",
      });
    const before = await contents(f.flywayDirectory);
    await assert.rejects(copyV1Migrations(f.options), /pinned Flyway baseline/);
    assert.deepEqual(await contents(f.flywayDirectory), before);
  });
}

test("refuses a changed Flyway baseline", async (t) => {
  const f = await fixture(t);
  await writeFile(
    join(f.flywayDirectory, f.baseline.flywayAnchor),
    "-- changed deployed SQL\n"
  );
  const before = await contents(f.flywayDirectory);
  await assert.rejects(
    copyV1Migrations(f.options),
    /baseline migration changed/
  );
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("refuses to overwrite or duplicate a modified copy", async (t) => {
  const f = await fixture(t);
  await f.add({ name: "20261114000000_new", sql: "SELECT 1;\n" });
  await copyV1Migrations(f.options);
  await writeFile(
    join(f.flywayDirectory, "V0115__20261114000000_new.sql"),
    "-- manually reviewed adjustment\n"
  );
  const before = await contents(f.flywayDirectory);
  await assert.rejects(
    copyV1Migrations(f.options),
    /refusing to overwrite or duplicate/
  );
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("rejects duplicate Flyway copies for one Drizzle folder", async (t) => {
  const f = await fixture(t);
  await f.add({ name: "20261114000000_new", sql: "SELECT 1;\n" });
  await copyV1Migrations(f.options);
  await writeFile(
    join(f.flywayDirectory, "V0116__20261114000000_new.sql"),
    "SELECT 1;\n"
  );
  const before = await contents(f.flywayDirectory);
  await assert.rejects(copyV1Migrations(f.options), /Multiple Flyway copies/);
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("refuses version exhaustion before writing any pending migration", async (t) => {
  const f = await fixture(t);
  await f.add({ name: "20261114000000_first", sql: "SELECT 1;\n" });
  await f.add({ name: "20261114000001_second", sql: "SELECT 2;\n" });
  await writeFile(
    join(f.flywayDirectory, "V9998.1__last.sql"),
    "-- existing\n"
  );
  const before = await contents(f.flywayDirectory);
  await assert.rejects(
    copyV1Migrations(f.options),
    /No four-digit Flyway version/
  );
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("does not remove another process's lock", async (t) => {
  const f = await fixture(t);
  const lock = join(f.flywayDirectory, ".drizzle-copy.lock");
  await mkdir(lock);
  await writeFile(join(lock, "owner"), "other process");
  const before = await contents(f.flywayDirectory);
  await assert.rejects(copyV1Migrations(f.options), { code: "EEXIST" });
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("rejects source SQL symlinks instead of following them", async (t) => {
  const f = await fixture(t);
  const name = "20261114000000_new";
  await f.add({ name, sql: "SELECT 1;\n" });
  const path = join(f.sourceDirectory, name, "migration.sql");
  await unlink(path);
  await symlink(
    join(f.sourceDirectory, "20260101000000_first", "migration.sql"),
    path
  );
  const before = await contents(f.flywayDirectory);
  await assert.rejects(copyV1Migrations(f.options), /regular file/);
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("rejects directories or symlinks named like Flyway migrations", async (t) => {
  const f = await fixture(t);
  await f.add({ name: "20261114000000_new", sql: "SELECT 1;\n" });
  await mkdir(join(f.flywayDirectory, "V0115__collision.sql"));
  const before = await contents(f.flywayDirectory);
  await assert.rejects(copyV1Migrations(f.options), /regular file/);
  assert.deepEqual(await contents(f.flywayDirectory), before);
});

test("rejects using the source directory as the Flyway destination", async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    copyV1Migrations({ ...f.options, flywayDirectory: f.sourceDirectory }),
    /must differ/
  );
});

test("recognizes a reviewed fractional deployment without copying the original draft again", async (t) => {
  const f = await fixture(t);
  const source = "20261114000000_new";
  await f.add({ name: source, sql: "-- unsplit generated SQL\n" });
  const files = [
    { name: `V0115__${source}.sql`, sql: "-- expand\n" },
    { name: "V0115.1__backfill.sql", sql: "-- approved data\n" },
    { name: "V0115.1__backfill.sql.conf", sql: "executeInTransaction=false\n" },
  ];
  for (const file of files)
    await writeFile(join(f.flywayDirectory, file.name), file.sql);
  const reviewed = [
    {
      source,
      sourceSha256: hash("-- unsplit generated SQL\n"),
      files: files.map(({ name, sql }) => ({ name, sha256: hash(sql) })),
    },
  ];
  const before = await contents(f.flywayDirectory);
  assert.deepEqual(await copyV1Migrations({ ...f.options, reviewed }), []);
  assert.deepEqual(await contents(f.flywayDirectory), before);
  await writeFile(
    join(f.flywayDirectory, "V0115.1__backfill.sql.conf"),
    "executeInTransaction=true\n"
  );
  await assert.rejects(
    copyV1Migrations({ ...f.options, reviewed }),
    /Reviewed Flyway phase changed/
  );
  await writeFile(
    join(f.flywayDirectory, "V0115.1__backfill.sql.conf"),
    "executeInTransaction=false\n"
  );
  await writeFile(
    join(f.flywayDirectory, "V0115.1__backfill.sql"),
    "-- unreviewed change\n"
  );
  await assert.rejects(
    copyV1Migrations({ ...f.options, reviewed }),
    /Reviewed Flyway phase changed/
  );
  await writeFile(
    join(f.sourceDirectory, source, "migration.sql"),
    "-- regenerated source\n"
  );
  await assert.rejects(
    copyV1Migrations({ ...f.options, reviewed }),
    /Reviewed Drizzle source changed/
  );
});
