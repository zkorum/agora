import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pushSchema } from "drizzle-kit/api-postgres";
import { eq, getColumnTable, getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
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
import * as schema from "../src/shared-backend/schema.js";
import { parseAuditArguments } from "./audit-retention-readiness.js";
import { readRetentionCatalog } from "./retention-audit-catalog.js";
import {
    auditOptionsSchema,
    buildRetentionChecks,
    createAuditReader,
    runRetentionAudit,
} from "./retention-audit.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing readiness fixture");
    return row;
}

describe("retention audit arguments", () => {
    it("uses bounded defaults and supports help without connection setup", () => {
        expect(parseAuditArguments(["--help"]).help).toBe(true);
        expect(parseAuditArguments([]).options).toEqual({
            rowLimit: 1000,
            statementTimeoutMs: 2000,
            lockTimeoutMs: 250,
            maxDurationMs: 30000,
        });
    });
    it.each([
        ["--row-limit", "0"],
        ["--row-limit", "10001"],
        ["--statement-timeout-ms", "Infinity"],
        ["--lock-timeout-ms", "0"],
        ["--max-duration-ms", "300001"],
        ["--write"],
        ["--exact"],
    ])("rejects unsafe or unknown options %j", (...args) => {
        expect(() => parseAuditArguments(args)).toThrow();
    });
});

