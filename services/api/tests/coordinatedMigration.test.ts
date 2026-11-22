import { readFile, readdir, writeFile } from "node:fs/promises";
import {
    generateDrizzleJson,
    generateMigration,
    reconstruct,
} from "drizzle-kit/api-postgres";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { z } from "zod";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const baselineFolder = "20261114165054_equal_golden_guardian";
const finalFolder = "20261122091916_coordinated_activity_upgrade";
type UpgradePhase = { name: string; sql: string; transactional: boolean };

async function readCatalog(database: postgres.Sql) {
    const columns = z
        .array(
            z.object({
                table_name: z.string(),
                name: z.string(),
                type: z.string(),
                not_null: z.boolean(),
                identity: z.string(),
                default_expr: z.string().nullable(),
            }),
        )
        .parse(
            await database.unsafe(`
        SELECT c.relname AS table_name, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type,
               a.attnotnull AS not_null, a.attidentity::text AS identity, pg_get_expr(d.adbin, d.adrelid) AS default_expr
        FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY c.relname, a.attname
    `),
        );
    const constraints = z
        .array(
            z.object({
                table_name: z.string(),
                name: z.string(),
                kind: z.string(),
                definition: z.string(),
                validated: z.boolean(),
            }),
        )
        .parse(
            await database.unsafe(`
        SELECT c.relname AS table_name, k.conname AS name, k.contype::text AS kind,
               pg_get_constraintdef(k.oid) AS definition, k.convalidated AS validated
        FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' ORDER BY c.relname, k.conname
    `),
        );
    const indexes = z
        .array(
            z.object({
                table_name: z.string(),
                name: z.string(),
                definition: z.string(),
                valid: z.boolean(),
                ready: z.boolean(),
            }),
        )
        .parse(
            await database.unsafe(`
        SELECT t.relname AS table_name, c.relname AS name, pg_get_indexdef(c.oid) AS definition,
               i.indisvalid AS valid, i.indisready AS ready
        FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND NOT EXISTS (
            SELECT FROM pg_constraint k WHERE k.conindid = c.oid AND k.contype IN ('p', 'u', 'x')
        ) ORDER BY t.relname, c.relname
    `),
        );
    const enums = z
        .array(
            z.object({
                name: z.string(),
                label: z.string(),
                position: z.number(),
            }),
        )
        .parse(
            await database.unsafe(`
            SELECT t.typname AS name, e.enumlabel AS label, e.enumsortorder AS position
            FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
            JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public'
            ORDER BY t.typname, e.enumsortorder
        `),
        );
    return { columns, constraints, indexes, enums };
}

