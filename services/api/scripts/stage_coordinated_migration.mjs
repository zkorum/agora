// @ts-check
import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewedMigrations } from "./reviewed_drizzle_migrations.mjs";
import {
    equivalentIndexRebuilds,
    equivalentCheckReplacements,
} from "./coordinated_migration_noops.mjs";
import {
    boundedUpdates,
    boundedOwnership,
    boundedReplay,
    boundedLiveRefresh,
} from "./coordinated_migration_batches.mjs";

export const source = "20261122091916_coordinated_activity_upgrade";
const sourceSha256 =
    "617ef45581d199f65981fc75cc998a6c1789f06f3d8d50968089450997f605ba";
const baseName = `V0116__${source}.sql`;
const delimiter = "--> statement-breakpoint";
const legacyContextGuard = `DO $$
BEGIN
    IF EXISTS (SELECT FROM ranking_score WHERE group_sources_snapshot IS NOT NULL
               AND group_sources_snapshot <> 'null'::jsonb) THEN
        RAISE EXCEPTION 'Legacy group context requires classification before its column can be removed';
    END IF;
END;
$$;`;

/** @param {string} value */
function hash(value) {
    return createHash("sha256").update(value).digest("hex");
}

/** @param {string} sql */
function body(sql) {
    return sql.replace(/^(?:\s*--[^\n]*(?:\n|$)|\s*\n)*/, "").trim();
}

/** @param {{ name: string, sql: string, transactional?: boolean }} phase */
function phase({ name, sql, transactional = true }) {
    return {
        name,
        transactional,
        sql:
            "-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.\n" +
            "-- Do not resume affected writers between these versioned phases.\n" +
            "-- Staged from the generated draft/prepared contracts; no database is changed by staging.\n\n" +
            (transactional
                ? "SET LOCAL lock_timeout = '5s';\nSET LOCAL TIME ZONE 'UTC';\n\n"
                : "SET lock_timeout = '5s';\nSET TIME ZONE 'UTC';\nSET search_path = public, pg_temp;\n--> statement-breakpoint\n") +
            sql.trim() +
            (transactional
                ? "\n"
                : "\n--> statement-breakpoint\nRESET lock_timeout;\nRESET search_path;\nRESET TIME ZONE;\n"),
    };
}

