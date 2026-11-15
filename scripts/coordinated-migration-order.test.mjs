import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildCoordinatedMigrations } from "../services/api/scripts/stage_coordinated_migration.mjs";
import { reviewedMigrations } from "../services/api/scripts/reviewed_drizzle_migrations.mjs";

const serviceDirectory = fileURLToPath(
  new URL("../services/api/", import.meta.url)
);
const plan = await buildCoordinatedMigrations({ serviceDirectory });
function sql(version) {
  const item = plan.phases.find(({ name }) => name.startsWith(`${version}__`));
  assert.ok(item, `Missing ${version}`);
  return item.sql;
}

test("checked-in fractional phases match the prepared sources and ordered plan", async () => {
  assert.equal(plan.phases.length, 15);
  assert.deepEqual(
    plan.phases.map(({ name }) => name.split("__")[0]),
    [
      "V0115",
      "V0115.0.1",
      "V0115.1",
      "V0115.2",
      "V0115.3",
      "V0115.4",
      "V0115.5",
      "V0115.6",
      "V0115.7",
      "V0115.8",
      "V0115.9",
      "V0115.10",
      "V0115.11",
      "V0115.12",
      "V0115.13",
    ]
  );
  for (const item of plan.artifacts) {
    assert.equal(
      await readFile(
        new URL(
          `../services/api/database/flyway/${item.name}`,
          import.meta.url
        ),
        "utf8"
      ),
      item.sql
    );
  }
  const deployment = reviewedMigrations.find(
    ({ source }) => source === plan.source
  );
  assert.equal(deployment?.sourceSha256, plan.sourceSha256);
  assert.deepEqual(
    deployment?.files,
    plan.artifacts.map(({ name, sql }) => ({
      name,
      sha256: createHash("sha256").update(sql).digest("hex"),
    }))
  );
});

test("data prerequisites precede role requirements and vote ownership constraints", () => {
  const base = sql("V0115");
  assert.match(base, /ADD COLUMN "role" "organization_role";/);
  assert.doesNotMatch(base, /"role" "organization_role" NOT NULL/);
  assert.doesNotMatch(
    base,
    /ADD CONSTRAINT "(vote_current_content_owner_fk|vote_participant_account_fk)"/
  );
  assert.match(sql("V0115.2"), /SET role = 'admin'\s+WHERE \(role IS NULL\)/);
  assert.match(sql("V0115.4"), /INSERT INTO vote_content/);
  assert.match(sql("V0115.13"), /ALTER COLUMN role SET NOT NULL/);
  assert.match(
    sql("V0115.11"),
    /ADD CONSTRAINT "vote_current_content_owner_fk"/
  );
});

test("cutover does not cast old enum labels or run serializer-only timestamp alterations", () => {
  const base = sql("V0115");
  assert.match(
    base,
    /ALTER TYPE "conversation_type" RENAME VALUE 'ranking' TO 'prioritizing'/
  );
  assert.doesNotMatch(base, /DROP TYPE "conversation_type"/);
  assert.doesNotMatch(base, /SET DATA TYPE timestamp/);
  const functions = sql("V0115.1");
  assert.doesNotMatch(functions, /\bmaxdiff_result(?:_id)?\b|'ranking'/);
  for (const name of [
    "dirty",
    "dirty_from_inserted_comparisons",
    "dirty_from_updated_comparisons",
    "dirty_from_deleted_comparisons",
    "dirty_from_deleted_user",
  ]) {
    assert.match(
      functions,
      new RegExp(
        `CREATE OR REPLACE FUNCTION mark_ranking_scoring_input_${name}\\(`
      )
    );
  }
});

test("frozen evidence and legacy context are not fabricated or silently discarded", () => {
  const data = [2, 3, 4, 5, 6, 7]
    .map((index) => sql(`V0115.${index}`))
    .join("\n");
  assert.doesNotMatch(
    data,
    /(?:UPDATE|INSERT INTO|DELETE FROM)\s+(?:ranking_input_|ranking_conversation_stats_|analysis_input_snapshot|analysis_snapshot_result)/i
  );
  const contract = sql("V0115.11");
  assert.ok(
    contract.indexOf("Legacy group context requires classification") <
      contract.indexOf('DROP COLUMN "group_sources_snapshot"')
  );
  assert.match(
    sql("V0115.12"),
    /Reconcile active organizations without an active Admin/
  );
});

test("large-table builds and keyset backfills have the required nontransactional sidecars", () => {
  assert.match(sql("V0115.0.1"), /CREATE (?:UNIQUE )?INDEX CONCURRENTLY/);
  assert.doesNotMatch(sql("V0115.0.1"), /IF NOT EXISTS/);
  for (const version of [
    "V0115.0.1",
    "V0115.2",
    "V0115.3",
    "V0115.4",
    "V0115.5",
    "V0115.6",
    "V0115.7",
  ]) {
    const item = plan.phases.find(({ name }) =>
      name.startsWith(`${version}__`)
    );
    assert.ok(item);
    assert.equal(item.transactional, false);
    assert.equal(
      plan.artifacts.find(({ name }) => name === `${item.name}.conf`)?.sql,
      "executeInTransaction=false\n"
    );
    if (version !== "V0115.0.1") {
      assert.match(item.sql, /mb_high_water/);
      assert.match(item.sql, /ORDER BY id LIMIT mb_size/);
      assert.doesNotMatch(item.sql, /mb_cursor IS NULL OR/);
      assert.match(item.sql, /COMMIT;/);
      assert.match(item.sql, /DROP PROCEDURE/);
    }
  }
  assert.match(sql("V0115.11"), /NOT VALID/);
  assert.doesNotMatch(sql("V0115.11"), /VALIDATE CONSTRAINT/);
  assert.match(
    sql("V0115.13"),
    /VALIDATE CONSTRAINT "vote_current_content_owner_fk"/
  );
});

test("only new empty-table indexes remain synchronous; changed unique indexes build before replacement", () => {
  assert.equal(
    [...sql("V0115").matchAll(/CREATE (?:UNIQUE )?INDEX /g)].length,
    12
  );
  assert.equal(
    [...sql("V0115.0.1").matchAll(/CREATE (?:UNIQUE )?INDEX CONCURRENTLY /g)]
      .length,
    19
  );
  for (const name of [
    "phone_hash_active_unique",
    "zk_passport_nullifier_active_unique",
    "email_active_unique",
    "realtime_event_outbox_conversation_replay_idx",
  ]) {
    const indexSql = sql("V0115.0.1");
    const created = indexSql.indexOf(`INDEX CONCURRENTLY "${name}__v0115"`);
    const dropped = indexSql.indexOf(`DROP INDEX CONCURRENTLY "${name}"`);
    const renamed = indexSql.indexOf(`ALTER INDEX "${name}__v0115" RENAME`);
    assert.ok(created >= 0 && created < dropped && dropped < renamed);
  }
});
