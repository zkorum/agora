// Run with node --test scripts/rename-sql-migration.test.mjs. No database tooling.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

const temporaryDirectory = resolve(tmpdir(), "opencode");
const script = resolve(
  import.meta.dirname,
  "../services/api/scripts/rename_sql_migration_file.sh"
);

async function contents(directory) {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    result[entry.name] = entry.isDirectory()
      ? await contents(path)
      : await readFile(path, "utf8");
  }
  return result;
}

async function fixture(t) {
  await mkdir(temporaryDirectory, { recursive: true });
  const directory = await mkdtemp(
    resolve(temporaryDirectory, "rename sql migration-")
  );
  t.after(async () => await rm(directory, { recursive: true, force: true }));
  const service = resolve(directory, "fixture service");
  const source = resolve(service, "drizzle");
  const flyway = resolve(service, "database/flyway");
  const bin = resolve(directory, "stub commands");
  for (const path of [source, flyway, bin, resolve(service, "scripts")]) {
    await mkdir(path, { recursive: true });
  }
  const copiedScript = resolve(service, "scripts/rename_sql_migration_file.sh");
  await copyFile(script, copiedScript);

  const stub = resolve(bin, "command.mjs");
  await writeFile(
    stub,
    `
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const [command, ...args] = process.argv.slice(2);
if (process.env.FAIL_COMMAND === command) {
    console.error(command + " failed synthetically");
    process.exit(73);
}
if (command === "rsync") {
    const source = args.at(-2);
    const destination = args.at(-1);
    const include = args[args.indexOf("--include") + 1];
    assert.ok(args.includes('--exclude=*'));
    assert.ok(["*.sql", "[0-9][0-9][0-9][0-9]_*.sql"].includes(include));
    const pattern = include === "*.sql" ? /\\.sql$/ : /^[0-9]{4}_.*\\.sql$/;
    // Deliberately reverse copy order: processing order must come from the script.
    for (const entry of readdirSync(source, { withFileTypes: true }).reverse()) {
        if (entry.isFile() && pattern.test(entry.name)) {
            copyFileSync(resolve(source, entry.name), resolve(destination, entry.name));
        }
    }
} else if (command === "mv") {
    if (process.env.MV_COLLISION === "1") {
        writeFileSync(args.at(-1), "-- concurrent Flyway migration\\n");
    }
    const result = spawnSync("/bin/mv", args, { stdio: "inherit" });
    if (result.error) throw result.error;
    process.exit(result.status ?? 1);
} else {
    throw new Error("Unexpected stub command: " + command);
}
`
  );
  for (const command of ["rsync", "mv"]) {
    const path = resolve(bin, command);
    await writeFile(
      path,
      `#!/bin/bash\nexec "$TEST_NODE" "$TEST_COMMAND_STUB" ${command} "$@"\n`
    );
    await chmod(path, 0o755);
  }

  async function seed({ drizzle = {}, migrations = {} }) {
    for (const [root, files] of [
      [source, drizzle],
      [flyway, migrations],
    ]) {
      for (const [name, sql] of Object.entries(files)) {
        const path = resolve(root, name);
        await mkdir(resolve(path, ".."), { recursive: true });
        await writeFile(path, sql);
      }
    }
  }

  async function run({ cwd = service, args = ["drizzle/"], env = {} } = {}) {
    const sourceBefore = await contents(source);
    const result = spawnSync("/bin/bash", [copiedScript, ...args], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        TEST_NODE: process.execPath,
        TEST_COMMAND_STUB: stub,
        FAIL_COMMAND: "",
        MV_COLLISION: "",
        ...env,
      },
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.deepEqual(
      await contents(source),
      sourceBefore,
      "Drizzle source changed"
    );
    return result;
  }

  return { directory, service, source, flyway, seed, run };
}