/** @param {{ serviceDirectory: string }} options */
export async function buildCoordinatedMigrations({ serviceDirectory }) {
    const draft = await readFile(
        join(serviceDirectory, "drizzle", source, "migration.sql"),
        "utf8",
    );
    if (hash(draft) !== sourceSha256)
        throw new Error(
            "The generated draft changed; review the deployment split again.",
        );
    /** @type {string[]} */
    const expand = [];
    /** @type {string[]} */
    const constraints = [];
    /** @type {string[]} */
    const validations = [];
    /** @type {string[]} */
    const onlineIndexes = [];
    /** @type {Set<string>} */
    const indexDrops = new Set();
    const newTables = new Set(
        [...draft.matchAll(/CREATE TABLE "(\w+)"/g)].map((match) => match[1]),
    );
    let omittedIndexOperations = 0;
    let omittedChecks = 0;
    let concurrentBuilds = 0;
    let timestampNoops = 0;
    let enumOperations = 0;
    let roleColumns = 0;
    let legacyDrops = 0;
    for (const original of draft
        .split(delimiter)
        .map((sql) => sql.trim())
        .filter(Boolean)) {
        let sql = original;
        const dropIndex = /^DROP INDEX "(\w+)";$/.exec(sql)?.at(1);
        const createIndex =
            /^CREATE (UNIQUE )?INDEX "(\w+)" ON "(\w+)" ([^]*)$/.exec(sql);
        const indexName = dropIndex ?? createIndex?.at(2);
        if (
            indexName !== undefined &&
            equivalentIndexRebuilds.includes(indexName)
        ) {
            omittedIndexOperations++;
            continue;
        }
        const checkReplacement =
            /^ALTER TABLE "(\w+)" DROP CONSTRAINT "(\w+)", ADD CONSTRAINT "\w+" CHECK/.exec(
                sql,
            );
        if (
            checkReplacement !== null &&
            equivalentCheckReplacements.includes(
                `${checkReplacement[1]}.${checkReplacement[2]}`,
            )
        ) {
            omittedChecks++;
            continue;
        }
        if (dropIndex !== undefined) {
            indexDrops.add(dropIndex);
            continue;
        }
        if (
            sql ===
            `ALTER TABLE "analysis_work_state" DROP CONSTRAINT "analysis_work_state_conversation_spec_unique";`
        ) {
            continue;
        }
        if (createIndex !== null) {
            const name = createIndex.at(2);
            const table = createIndex.at(3);
            if (name === undefined || table === undefined)
                throw new Error("Incomplete generated index definition.");
            if (!newTables.has(table)) {
                concurrentBuilds++;
                if (indexDrops.delete(name)) {
                    const temporary = `${name}__v0116`;
                    if (temporary.length > 63)
                        throw new Error(
                            "Temporary index name exceeds PostgreSQL limit.",
                        );
                    onlineIndexes.push(
                        sql.replace(
                            `INDEX "${name}"`,
                            `INDEX CONCURRENTLY "${temporary}"`,
                        ),
                        `DROP INDEX CONCURRENTLY "${name}";`,
                        `ALTER INDEX "${temporary}" RENAME TO "${name}";`,
                    );
                } else {
                    onlineIndexes.push(
                        sql.replace("INDEX ", "INDEX CONCURRENTLY "),
                    );
                }
                continue;
            }
        }
        const unique =
            /^ALTER TABLE "(\w+)" ADD CONSTRAINT "(\w+)" UNIQUE(\([^]*\));$/.exec(
                sql,
            );
        if (unique !== null) {
            const table = unique.at(1);
            const name = unique.at(2);
            const columns = unique.at(3);
            if (
                table === undefined ||
                name === undefined ||
                columns === undefined
            )
                throw new Error("Incomplete generated unique definition.");
            if (!newTables.has(table)) {
                const temporary = `${name}__v0116`;
                const dropReplacement =
                    name === "analysis_work_state_input_spec_unique"
                        ? `DROP CONSTRAINT "analysis_work_state_conversation_spec_unique", `
                        : "";
                concurrentBuilds++;
                onlineIndexes.push(
                    `CREATE UNIQUE INDEX CONCURRENTLY "${temporary}" ON "${table}" ${columns};`,
                    `ALTER TABLE "${table}" ${dropReplacement}ADD CONSTRAINT "${name}" UNIQUE USING INDEX "${temporary}";`,
                );
                continue;
            }
        }
        if (
            /^ALTER TABLE "[^"]+" ALTER COLUMN "[^"]+" SET DATA TYPE timestamp\(\d+\) USING/.test(
                sql,
            )
        ) {
            timestampNoops++;
            continue;
        }
        if (
            /^ALTER TABLE "conversation" ALTER COLUMN "conversation_type"/.test(
                sql,
            ) ||
            /^DROP TYPE "conversation_type"/.test(sql) ||
            /^CREATE TYPE "conversation_type"/.test(sql)
        ) {
            if (enumOperations++ === 0)
                expand.push(
                    `ALTER TYPE "conversation_type" RENAME VALUE 'ranking' TO 'prioritizing';`,
                    `ALTER TYPE "conversation_type" ADD VALUE 'gathering' BEFORE 'polis';`,
                );
            continue;
        }
        // The replacement CHECK is added in the same contract phase.
        if (
            sql ===
            `ALTER TABLE "project_contact" DROP CONSTRAINT "project_contact_name_or_affiliation_check";`
        ) {
            constraints.push(sql);
            continue;
        }
        if (
            sql ===
            `ALTER TABLE "organization_membership" ADD COLUMN "role" "organization_role" NOT NULL;`
        ) {
            sql = `ALTER TABLE "organization_membership" ADD COLUMN "role" "organization_role";`;
            roleColumns++;
        }
        // The old content FK remains until the ownership repair has committed.
        if (
            sql ===
            `ALTER TABLE "vote" RENAME CONSTRAINT "vote_current_content_id_vote_content_id_fk" TO "vote_participant_account_fk";`
        )
            continue;
        if (
            sql ===
            `ALTER TABLE "ranking_score" DROP COLUMN "group_sources_snapshot";`
        ) {
            constraints.push(sql);
            legacyDrops++;
            continue;
        }
        if (
            /^ALTER TABLE /.test(sql) &&
            /ADD CONSTRAINT "[^"]+" (?:FOREIGN KEY|CHECK) /.test(sql)
        ) {
            sql = sql.replace(
                `ALTER TABLE "vote" DROP CONSTRAINT "vote_participant_account_fk",`,
                `ALTER TABLE "vote" DROP CONSTRAINT "vote_current_content_id_vote_content_id_fk",`,
            );
            const table = /^ALTER TABLE "(\w+)"/.exec(sql)?.at(1);
            const name = /ADD CONSTRAINT "(\w+)"/.exec(sql)?.at(1);
            if (table === undefined || name === undefined)
                throw new Error("Unrecognized generated constraint.");
            if (!newTables.has(table)) {
                constraints.push(sql.replace(/;$/, " NOT VALID;"));
                validations.push(
                    `ALTER TABLE "${table}" VALIDATE CONSTRAINT "${name}";`,
                );
            } else constraints.push(sql);
        } else {
            expand.push(sql);
        }
    }
    if (
        timestampNoops !== 306 ||
        enumOperations !== 6 ||
        roleColumns !== 1 ||
        legacyDrops !== 1 ||
        omittedIndexOperations !== 188 ||
        omittedChecks !== 116 ||
        concurrentBuilds !== 31
    ) {
        throw new Error(
            `Unexpected generated operations; refusing an incomplete deployment split: ${JSON.stringify(
                {
                    timestampNoops,
                    enumOperations,
                    roleColumns,
                    legacyDrops,
                    omittedIndexOperations,
                    omittedChecks,
                    concurrentBuilds,
                },
            )}`,
        );
    }
    for (const name of indexDrops)
        onlineIndexes.push(`DROP INDEX CONCURRENTLY "${name}";`);
    const read = async (/** @type {string} */ name) =>
        await readFile(join(serviceDirectory, "scripts", name), "utf8");
    const invalidation = await readFile(
        join(
            serviceDirectory,
            "database/flyway/V0089.1__separate_ranking_scoring_invalidations.sql",
        ),
        "utf8",
    );
    const initial = await readFile(
        join(
            serviceDirectory,
            "database/flyway/V0082.1__track_ranking_scoring_inputs.sql",
        ),
        "utf8",
    );
    const replacements = [
        { text: invalidation, name: "mark_ranking_scoring_input_dirty" },
        {
            text: initial,
            name: "mark_ranking_scoring_input_dirty_from_inserted_comparisons",
        },
        {
            text: invalidation,
            name: "mark_ranking_scoring_input_dirty_from_updated_comparisons",
        },
        {
            text: invalidation,
            name: "mark_ranking_scoring_input_dirty_from_deleted_comparisons",
        },
    ].map(({ text, name }) => {
        const match = new RegExp(
            `CREATE(?: OR REPLACE)? FUNCTION ${name}\\([^]*?\\$\\$;`,
        ).exec(text);
        if (match === null)
            throw new Error(`Missing historical scoring function: ${name}`);
        return match[0]
            .replace(/^CREATE FUNCTION/, "CREATE OR REPLACE FUNCTION")
            .replaceAll("maxdiff_result_id", "comparison_response_id")
            .replaceAll("maxdiff_result", "comparison_response")
            .replaceAll("'ranking'", "'prioritizing'");
    });
    const prepared = [
        {
            name: "V0116.2__backfill_organization_roles.sql",
            path: "prepare-organization-role-backfill.sql",
        },
        {
            name: "V0116.4__repair_guest_merge_vote_ownership.sql",
            path: "repair-guest-merge-vote-ownership.sql",
        },
        {
            name: "V0116.5__backfill_deletion_intent.sql",
            path: "prepare-deletion-intent-backfill.sql",
        },
        {
            name: "V0116.6__prepare_realtime_retention.sql",
            path: "prepare-realtime-retention-contract.sql",
        },
        {
            name: "V0116.7__refresh_deleted_account_live_inputs.sql",
            path: "refresh-deleted-account-live-inputs.sql",
        },
        {
            name: "V0116.8__prepare_participant_unlink.sql",
            path: "prepare-participant-unlink-contract.sql",
        },
        {
            name: "V0116.9__prepare_device_retirement.sql",
            path: "prepare-device-retirement-contract.sql",
        },
        {
            name: "V0116.10__prepare_comparison_retention.sql",
            path: "prepare-comparison-retention-contract.sql",
        },
    ];
    const phases = [
        phase({
            name: baseName,
            sql: `-- Fail before DDL/backfills if legacy context cannot be safely dropped.\n${legacyContextGuard}\n\n${expand.join(`\n${delimiter}\n`)}`,
        }),
        phase({
            name: "V0116.0.1__build_existing_indexes.sql",
            sql: onlineIndexes.join(`\n${delimiter}\n`),
            transactional: false,
        }),
        phase({
            name: "V0116.1__refresh_comparison_scoring_functions.sql",
            sql: [
                ...replacements,
                body(await read("prepare-ranking-account-source-contract.sql")),
            ].join("\n\n"),
        }),
        phase({
            name: "V0116.3__backfill_comparison_subtypes.sql",
            sql: boundedUpdates({
                prefix: "agora_upgrade_0116_3",
                expected: 1,
                sql: `UPDATE conversation SET prioritization_type = 'comparisons'
WHERE conversation_type = 'prioritizing' AND ranking_config_id IS NOT NULL
  AND prioritization_type IS NULL;`,
            }),
            transactional: false,
        }),
    ];
    for (const { name, path } of prepared) {
        const sourceSql = body(await read(path));
        let sql = sourceSql;
        let transactional = true;
        if (name.startsWith("V0116.2__")) {
            sql = boundedUpdates({
                sql,
                prefix: "agora_upgrade_0116_2",
                expected: 1,
            });
            transactional = false;
        } else if (name.startsWith("V0116.4__")) {
            sql = boundedOwnership(sql);
            transactional = false;
        } else if (name.startsWith("V0116.5__")) {
            sql = boundedUpdates({
                sql,
                prefix: "agora_upgrade_0116_5",
                expected: 7,
            });
            transactional = false;
        } else if (name.startsWith("V0116.6__")) {
            sql = boundedReplay(sql);
            transactional = false;
        } else if (name.startsWith("V0116.7__")) {
            sql = boundedLiveRefresh(sql);
            transactional = false;
        }
        phases.push(
            phase({
                name,
                sql: `-- Prepared source: scripts/${path}\n\n${sql}`,
                transactional,
            }),
        );
    }
    phases.push(
        phase({
            name: "V0116.11__enforce_coordinated_constraints.sql",
            sql: `-- Do not erase unclassified legacy numerical/account context.
${legacyContextGuard}

ALTER TABLE organization_membership ADD CONSTRAINT organization_membership_role_required
    CHECK (role IS NOT NULL) NOT VALID;

${constraints.join(`\n${delimiter}\n`)}`,
        }),
    );
    phases.push(
        phase({
            name: "V0116.13__validate_coordinated_constraints.sql",
            sql: [
                "ALTER TABLE organization_membership VALIDATE CONSTRAINT organization_membership_role_required;",
                // PostgreSQL can use the validated check to avoid another heap scan.
                "ALTER TABLE organization_membership ALTER COLUMN role SET NOT NULL;",
                "ALTER TABLE organization_membership DROP CONSTRAINT organization_membership_role_required;",
                ...validations,
            ].join(`\n${delimiter}\n`),
        }),
    );
    phases.push(
        phase({
            name: "V0116.12__prepare_organization_governance.sql",
            sql: `-- Deferred triggers protect new mutations, not preexisting orphan rows.
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM organization o WHERE o.deleted_at IS NULL AND NOT EXISTS (
            SELECT FROM organization_membership m JOIN "user" u ON u.id = m.user_id
            WHERE m.organization_id = o.id AND m.deleted_at IS NULL
              AND m.role = 'admin' AND NOT u.is_deleted
        )
    ) THEN RAISE EXCEPTION 'Reconcile active organizations without an active Admin before governance rollout'; END IF;
    IF EXISTS (
        SELECT FROM project p WHERE p.deleted_at IS NULL AND NOT EXISTS (
            SELECT FROM project_organization_ownership po JOIN organization o ON o.id = po.organization_id
            WHERE po.project_id = p.id AND po.deleted_at IS NULL AND o.deleted_at IS NULL
        )
    ) THEN RAISE EXCEPTION 'Reconcile active projects without an active owner before governance rollout'; END IF;
END;
$$;

${body(await read("prepare-organization-governance.sql"))}`,
        }),
        phase({
            name: "V0116.14__protect_retained_analysis_inputs.sql",
            sql: [
                body(await read("prepare-polis-retention-contract.sql")),
                body(
                    await read(
                        "prepare-retained-participant-eligibility-contract.sql",
                    ),
                ),
            ].join("\n\n"),
        }),
        phase({
            name: "V0116.15__backfill_default_project_directory_visibility.sql",
            sql: await read(
                "backfill-default-project-directory-visibility.sql",
            ),
        }),
    );
    const version = (/** @type {string} */ name) =>
        name.split("__")[0]?.slice(1).split(".").map(Number) ?? [];
    phases.sort((a, b) => {
        const left = version(a.name),
            right = version(b.name);
        for (
            let index = 0;
            index < Math.max(left.length, right.length);
            index++
        ) {
            const difference = (left[index] ?? 0) - (right[index] ?? 0);
            if (difference !== 0) return difference;
        }
        return 0;
    });
    return {
        source,
        sourceSha256,
        phases,
        artifacts: phases.flatMap((item) => [
            { name: item.name, sql: item.sql },
            ...(item.transactional
                ? []
                : [
                      {
                          name: `${item.name}.conf`,
                          sql: "executeInTransaction=false\n",
                      },
                  ]),
        ]),
    };
}