// Static old-schema fixtures are intentional: the canonical ORM schema describes
// the destination, not the historical maxdiff tables and enum labels under test.
const seed = `
INSERT INTO "user" (id, username, is_deleted) VALUES
 ('11111111-1111-4111-8111-111111111111', 'active', false),
 ('22222222-2222-4222-8222-222222222222', 'deleted', true);
INSERT INTO organization (id, slug, display_name, default_language_code, directory_visibility, is_full_image_path)
 OVERRIDING SYSTEM VALUE VALUES (100, 'migration-org', 'Migration organization', 'en', 'unlisted', false);
INSERT INTO organization_membership (user_id, organization_id, deleted_at) VALUES
 ('11111111-1111-4111-8111-111111111111', 100, NULL),
 ('22222222-2222-4222-8222-222222222222', 100, '2026-01-01');
INSERT INTO project (id, slug, title, directory_visibility, auto_provisioned_for_organization_id)
 OVERRIDING SYSTEM VALUE VALUES (100, 'migration-project', 'Migration project', 'unlisted', 100);
INSERT INTO project_organization_ownership (project_id, organization_id) VALUES (100, 100);
INSERT INTO polis_conversation_config (id) OVERRIDING SYSTEM VALUE VALUES (100);
INSERT INTO ranking_conversation_config (id, ranking_mode) OVERRIDING SYSTEM VALUE VALUES (100, 'bws');
INSERT INTO conversation (id, slug_id, project_id, conversation_type, polis_config_id, ranking_config_id)
 OVERRIDING SYSTEM VALUE VALUES
 (100, 'polis001', 100, 'polis', 100, NULL),
 (101, 'rank0001', 100, 'ranking', NULL, 100);
INSERT INTO conversation_content (id, conversation_id, title)
 OVERRIDING SYSTEM VALUE VALUES (100, 100, 'Mapping'), (101, 101, 'Legacy BWS');
UPDATE conversation SET current_content_id = id WHERE id IN (100, 101);
INSERT INTO opinion (id, slug_id, author_id, conversation_id)
 OVERRIDING SYSTEM VALUE VALUES (100, 'opinion1', '11111111-1111-4111-8111-111111111111', 100);
INSERT INTO opinion_content (id, opinion_id, conversation_content_id, content)
 OVERRIDING SYSTEM VALUE VALUES (100, 100, 100, 'Preserved opinion');
UPDATE opinion SET current_content_id = 100, num_agrees = 2 WHERE id = 100;
INSERT INTO vote (id, author_id, opinion_id) OVERRIDING SYSTEM VALUE VALUES
 (100, '22222222-2222-4222-8222-222222222222', 100),
 (101, '11111111-1111-4111-8111-111111111111', 100);
INSERT INTO vote_content (id, vote_id, opinion_content_id, vote, created_at)
 OVERRIDING SYSTEM VALUE VALUES (100, 100, 100, 'agree', '2026-01-02');
UPDATE vote SET current_content_id = 100 WHERE id IN (100, 101);
INSERT INTO maxdiff_result (id, participant_id, conversation_id, comparisons)
 OVERRIDING SYSTEM VALUE VALUES (100, '11111111-1111-4111-8111-111111111111', 101, '[]');
INSERT INTO maxdiff_comparison (id, maxdiff_result_id, position, best_slug_id, worst_slug_id, candidate_set)
 OVERRIDING SYSTEM VALUE VALUES (100, 100, 0, 'item0001', 'item0004', ARRAY['item0001','item0002','item0003','item0004']);
INSERT INTO maxdiff_user_entity_score (id, maxdiff_result_id, entity_slug_id, score, uncertainty_left, uncertainty_right)
 OVERRIDING SYSTEM VALUE VALUES (100, 100, 'item0001', 0.5, 0.1, 0.1);
INSERT INTO ranking_conversation_stats_snapshot
 (id, conversation_id, item_count, total_item_count, vote_count, total_vote_count,
  participant_count, total_participant_count, scoring_input_revision, is_closed)
 OVERRIDING SYSTEM VALUE VALUES (100, 101, 4, 4, 1, 1, 1, 1, 0, true);
UPDATE conversation SET is_closed = true, closing_target_revision = 0, closed_finalized_at = '2026-01-03' WHERE id = 101;
INSERT INTO realtime_event_outbox (event_type, payload, delivery_id) VALUES
 ('opinion_updated', '{"opinion":"private old body","sourceLanguageCode":"en","opinionSlugId":"opinion1"}', 100);
`;