function succeeded(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("allocates distinct increasing versions in stable order and is idempotent", async (t) => {
  const f = await fixture(t);
  const historical = {
    "V0000__origin.sql": "-- original zero\n",
    "V0086__historical.sql": "-- immutable deployed SQL\n",
    "V0086.1__backfill.sql": "-- immutable backfill\n",
  };
  await f.seed({
    drizzle: {
      "0000_origin.sql": "-- historical source may differ\n",
      "0002_historical.sql": "-- renumbered historical source\n",
      "0005_zebra.sql": "SELECT 5;\n",
      "0003_alpha.sql": "SELECT 3;\n",
      "0004_beta.sql": "SELECT 4;\n",
      "0095_jump.sql": "SELECT 95;\n",
      "0096_after_jump.sql": "SELECT 96;\n",
      "V0086__historical.sql": "-- must never be copied\n",
      "meta/_journal.json": "{}\n",
      "nested/0999_ignored.sql": "-- not a root migration\n",
    },
    migrations: historical,
  });
  const result = await f.run();
  succeeded(result);
  assert.equal(result.stdout.match(/Renamed /g)?.length, 5);
  const expected = {
    ...historical,
    "V0087__alpha.sql": "SELECT 3;\n",
    "V0088__beta.sql": "SELECT 4;\n",
    "V0089__zebra.sql": "SELECT 5;\n",
    "V0095__jump.sql": "SELECT 95;\n",
    "V0096__after_jump.sql": "SELECT 96;\n",
  };
  assert.deepEqual(await contents(f.flyway), expected);
  const repeated = await f.run();
  succeeded(repeated);
  assert.doesNotMatch(repeated.stdout, /Renamed /);
  assert.deepEqual(await contents(f.flyway), expected);
});

test("matches literal complete descriptions only among actual Flyway names", async (t) => {
  const f = await fixture(t);
  const historical = {
    "V0020__prefix_cat_suffix.sql": "-- unrelated substring\n",
    "V0021__axb.sql": "-- unrelated regex match\n",
    "V0022__literal[ab].sql": "-- exact literal historical match\n",
    "notes__plain.sql": "-- unversioned SQL\n",
    "V0023__directory.sql/keep.txt": "not a migration",
  };
  await f.seed({
    drizzle: {
      "0001_cat.sql": "SELECT 1;\n",
      "0002_a.b.sql": "SELECT 2;\n",
      "0003_literal[ab].sql": "-- source is retained\n",
      "0004_plain.sql": "SELECT 4;\n",
      "0005_directory.sql": "SELECT 5;\n",
      "0006_cat_suffix.sql": "SELECT 6;\n",
    },
    migrations: historical,
  });
  succeeded(await f.run());
  assert.deepEqual(await contents(f.flyway), {
    "V0020__prefix_cat_suffix.sql": historical["V0020__prefix_cat_suffix.sql"],
    "V0021__axb.sql": historical["V0021__axb.sql"],
    "V0022__literal[ab].sql": historical["V0022__literal[ab].sql"],
    "notes__plain.sql": historical["notes__plain.sql"],
    "V0023__directory.sql": { "keep.txt": "not a migration" },
    "V0023__cat.sql": "SELECT 1;\n",
    "V0024__a.b.sql": "SELECT 2;\n",
    "V0025__plain.sql": "SELECT 4;\n",
    "V0026__directory.sql": "SELECT 5;\n",
    "V0027__cat_suffix.sql": "SELECT 6;\n",
  });
});

test("does not skip a newer index reusing an older random description", async (t) => {
  const f = await fixture(t);
  await f.seed({
    drizzle: {
      "0003_same_name.sql": "-- first pending\n",
      "0004_same_name.sql": "-- second pending\n",
    },
    migrations: {
      "V0002__same_name.sql": "-- old migration\n",
      "V0086__latest.sql": "-- latest\n",
    },
  });
  succeeded(await f.run());
  const expected = {
    "V0002__same_name.sql": "-- old migration\n",
    "V0086__latest.sql": "-- latest\n",
    "V0087__same_name.sql": "-- first pending\n",
    "V0088__same_name.sql": "-- second pending\n",
  };
  assert.deepEqual(await contents(f.flyway), expected);
  succeeded(await f.run());
  assert.deepEqual(await contents(f.flyway), expected);
});

for (const scenario of [
  {
    name: "one renumbered historical file cannot hide a newer same-description source",
    drizzle: {
      "0088_same.sql": "-- new SQL\n",
      "0087_same.sql": "-- historical source\n",
    },
    migrations: { "V0089__same.sql": "-- immutable historical copy\n" },
    added: { "V0090__same.sql": "-- new SQL\n" },
  },
  {
    name: "each duplicate historical description, including fractions, is consumed only once",
    drizzle: {
      "0089_same.sql": "-- new SQL\n",
      "0088_same.sql": "-- third historical source\n",
      "0087_same.sql": "-- second historical source\n",
      "0086_same.sql": "-- first historical source\n",
    },
    migrations: {
      "V0089__same.sql": "-- immutable main version\n",
      "V0089.2__same.sql": "-- immutable fraction two\n",
      "V0089.10__same.sql": "-- immutable fraction ten\n",
    },
    added: { "V0090__same.sql": "-- new SQL\n" },
  },
  {
    name: "matching consumes lower major versions before higher fractional versions",
    drizzle: {
      "0091_same.sql": "-- new SQL\n",
      "0090_same.sql": "-- later historical source\n",
      "0087_same.sql": "-- earlier historical source\n",
    },
    migrations: {
      "V0090.1__same.sql": "-- immutable later copy\n",
      "V0089__same.sql": "-- immutable earlier copy\n",
    },
    added: { "V0091__same.sql": "-- new SQL\n" },
  },
]) {
  test(`${scenario.name}; reruns are idempotent`, async (t) => {
    const f = await fixture(t);
    await f.seed(scenario);
    const first = await f.run();
    succeeded(first);
    assert.equal(first.stdout.match(/Renamed /g)?.length, 1);
    const expected = { ...scenario.migrations, ...scenario.added };
    assert.deepEqual(await contents(f.flyway), expected);
    for (let repeat = 0; repeat < 2; repeat++) {
      const result = await f.run();
      succeeded(result);
      assert.doesNotMatch(result.stdout, /Renamed /);
      assert.deepEqual(await contents(f.flyway), expected);
    }
  });
}

test("preserves the exact sturdy_serpent_society tool-upgrade exception", async (t) => {
  const f = await fixture(t);
  await f.seed({
    drizzle: {
      "0000_sturdy_serpent_society.sql": "-- tool-upgrade baseline\n",
      "0001_sturdy_serpent_society_extra.sql": "SELECT 1;\n",
    },
  });
  succeeded(await f.run());
  assert.deepEqual(await contents(f.flyway), {
    "V0001__sturdy_serpent_society_extra.sql": "SELECT 1;\n",
  });
  succeeded(await f.run());
  assert.deepEqual(await contents(f.flyway), {
    "V0001__sturdy_serpent_society_extra.sql": "SELECT 1;\n",
  });
});

test("counts fractional major versions and ignores invalid prefixes and nested SQL", async (t) => {
  const f = await fixture(t);
  const ignored = {
    "prefixV9999__ignored.sql": "-- anchored prefix required\n",
    "V999__ignored.sql": "-- four digits required\n",
    "V99999__ignored.sql": "-- only four digits\n",
    "V9999x1__ignored.sql": "-- literal decimal point required\n",
    "V9999.1.2__ignored.sql": "-- only one fraction\n",
    "V9999_ignored.sql": "-- double underscore required\n",
    "V9999__ignored.sql.bak": "-- SQL extension required\n",
    "plain.sql": "-- no version\n",
    archive: { "V9999__ignored.sql": "-- root files only\n" },
  };
  const { archive, ...rootFiles } = ignored;
  await f.seed({
    drizzle: {
      "0007_fraction_match.sql": "-- historical fractional match\n",
      "0008_pending.sql": "SELECT 8;\n",
      "0087_fraction_match.sql": "SELECT 87;\n",
      "008_fraction_match.sql": "-- invalid source index\n",
      "00008_fraction_match.sql": "-- invalid source index\n",
    },
    migrations: {
      ...rootFiles,
      "archive/V9999__ignored.sql": archive["V9999__ignored.sql"],
      "V0086.1__fraction_match.sql": "-- highest valid major\n",
      "V0009__lower.sql": "-- lower version sorted later\n",
    },
  });
  succeeded(await f.run());
  assert.deepEqual(await contents(f.flyway), {
    ...ignored,
    "V0086.1__fraction_match.sql": "-- highest valid major\n",
    "V0009__lower.sql": "-- lower version sorted later\n",
    "V0087__pending.sql": "SELECT 8;\n",
    "V0088__fraction_match.sql": "SELECT 87;\n",
  });
});

test("supports empty Flyway directories and paths with spaces outside service cwd", async (t) => {
  const f = await fixture(t);
  succeeded(await f.run());
  await f.seed({ drizzle: { "0008_two words.sql": "SELECT 8;\n" } });
  succeeded(await f.run({ cwd: f.directory, args: [f.source] }));
  assert.deepEqual(await contents(f.flyway), {
    "V0008__two words.sql": "SELECT 8;\n",
  });
});

test("falls back to a numeric maximum when only unversioned SQL exists", async (t) => {
  const f = await fixture(t);
  await f.seed({
    drizzle: { "0008_pending.sql": "SELECT 8;\n" },
    migrations: { "plain.sql": "-- not a version\n" },
  });
  succeeded(await f.run());
  assert.deepEqual(await contents(f.flyway), {
    "plain.sql": "-- not a version\n",
    "V0008__pending.sql": "SELECT 8;\n",
  });
});

for (const command of ["rsync", "mv"]) {
  test(`${command} failure exits nonzero without claiming a rename; retry is safe`, async (t) => {
    const f = await fixture(t);
    await f.seed({
      drizzle: { "0001_pending.sql": "SELECT 1;\n" },
      migrations: { "V0086__existing.sql": "-- immutable\n" },
    });
    const result = await f.run({ env: { FAIL_COMMAND: command } });
    assert.equal(result.status, 73);
    assert.match(result.stderr, new RegExp(`${command} failed synthetically`));
    assert.doesNotMatch(result.stdout, /Renamed /);
    assert.deepEqual(await contents(f.flyway), {
      "V0086__existing.sql": "-- immutable\n",
      ...(command === "mv" ? { "0001_pending.sql": "SELECT 1;\n" } : {}),
    });
    succeeded(await f.run());
    assert.deepEqual(await contents(f.flyway), {
      "V0086__existing.sql": "-- immutable\n",
      "V0087__pending.sql": "SELECT 1;\n",
    });
  });
}

test("never overwrites a destination appearing before mv, even when mv -n exits zero", async (t) => {
  const f = await fixture(t);
  await f.seed({ drizzle: { "0008_pending.sql": "SELECT 8;\n" } });
  const result = await f.run({ env: { MV_COLLISION: "1" } });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /Renamed /);
  assert.deepEqual(await contents(f.flyway), {
    "0008_pending.sql": "SELECT 8;\n",
    "V0008__pending.sql": "-- concurrent Flyway migration\n",
  });
});