describe("read-only comparison retention readiness", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    let auditUrl: string;
    let emptyReport: Awaited<ReturnType<typeof runRetentionAudit>>;
    const options = auditOptionsSchema.parse({});
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "readiness_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "readiness_test",
        };
        client = postgres({ ...connection, max: 4, onnotice: () => undefined });
        db = drizzle({ client });
        const url = new URL(
            "postgresql://postgres:postgres@localhost/readiness_test",
        );
        url.hostname = connection.host;
        url.port = String(connection.port);
        auditUrl = url.toString();
        emptyReport = await runRetentionAudit({ db, options });
        const pool = new Pool(connection);
        try {
            await (
                await pushSchema(schema, drizzlePg({ client: pool }))
            ).apply();
        } finally {
            await pool.end();
        }
        await client.unsafe(
            await readFile(
                new URL(
                    "./prepare-comparison-retention-contract.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
        await db.transaction(async (tx) => {
            await tx.execute(
                sql.raw(
                    await readFile(
                        new URL(
                            "../database/flyway/V0116.2__certify_comparison_input_baselines.sql",
                            import.meta.url,
                        ),
                        "utf8",
                    ),
                ),
            );
        });
    }, 120_000);
    beforeEach(async () => {
        if (client === undefined) throw new Error("Missing readiness database");
        const tables = Object.values(schema)
            .filter((value) => is(value, PgTable))
            .map((table) => `"${getTableName(table)}"`);
        // Disposable fixture only; the audit itself performs no DDL or writes.
        await client.unsafe(
            `TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
        );
    });
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function seed() {
        const userId = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: "private-fixture" });
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: "private-project",
                    title: "private-title",
                    directoryVisibility: "unlisted",
                })
                .returning(),
        );
        const config = first(
            await db
                .insert(schema.rankingConversationConfigTable)
                .values({ rankingMode: "bws" })
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "private1",
                    projectId: project.id,
                    rankingConfigId: config.id,
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "private-conversation-title",
                })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        return { userId, config, conversation };
    }

    it("reports absent schema as unknown, never as zero blockers", () => {
        expect(emptyReport.status).toBe("incomplete");
        expect(emptyReport.checks.length).toBeGreaterThan(0);
        for (const check of emptyReport.checks) {
            expect(check.measurement).toMatchObject({
                status: "unavailable",
                reason: "schema_gap",
            });
            expect(check.measurement).not.toHaveProperty("count");
        }
    });

    it("reports source-schema and trigger readiness without claiming migration safety", async () => {
        const report = await runRetentionAudit({ db, options });
        expect(report.status).toBe("no_detected_data_blockers");
        expect(report.catalog).toMatchObject({
            status: "read",
            schemaGaps: [],
            missingTriggers: [],
            missingIndexes: [],
        });
        expect(report).not.toHaveProperty("migrationSafe");
        for (const check of report.checks)
            expect(check.measurement).toEqual({
                status: "counted",
                count: 0,
                exact: true,
            });
    });

    it.each([false, true] as const)(
        "recognizes reused closing evidence and classifies baseline support (baseline=%s)",
        async (withBaseline) => {
            const f = await seed();
            const source = first(
                await db
                    .insert(schema.rankingConversationStatsSnapshotTable)
                    .values({
                        conversationId: f.conversation.id,
                        itemCount: 0,
                        totalItemCount: 0,
                        voteCount: 0,
                        totalVoteCount: 0,
                        participantCount: 0,
                        totalParticipantCount: 0,
                        scoringInputRevision: 0,
                        isClosed: false,
                    })
                    .returning(),
            );
            const capture = await db.transaction(async (tx) => {
                const input = first(
                    await tx
                        .insert(schema.rankingInputSnapshotTable)
                        .values({
                            conversationId: f.conversation.id,
                            comparisonMethod: "bws",
                            scoringInputRevision: 0,
                            algorithmVersion: 1,
                            solidagoVersion: "0.5.0",
                            pipelineConfig: {},
                            participantCount: 0,
                            itemCount: 0,
                            answerCount: 0,
                        })
                        .returning(),
                );
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({ sealedAt: new Date() })
                    .where(eq(schema.rankingInputSnapshotTable.id, input.id));
                if (withBaseline)
                    await tx
                        .insert(schema.comparisonInputBaselineTable)
                        .values({
                            inputSnapshotId: input.id,
                            baselineInputSnapshotId: input.id,
                            conversationId: f.conversation.id,
                        });
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({ statsSnapshotId: source.id })
                    .where(eq(schema.rankingInputSnapshotTable.id, input.id));
                return input;
            });
            await db
                .insert(schema.rankingConversationStatsSnapshotTable)
                .values({
                    conversationId: f.conversation.id,
                    reusedInputSnapshotId: capture.id,
                    itemCount: 0,
                    totalItemCount: 0,
                    voteCount: 0,
                    totalVoteCount: 0,
                    participantCount: 0,
                    totalParticipantCount: 0,
                    scoringInputRevision: 1,
                    isClosed: true,
                });
            await db
                .update(schema.rankingConversationStatsSnapshotTable)
                .set({ deletedAt: new Date() })
                .where(
                    eq(
                        schema.rankingConversationStatsSnapshotTable.id,
                        source.id,
                    ),
                );
            const report = await runRetentionAudit({ db, options });
            expect(report.status).toBe("no_detected_data_blockers");
            expect(
                report.checks.find(
                    (check) =>
                        check.name ===
                        "retained_snapshots_without_sealed_inputs",
                )?.measurement,
            ).toEqual({ status: "counted", count: 0, exact: true });
            expect(
                report.checks.find(
                    (check) =>
                        check.name ===
                        "closed_results_without_complete_baselines",
                ),
            ).toMatchObject({
                blocking: false,
                measurement: {
                    status: "counted",
                    count: withBaseline ? 0 : 1,
                    exact: true,
                },
            });
        },
    );

    it("runs the standalone CLI using only the explicitly selected disposable database", async () => {
        const run = promisify(execFile);
        const result = await run(
            process.execPath,
            [
                "--disable-warning=DEP0205",
                "--import",
                "tsx",
                "scripts/audit-retention-readiness.ts",
            ],
            {
                env: { ...process.env, RETENTION_AUDIT_DATABASE_URL: auditUrl },
                timeout: 15_000,
            },
        );
        const report = z
            .object({
                status: z.literal("no_detected_data_blockers"),
                readOnly: z.literal(true),
                consistency: z.literal("independent_short_reads"),
            })
            .parse(JSON.parse(result.stdout));
        expect(report.status).toBe("no_detected_data_blockers");
        expect(result.stderr).toBe("");
        expect(result.stdout).not.toContain(auditUrl);
    });

    it("caps counts, separates legacy blockers and emits no account/source data", async () => {
        const f = await seed();
        for (let index = 0; index < 4; index += 1) {
            await db.insert(schema.rankingScoreTable).values({
                conversationId: f.conversation.id,
                scores: [],
                participantCounts: {},
                pipelineConfig: { providerSecret: "do-not-emit" },
                userWeightsSnapshot: { [f.userId]: "private-context" },
                computedAt: new Date(),
            });
            await db
                .insert(schema.rankingConversationStatsSnapshotTable)
                .values({
                    conversationId: f.conversation.id,
                    itemCount: 0,
                    totalItemCount: 0,
                    voteCount: 0,
                    totalVoteCount: 0,
                    participantCount: 0,
                    totalParticipantCount: 0,
                    scoringInputRevision: 0,
                    isClosed: false,
                });
        }
        const report = await runRetentionAudit({
            db,
            options: auditOptionsSchema.parse({ rowLimit: 2 }),
        });
        expect(report.status).toBe("blocked");
        for (const name of [
            "unclassified_legacy_trust_context",
            "retained_snapshots_without_sealed_inputs",
        ])
            expect(
                report.checks.find((check) => check.name === name)?.measurement,
            ).toEqual({ status: "counted", count: 3, exact: false });
        const serialized = JSON.stringify(report);
        for (const secret of [
            f.userId,
            "private-context",
            "do-not-emit",
            "private-fixture",
            "private-project",
            "private-title",
            "private1",
        ])
            expect(serialized).not.toContain(secret);
    });

    it("counts unfinished closes/current legacy scores independently", async () => {
        const f = await seed();
        const score = first(
            await db
                .insert(schema.rankingScoreTable)
                .values({
                    conversationId: f.conversation.id,
                    scores: [],
                    participantCounts: {},
                    pipelineConfig: {},
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db
            .update(schema.rankingConversationConfigTable)
            .set({ currentRankingScoreId: score.id })
            .where(eq(schema.rankingConversationConfigTable.id, f.config.id));
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true, closingTargetRevision: 0 })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        const report = await runRetentionAudit({ db, options });
        for (const name of [
            "unfinished_comparison_closes",
            "current_scores_without_sealed_inputs",
        ])
            expect(
                report.checks.find((check) => check.name === name)?.measurement,
            ).toEqual({ status: "counted", count: 1, exact: true });
    });

    it("treats JSON null as absent context and unbound sealed captures as informational", async () => {
        const f = await seed();
        await db.insert(schema.rankingScoreTable).values({
            conversationId: f.conversation.id,
            scores: [],
            participantCounts: {},
            pipelineConfig: {},
            userWeightsSnapshot: sql`'null'::jsonb`,
            computedAt: new Date(),
        });
        await db.transaction(async (tx) => {
            const input = first(
                await tx
                    .insert(schema.rankingInputSnapshotTable)
                    .values({
                        conversationId: f.conversation.id,
                        comparisonMethod: "bws",
                        scoringInputRevision: 0,
                        algorithmVersion: 1,
                        solidagoVersion: "0.5.0",
                        pipelineConfig: {},
                        participantCount: 0,
                        itemCount: 0,
                        answerCount: 0,
                    })
                    .returning(),
            );
            await tx
                .update(schema.rankingInputSnapshotTable)
                .set({ sealedAt: new Date() })
                .where(eq(schema.rankingInputSnapshotTable.id, input.id));
        });
        const report = await runRetentionAudit({ db, options });
        expect(report.status).toBe("no_detected_data_blockers");
        expect(
            report.checks.find(
                (check) => check.name === "unbound_sealed_input_captures",
            ),
        ).toMatchObject({
            blocking: false,
            measurement: { status: "counted", count: 1, exact: true },
        });
    });

    it("treats a missing capture table as missing evidence, not as an empty result", async () => {
        const f = await seed();
        await db.insert(schema.rankingConversationStatsSnapshotTable).values({
            conversationId: f.conversation.id,
            itemCount: 0,
            totalItemCount: 0,
            voteCount: 0,
            totalVoteCount: 0,
            participantCount: 0,
            totalParticipantCount: 0,
            scoringInputRevision: 0,
            isClosed: false,
        });
        const { read } = createAuditReader({ db, options });
        const catalog = new Map(
            await readRetentionCatalog({
                read,
                names: [
                    "ranking_conversation_stats_snapshot",
                    "ranking_input_snapshot",
                ],
            }),
        );
        catalog.delete("ranking_input_snapshot");
        const check = buildRetentionChecks({ catalog, limit: 10 }).find(
            (check) =>
                check.name === "retained_snapshots_without_sealed_inputs",
        );
        if (check === undefined) throw new Error("Missing audit check");
        expect(
            check.dependencies.some(
                (column) =>
                    getTableName(getColumnTable(column)) ===
                    "ranking_input_snapshot",
            ),
        ).toBe(false);
        expect(await read(check.read)).toHaveLength(1);
    });

    it("enforces server read-only mode and recovers after a statement timeout", async () => {
        const { read, failure } = createAuditReader({
            db,
            options: auditOptionsSchema.parse({ statementTimeoutMs: 20 }),
        });
        await expect(
            read(
                async (tx) =>
                    await tx.insert(schema.userTable).values({
                        id: randomUUID(),
                        username: "must-not-write",
                    }),
            ),
        ).rejects.toThrow();
        try {
            // PostgreSQL control function, not a fabricated application table.
            await read(
                async (tx) => await tx.execute(sql`select pg_sleep(0.2)`),
            );
            throw new Error("Expected statement timeout");
        } catch (error) {
            expect(failure(error)).toBe("statement_timeout");
        }
        expect(
            await read(
                async (tx) =>
                    await tx
                        .select({ id: schema.userTable.id })
                        .from(schema.userTable),
            ),
        ).toEqual([]);
    });

    it("returns incomplete rather than zero when a relation is locked", async () => {
        await db.transaction(async (tx) => {
            // Synchronize a real DDL-style lock in this disposable database.
            await tx.execute(
                sql`lock table ranking_score in access exclusive mode`,
            );
            const report = await runRetentionAudit({
                db,
                options: auditOptionsSchema.parse({
                    lockTimeoutMs: 20,
                    statementTimeoutMs: 500,
                }),
            });
            expect(report.status).toBe("incomplete");
            expect(JSON.stringify(report)).toContain("lock_timeout");
        });
    });

    it("stops starting reads once its time budget is exhausted", async () => {
        const clock = vi.spyOn(performance, "now");
        try {
            clock.mockReturnValue(0);
            const { read, failure } = createAuditReader({
                db,
                options: auditOptionsSchema.parse({ maxDurationMs: 1 }),
            });
            clock.mockReturnValue(2);
            await expect(
                read(
                    async (tx) =>
                        await tx
                            .select({ id: schema.userTable.id })
                            .from(schema.userTable),
                ),
            ).rejects.toThrow("audit_budget_exhausted");
            expect(failure(new Error("sensitive provider information"))).toBe(
                "budget_exhausted",
            );
        } finally {
            clock.mockRestore();
        }
    });
});