if (
    process.argv[1] !== undefined &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    const serviceDirectory = fileURLToPath(new URL("../", import.meta.url));
    const plan = await buildCoordinatedMigrations({ serviceDirectory });
    // Never overwrite a hand-adjusted phase or an unrelated Flyway migration.
    for (const item of plan.artifacts) {
        try {
            const target = join(serviceDirectory, "database/flyway", item.name);
            if (!(await lstat(target)).isFile()) {
                throw new Error(`Refusing non-regular migration ${item.name}`);
            }
            const existing = await readFile(
                join(serviceDirectory, "database/flyway", item.name),
                "utf8",
            );
            const prior = reviewedMigrations
                .flatMap((migration) => migration.files)
                .find((file) => file.name === item.name);
            if (
                existing !== item.sql &&
                !(item.name === baseName && hash(existing) === sourceSha256) &&
                (prior === undefined || hash(existing) !== prior.sha256)
            ) {
                throw new Error(
                    `Refusing to overwrite modified migration ${item.name}`,
                );
            }
        } catch (error) {
            if (
                !(
                    error instanceof Error &&
                    "code" in error &&
                    error.code === "ENOENT"
                )
            )
                throw error;
        }
    }
    if (process.argv.includes("--write")) {
        for (const item of plan.artifacts)
            await writeFile(
                join(serviceDirectory, "database/flyway", item.name),
                item.sql,
                "utf8",
            );
        const manifest = [
            {
                source: plan.source,
                sourceSha256: plan.sourceSha256,
                files: plan.artifacts.map((item) => ({
                    name: item.name,
                    sha256: hash(item.sql),
                })),
            },
        ];
        await writeFile(
            join(serviceDirectory, "scripts/reviewed_drizzle_migrations.mjs"),
            `// Generated by stage_coordinated_migration.mjs; do not edit phase hashes by hand.\nexport const reviewedMigrations = ${JSON.stringify(manifest, null, 4)};\n`,
        );
    }
    for (const item of plan.phases) console.info(item.name);
}