test("refuses to allocate beyond the four-digit main-version contract", async (t) => {
  const f = await fixture(t);
  await f.seed({
    drizzle: { "0001_pending.sql": "SELECT 1;\n" },
    migrations: { "V9999.1__last.sql": "-- immutable\n" },
  });
  const result = await f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No four-digit Flyway version/);
  assert.doesNotMatch(result.stdout, /Renamed /);
  assert.deepEqual(await contents(f.flyway), {
    "0001_pending.sql": "SELECT 1;\n",
    "V9999.1__last.sql": "-- immutable\n",
  });
});

test("does not move pending SQL into a directory named like its destination", async (t) => {
  const f = await fixture(t);
  await f.seed({
    drizzle: { "0008_pending.sql": "SELECT 8;\n" },
    migrations: { "V0008__pending.sql/keep.txt": "untouched" },
  });
  const result = await f.run();
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /Renamed /);
  assert.deepEqual(await contents(f.flyway), {
    "0008_pending.sql": "SELECT 8;\n",
    "V0008__pending.sql": { "keep.txt": "untouched" },
  });
});

test("rejects missing sources and using Flyway itself as the source", async (t) => {
  const f = await fixture(t);
  await f.seed({
    migrations: { "0001_pending.sql": "-- do not delete source\n" },
  });
  for (const args of [[], ["missing directory"], [f.flyway]]) {
    const result = await f.run({ args });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /Renamed /);
  }
  assert.deepEqual(await contents(f.flyway), {
    "0001_pending.sql": "-- do not delete source\n",
  });
});