describe("ordered populated coordinated upgrade", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let expectedClient: postgres.Sql;
    let baselineSql: string;
    const phases: UpgradePhase[] = [];

    beforeAll(async () => {
        const snapshots: Record<string, unknown> = {};
        const directory = new URL("../drizzle/", import.meta.url);
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name > baselineFolder) continue;
            snapshots[entry.name] = z
                .record(z.string(), z.unknown())
                .parse(
                    JSON.parse(
                        await readFile(
                            new URL(`${entry.name}/snapshot.json`, directory),
                            "utf8",
                        ),
                    ),
                );
        }
        const baseline = await reconstruct(snapshots);
        // v1 generates different names for implicit constraints. A historical
        // upgrade fixture must preserve the names actually deployed by v0.
        const historical = {
            ...baseline,
            ddl: baseline.ddl.map((entity) =>
                "nameExplicit" in entity
                    ? { ...entity, nameExplicit: true }
                    : entity,
            ),
        };
        baselineSql = (
            await generateMigration(await generateDrizzleJson({}), historical)
        ).join("\n");
        snapshots[finalFolder] = z
            .record(z.string(), z.unknown())
            .parse(
                JSON.parse(
                    await readFile(
                        new URL(`${finalFolder}/snapshot.json`, directory),
                        "utf8",
                    ),
                ),
            );
        const final = await reconstruct(snapshots);
        const expectedSql = (
            await generateMigration(await generateDrizzleJson({}), {
                ...final,
                ddl: final.ddl.map((entity) =>
                    "nameExplicit" in entity
                        ? { ...entity, nameExplicit: true }
                        : entity,
                ),
            })
        ).join("\n");
        const flywayDirectory = new URL("../database/flyway/", import.meta.url);
        const phaseOrder = new Intl.Collator("en", { numeric: true });
        const files = (await readdir(flywayDirectory))
            .filter((file) => /^V0116(?:\.\d+)*__.*\.sql$/.test(file))
            .sort((a, b) =>
                phaseOrder.compare(
                    a.split("__")[0] ?? a,
                    b.split("__")[0] ?? b,
                ),
            );
        for (const file of files) {
            const url = new URL(`../database/flyway/${file}`, import.meta.url);
            let transactional = true;
            try {
                const config = await readFile(
                    new URL(`${file}.conf`, url),
                    "utf8",
                );
                expect(config).toBe("executeInTransaction=false\n");
                transactional = false;
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
            phases.push({
                name: file.split("__")[0] ?? file,
                sql: await readFile(url, "utf8"),
                transactional,
            });
        }
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "coordinated_migration_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            username: "postgres",
            password: "postgres",
            database: "coordinated_migration_test",
            max: 1,
            onnotice: () => {},
        });
        await client.unsafe("CREATE DATABASE coordinated_expected");
        expectedClient = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            username: "postgres",
            password: "postgres",
            database: "coordinated_expected",
            max: 1,
            onnotice: () => {},
        });
        await expectedClient.unsafe(expectedSql);
    }, 120_000);

    beforeEach(async () => {
        // The only connection is to the disposable container created above.
        await client.unsafe(
            "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
        );
        await client.unsafe(baselineSql);
        for (const file of [
            "V0082.1__track_ranking_scoring_inputs.sql",
            "V0089.1__separate_ranking_scoring_invalidations.sql",
            "V0111.1__backfill_conversation_participants.sql",
        ]) {
            await client.unsafe(
                await readFile(
                    new URL(`../database/flyway/${file}`, import.meta.url),
                    "utf8",
                ),
            );
        }
        await client.unsafe(seed);
        // Force multiple commits even in the tiny fixture, exercising keyset
        // boundaries, holes and retry-safe predicates rather than one large batch.
        await client.unsafe("SET agora.migration_batch_size = '1'");
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await expectedClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    async function executePhase({ sql, transactional }: UpgradePhase) {
        if (transactional) {
            await client.begin(async (tx) => {
                await tx.unsafe(sql);
            });
        } else {
            for (const statement of sql
                .split("--> statement-breakpoint")
                .filter((item) => item.trim())) {
                await client.unsafe(statement);
            }
        }
    }

    async function applyThrough(lastPhase?: string) {
        for (const phase of phases) {
            await executePhase(phase);
            if (phase.name === lastPhase) break;
        }
    }

    it("preserves legacy BWS/frozen counts, repairs ownership and assigns historical roles", async () => {
        const before = await readCatalog(client);
        await client.unsafe("SET TIME ZONE 'Pacific/Honolulu'");
        await applyThrough();
        expect(
            await client.unsafe(
                `SELECT directory_visibility FROM project WHERE id = 100`,
            ),
        ).toEqual([{ directory_visibility: "listed" }]);
        const actual = await readCatalog(client);
        const expected = await readCatalog(expectedClient);
        expect(actual.columns).toEqual(expected.columns);
        // Renaming an enum preserves OIDs and ordering; absolute sort numbers can
        // differ from a fresh CREATE TYPE after ADD VALUE.
        expect(
            actual.enums.map(({ name, label }) => ({ name, label })),
        ).toEqual(expected.enums.map(({ name, label }) => ({ name, label })));
        const constraintDefinitions = (catalog: typeof actual) =>
            catalog.constraints
                .filter(({ kind }) => kind !== "t")
                .map(({ table_name, name, kind, definition, validated }) => ({
                    table_name,
                    name: kind === "c" || kind === "f" ? name : undefined,
                    kind,
                    definition,
                    validated,
                }))
                .sort((a, b) =>
                    JSON.stringify(a).localeCompare(JSON.stringify(b)),
                );
        expect(constraintDefinitions(actual)).toEqual(
            constraintDefinitions(expected),
        );
        expect(actual.indexes).toEqual(expected.indexes);
        const reportPath = process.env.COORDINATED_CATALOG_AUDIT_PATH;
        if (reportPath !== undefined) {
            const rename = (text: string) => {
                for (const [oldName, newName] of [
                    [
                        "maxdiff_user_entity_score_maxdiff_result_id_entity_slug_id_unique",
                        "comparison_user_entity_score_response_entity_unique",
                    ],
                    [
                        "maxdiff_comparison_active_result_position_unique",
                        "comparison_answer_active_response_position_unique",
                    ],
                    [
                        "maxdiff_user_entity_score_result_score_idx",
                        "comparison_user_entity_score_response_score_idx",
                    ],
                    [
                        "maxdiff_user_entity_score_deleted_idx",
                        "comparison_user_entity_score_deleted_idx",
                    ],
                    [
                        "maxdiff_result_conversation_idx",
                        "comparison_response_conversation_idx",
                    ],
                    [
                        "maxdiff_comparison_result_idx",
                        "comparison_answer_response_idx",
                    ],
                    [
                        "maxdiff_user_entity_score",
                        "comparison_user_entity_score",
                    ],
                    ["maxdiff_comparison", "comparison_answer"],
                    ["maxdiff_result_id", "comparison_response_id"],
                    ["maxdiff_result", "comparison_response"],
                    ["'ranking'", "'prioritizing'"],
                ]) {
                    if (oldName !== undefined && newName !== undefined)
                        text = text.replaceAll(oldName, newName);
                }
                return text;
            };
            const normalized: unknown = JSON.parse(
                rename(JSON.stringify(before)),
            );
            const previous = z
                .object({
                    indexes: z.array(
                        z.object({
                            table_name: z.string(),
                            name: z.string(),
                            definition: z.string(),
                        }),
                    ),
                    constraints: z.array(
                        z.object({
                            table_name: z.string(),
                            name: z.string(),
                            kind: z.string(),
                            definition: z.string(),
                            validated: z.boolean(),
                        }),
                    ),
                })
                .parse(normalized);
            await writeFile(
                reportPath,
                JSON.stringify(
                    {
                        equivalentIndexes: actual.indexes.filter((index) =>
                            previous.indexes.some(
                                (prior) =>
                                    prior.table_name === index.table_name &&
                                    prior.name === index.name &&
                                    prior.definition === index.definition,
                            ),
                        ),
                        equivalentChecks: actual.constraints.filter(
                            (constraint) =>
                                constraint.kind === "c" &&
                                previous.constraints.some(
                                    (prior) =>
                                        prior.table_name ===
                                            constraint.table_name &&
                                        prior.name === constraint.name &&
                                        prior.definition ===
                                            constraint.definition,
                                ),
                        ),
                    },
                    null,
                    2,
                ),
            );
        }
        expect(
            z
                .array(
                    z.object({
                        conversation_type: z.literal("prioritizing"),
                        prioritization_type: z.literal("comparisons"),
                        ranking_mode: z.literal("bws"),
                    }),
                )
                .parse(
                    await client.unsafe(`
            SELECT c.conversation_type, c.prioritization_type, config.ranking_mode
            FROM conversation c JOIN ranking_conversation_config config ON config.id = c.ranking_config_id
            WHERE c.id = 101
        `),
                ),
        ).toHaveLength(1);
        expect(
            z.array(z.object({ discovery_utc: z.literal(true) })).parse(
                await client.unsafe(`
                SELECT delivered_at BETWEEN (clock_timestamp() AT TIME ZONE 'UTC') - interval '5 minutes'
                                        AND (clock_timestamp() AT TIME ZONE 'UTC') + interval '1 minute' AS discovery_utc
                FROM realtime_event_outbox WHERE delivery_id = 100
            `),
            ),
        ).toHaveLength(1);
        expect(
            z
                .array(
                    z.object({
                        response_id: z.literal(100),
                        answer_id: z.literal(100),
                        score_id: z.literal(100),
                        best_slug_id: z.literal("item0001"),
                        worst_slug_id: z.literal("item0004"),
                        candidate_set: z.tuple([
                            z.literal("item0001"),
                            z.literal("item0002"),
                            z.literal("item0003"),
                            z.literal("item0004"),
                        ]),
                        score: z.literal(0.5),
                    }),
                )
                .parse(
                    await client.unsafe(`
            SELECT response.id AS response_id, answer.id AS answer_id, personal.id AS score_id,
                   answer.best_slug_id, answer.worst_slug_id, answer.candidate_set, personal.score
            FROM comparison_response response
            JOIN comparison_answer answer ON answer.comparison_response_id = response.id
            JOIN comparison_user_entity_score personal ON personal.comparison_response_id = response.id
            WHERE response.id = 100 AND answer.id = 100 AND personal.id = 100
        `),
                ),
        ).toHaveLength(1);
        expect(
            z
                .array(
                    z.object({
                        role: z.literal("admin"),
                        deleted: z.boolean(),
                    }),
                )
                .parse(
                    await client.unsafe(
                        "SELECT role, deleted_at IS NOT NULL AS deleted FROM organization_membership ORDER BY id",
                    ),
                ),
        ).toEqual([
            { role: "admin", deleted: false },
            { role: "admin", deleted: true },
        ]);
        expect(
            z
                .array(
                    z.object({
                        vote: z.literal("agree"),
                        own: z.literal(true),
                        created: z.literal("2026-01-02"),
                    }),
                )
                .parse(
                    await client.unsafe(`
                SELECT content.vote, content.vote_id = v.id AS own, content.created_at::date::text AS created
                FROM vote v JOIN vote_content content ON content.id = v.current_content_id WHERE v.id = 101
            `),
                ),
        ).toHaveLength(1);
        expect(
            z
                .array(z.object({ num_agrees: z.literal(1) }))
                .parse(
                    await client.unsafe(
                        "SELECT num_agrees FROM opinion WHERE id = 100",
                    ),
                ),
        ).toHaveLength(1);
        expect(
            z
                .array(
                    z.object({
                        vote_count: z.literal(1),
                        participant_count: z.literal(1),
                        is_closed: z.literal(true),
                    }),
                )
                .parse(
                    await client.unsafe(
                        "SELECT vote_count, participant_count, is_closed FROM ranking_conversation_stats_snapshot WHERE id = 100",
                    ),
                ),
        ).toHaveLength(1);
        expect(
            z
                .array(z.object({ evidence: z.literal(0) }))
                .parse(
                    await client.unsafe(
                        "SELECT count(*)::integer AS evidence FROM ranking_input_snapshot",
                    ),
                ),
        ).toHaveLength(1);
        expect(
            z
                .array(
                    z.object({
                        event_type: z.literal("opinion_source_changed"),
                        scrubbed: z.literal(true),
                        dated: z.literal(true),
                    }),
                )
                .parse(
                    await client.unsafe(`
                SELECT event_type, NOT (payload ? 'opinion') AND NOT (payload ? 'sourceLanguageCode') AS scrubbed,
                       delivered_at IS NOT NULL AS dated FROM realtime_event_outbox WHERE delivery_id = 100
            `),
                ),
        ).toHaveLength(1);
        expect(
            z
                .array(
                    z.object({
                        reason_unknown: z.literal(true),
                        no_recovery: z.literal(true),
                    }),
                )
                .parse(
                    await client.unsafe(`
                SELECT deletion_reason IS NULL AS reason_unknown, recoverable_until IS NULL AS no_recovery
                FROM "user" WHERE id = '22222222-2222-4222-8222-222222222222'
            `),
                ),
        ).toHaveLength(1);
    }, 120_000);

    it("executes real renamed comparison triggers with append/invalidation semantics", async () => {
        await applyThrough();
        const revisions = async () =>
            z
                .array(
                    z.object({ input: z.number(), invalidation: z.number() }),
                )
                .parse(
                    await client.unsafe(`
                SELECT scoring_input_revision::integer AS input, scoring_invalidation_revision::integer AS invalidation
                FROM ranking_conversation_config WHERE id = 100
            `),
                )
                .at(0);
        const before = await revisions();
        if (before === undefined) throw new Error("Missing migrated config");
        await client.unsafe(`
            INSERT INTO comparison_answer (comparison_response_id, position, best_slug_id, worst_slug_id, candidate_set)
            VALUES (100, 1, 'item0001', 'item0004', ARRAY['item0001','item0002','item0003','item0004'])
        `);
        expect(await revisions()).toEqual({
            input: before.input + 1,
            invalidation: before.invalidation,
        });
        await client.unsafe(
            "UPDATE comparison_answer SET best_slug_id = 'item0004', worst_slug_id = 'item0001' WHERE comparison_response_id = 100 AND position = 1",
        );
        expect(await revisions()).toEqual({
            input: before.input + 2,
            invalidation: before.input + 2,
        });
    }, 120_000);

    it("permits a normal table writer while an actual concurrent migration index waits", async () => {
        await applyThrough("V0116");
        const indexPhase = phases.find(({ name }) => name === "V0116.0.1");
        const statement = indexPhase?.sql
            .split("--> statement-breakpoint")
            .find((sql) =>
                sql.includes('CREATE INDEX CONCURRENTLY "opinion_deleted_idx"'),
            );
        if (statement === undefined)
            throw new Error("Missing concurrent opinion index");
        const observer = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            username: "postgres",
            password: "postgres",
            database: "coordinated_migration_test",
            max: 2,
            onnotice: () => {},
        });
        try {
            const writer = await observer.reserve();
            await writer.unsafe("BEGIN");
            await writer.unsafe(
                "UPDATE opinion SET num_agrees = num_agrees WHERE id = 100",
            );
            const build = (async () => {
                try {
                    await client.unsafe(statement);
                    return { error: undefined };
                } catch (error) {
                    return { error };
                }
            })();
            try {
                await vi.waitFor(
                    async () => {
                        const rows = z
                            .array(z.object({ builds: z.number() }))
                            .parse(
                                await observer.unsafe(`
                            SELECT count(*)::integer AS builds FROM pg_stat_progress_create_index
                            WHERE relid = 'opinion'::regclass
                              AND datid = (SELECT oid FROM pg_database WHERE datname = current_database())
                        `),
                            );
                        expect(rows).toEqual([{ builds: 1 }]);
                    },
                    { timeout: 2000, interval: 25 },
                );
                await observer.begin(async (tx) => {
                    await tx.unsafe("SET LOCAL lock_timeout = '100ms'");
                    await tx.unsafe(`
                        INSERT INTO opinion (slug_id, author_id, conversation_id)
                        VALUES ('parallel', '11111111-1111-4111-8111-111111111111', 100)
                    `);
                });
            } finally {
                await writer.unsafe("ROLLBACK");
                writer.release();
                const result = await build;
                if (result.error !== undefined) throw result.error;
            }
        } finally {
            await observer.end({ timeout: 5 });
        }
    }, 120_000);

    it("does not drop unclassified legacy group context", async () => {
        await client.unsafe(`
            INSERT INTO ranking_score (conversation_id, scores, participant_counts, pipeline_config, computed_at, group_sources_snapshot)
            VALUES (101, '[]', '{}', '{}', '2026-01-01', '{"legacy":true}')
        `);
        await expect(applyThrough()).rejects.toThrow(
            "Legacy group context requires classification",
        );
        expect(
            z
                .array(z.object({ retained: z.literal(true) }))
                .parse(
                    await client.unsafe(
                        `SELECT group_sources_snapshot = '{"legacy":true}'::jsonb AS retained FROM ranking_score`,
                    ),
                ),
        ).toHaveLength(1);
    }, 120_000);

    it("permits a normal writer while the migrated FK validation lock is held", async () => {
        await applyThrough("V0116.12");
        const validation = phases
            .find(({ name }) => name === "V0116.13")
            ?.sql.split("--> statement-breakpoint")
            .find((sql) =>
                sql.includes(
                    'VALIDATE CONSTRAINT "vote_current_content_owner_fk"',
                ),
            );
        if (validation === undefined)
            throw new Error("Missing ownership validation");
        const observer = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            username: "postgres",
            password: "postgres",
            database: "coordinated_migration_test",
            max: 1,
            onnotice: () => {},
        });
        try {
            await observer.begin(async (tx) => {
                await tx.unsafe(validation);
                // Validation locks remain held until this transaction commits.
                await client.begin(async (writer) => {
                    await writer.unsafe("SET LOCAL lock_timeout = '100ms'");
                    await writer.unsafe(
                        "UPDATE vote SET updated_at = updated_at WHERE id = 101",
                    );
                });
            });
        } finally {
            await observer.end({ timeout: 5 });
        }
    }, 120_000);

    it("retains completed batches on failure and safely retries missing roles", async () => {
        await applyThrough("V0116.1");
        await client.unsafe(`
            CREATE FUNCTION fail_second_role_batch() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF NEW.id = 2 THEN RAISE EXCEPTION 'induced batch failure'; END IF;
                RETURN NEW;
            END;
            $$;
            CREATE TRIGGER fail_second_role_batch BEFORE UPDATE ON organization_membership
            FOR EACH ROW EXECUTE FUNCTION fail_second_role_batch();
        `);
        const roles = phases.find(({ name }) => name === "V0116.2");
        if (roles === undefined) throw new Error("Missing role phase");
        await expect(executePhase(roles)).rejects.toThrow(
            "induced batch failure",
        );
        expect(
            z
                .array(z.object({ role: z.string().nullable() }))
                .parse(
                    await client.unsafe(
                        "SELECT role FROM organization_membership ORDER BY id",
                    ),
                ),
        ).toEqual([{ role: "admin" }, { role: null }]);
        await client.unsafe(
            "DROP TRIGGER fail_second_role_batch ON organization_membership",
        );
        await client.unsafe(
            "UPDATE organization_membership SET role = 'manager' WHERE id = 1",
        );
        await executePhase(roles);
        expect(
            z
                .array(z.object({ role: z.enum(["admin", "manager"]) }))
                .parse(
                    await client.unsafe(
                        "SELECT role FROM organization_membership ORDER BY id",
                    ),
                ),
        ).toEqual([{ role: "manager" }, { role: "admin" }]);
    }, 120_000);

    it("rejects cross-opinion corruption before copying any vote content", async () => {
        await client.unsafe(`
            INSERT INTO opinion (id, slug_id, author_id, conversation_id) OVERRIDING SYSTEM VALUE
            VALUES (101, 'opinion2', '11111111-1111-4111-8111-111111111111', 100);
            INSERT INTO opinion_content (id, opinion_id, conversation_content_id, content) OVERRIDING SYSTEM VALUE
            VALUES (101, 101, 100, 'Different opinion');
            UPDATE vote_content SET opinion_content_id = 101 WHERE id = 100;
        `);
        await applyThrough("V0116.3");
        const repair = phases.find(({ name }) => name === "V0116.4");
        if (repair === undefined) throw new Error("Missing ownership phase");
        await expect(executePhase(repair)).rejects.toThrow(
            "references a different statement",
        );
        expect(
            z
                .array(z.object({ count: z.literal(1) }))
                .parse(
                    await client.unsafe(
                        "SELECT count(*)::integer AS count FROM vote_content",
                    ),
                ),
        ).toHaveLength(1);
    }, 120_000);

    it("enforces migrated ownership, last-admin and retired-key guards on new writes", async () => {
        await applyThrough();
        await expect(
            client.unsafe(
                "UPDATE vote SET current_content_id = 100 WHERE id = 101",
            ),
        ).rejects.toThrow("vote_current_content_owner_fk");
        await expect(
            client.unsafe(`
            UPDATE "user" SET is_deleted = true
            WHERE id = '11111111-1111-4111-8111-111111111111'
        `),
        ).rejects.toThrow("organization_active_admin_required");
        await client.unsafe(
            "INSERT INTO retired_device_key (did_write) VALUES ('did:key:retired-migration-test')",
        );
        await expect(
            client.unsafe(`
            INSERT INTO device (did_write, user_id, user_agent, session_expiry)
            VALUES ('did:key:retired-migration-test', '11111111-1111-4111-8111-111111111111',
                    'migration test', '2026-12-01')
        `),
        ).rejects.toThrow("device signing key is retired");
    }, 120_000);

    it("refuses preexisting orphan organizations instead of inventing an Admin", async () => {
        await applyThrough("V0116.11");
        await client.unsafe(`
            INSERT INTO organization (slug, display_name, default_language_code, directory_visibility, is_full_image_path)
            VALUES ('orphan', 'Orphan', 'en', 'unlisted', false)
        `);
        const governance = phases.find(({ name }) => name === "V0116.12");
        if (governance === undefined)
            throw new Error("Missing governance phase");
        await expect(
            client.begin(async (tx) => {
                await tx.unsafe(governance.sql);
            }),
        ).rejects.toThrow(
            "Reconcile active organizations without an active Admin",
        );
    }, 120_000);
});
