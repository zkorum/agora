import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { withReplicas } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

import { readDbFixtureSql } from "./dbFixture.js";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN_LIST = "http://localhost:9000";
process.env.PEPPERS = Buffer.from("0123456789abcdef0123456789abcdef").toString(
    "base64",
);
process.env.VERIFICATOR_SVC_BASE_URL = "http://localhost:3000";

const schema = await import("../src/shared-backend/schema.js");
const importDatabase =
    await import("../src/service/conversationImport/database.js");
const importService =
    await import("../src/service/conversationImport/index.js");
const realtimeModule = await import("../src/service/realtimeSSE.js");

const {
    conversationExportGenerationTable,
    conversationExportRequestTable,
    conversationImportTable,
} = schema;
const {
    createImportRecord,
    markImportFailed,
    getImportStatus,
    getActiveImportForUser,
} = importDatabase;
const { MAX_CONVERSATION_IMPORT_DURATION_MS } =
    await import("../src/shared/shared.js");
const { requestUrlImport } = importService;
const { RealtimeSSEManager } = realtimeModule;
type ImportBuffer = import("../src/service/importBuffer.js").ImportBuffer;

describe("Admission guards", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let replicaClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let replicaDb: PostgresJsDatabase;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();

        sqlClient = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
            max: 3,
        });
        db = drizzle(sqlClient);

        await sqlClient.unsafe(readDbFixtureSql("admission-guards.sql"));
        await sqlClient.unsafe("CREATE DATABASE agora_replica");
        replicaClient = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_replica",
            username: "postgres",
            password: "postgres",
            max: 3,
        });
        replicaDb = drizzle(replicaClient);
        await replicaClient.unsafe(readDbFixtureSql("admission-guards.sql"));
    }, 120000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await replicaClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120000);

    beforeEach(async () => {
        await db.delete(conversationImportTable);
        await db.delete(conversationExportRequestTable);
        await db.delete(conversationExportGenerationTable);
        await replicaDb.delete(conversationImportTable);
    });

    async function createExportGeneration({
        conversationId,
        slugId,
    }: {
        conversationId: number;
        slugId: string;
    }): Promise<number> {
        const [generation] = await db
            .insert(conversationExportGenerationTable)
            .values({
                slugId,
                conversationId,
                status: "collecting",
                collectingEndsAt: new Date("2026-01-01T00:00:05.000Z"),
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            })
            .returning({ id: conversationExportGenerationTable.id });

        return generation.id;
    }

    it("allows only one active import per user", async () => {
        const userId = crypto.randomUUID();

        const first = await createImportRecord({ db, userId });
        expect(first.status).toBe("created");

        const second = await createImportRecord({ db, userId });
        expect(second.status).toBe("active_import_exists");
        if (
            first.status === "created" &&
            second.status === "active_import_exists"
        ) {
            expect(second.importSlugId).toBe(first.importSlugId);
        }
    });

    it("keeps import admission correct under concurrent requests", async () => {
        const userId = crypto.randomUUID();

        const [a, b] = await Promise.all([
            createImportRecord({ db, userId }),
            createImportRecord({ db, userId }),
        ]);

        const createdCount = [a, b].filter(
            (result) => result.status === "created",
        );
        const activeCount = [a, b].filter(
            (result) => result.status === "active_import_exists",
        );

        expect(createdCount).toHaveLength(1);
        expect(activeCount).toHaveLength(1);
    });

    it("allows a new import after the active one is failed", async () => {
        const userId = crypto.randomUUID();

        const first = await createImportRecord({ db, userId });
        expect(first.status).toBe("created");
        if (first.status !== "created") {
            throw new Error("Expected first import record to be created");
        }

        await markImportFailed({
            db,
            importSlugId: first.importSlugId,
            failureReason: "processing_error",
        });

        const second = await createImportRecord({ db, userId });
        expect(second.status).toBe("created");
        if (second.status === "created") {
            expect(second.importSlugId).not.toBe(first.importSlugId);
        }
    });

    it("marks import records failed when queueing the import throws", async () => {
        const userId = crypto.randomUUID();
        const importBuffer: ImportBuffer = {
            addImport: async () => {
                throw new Error("queue unavailable");
            },
            flush: async () => {},
            shutdown: async () => {},
        };

        await expect(
            requestUrlImport({
                db,
                userId,
                projectId: 1,
                polisUrl: "https://pol.is/123",
                formData: {
                    participationMode: "guest",
                    isIndexed: true,
                    aiLabelingEnabled: true,
                    preferredOpinionGroupCount: null,
                    languageTargetPolicy: {
                        source: "conversation_override",
                        dynamicTranslationEnabled: false,
                        manualTargetLanguageCodes: [],
                    },
                },
                didWrite: "did:test:queue",
                importBuffer,
                realtimeSSEManager: new RealtimeSSEManager(),
            }),
        ).rejects.toThrow("queue unavailable");

        const records = await db.select().from(conversationImportTable);
        expect(records).toHaveLength(1);
        expect(records[0].status).toBe("failed");
        expect(records[0].failureReason).toBe("processing_error");
    });

    it.each([null, 42])(
        "expires abandoned imports during admission (conversation=%s)",
        async (conversationId) => {
            const userId = crypto.randomUUID();
            await db.insert(conversationImportTable).values({
                slugId: "expired1",
                userId,
                conversationId,
                createdAt: new Date(
                    Date.now() - MAX_CONVERSATION_IMPORT_DURATION_MS - 1000,
                ),
                updatedAt: new Date(),
            });

            expect((await createImportRecord({ db, userId })).status).toBe(
                "created",
            );
            const [expired] = await db
                .select()
                .from(conversationImportTable)
                .where(eq(conversationImportTable.slugId, "expired1"));
            expect(expired).toMatchObject({
                status: "failed",
                failureReason: "timeout",
            });
        },
    );

    it("returns expired status from the writer despite a stale replica", async () => {
        const userId = crypto.randomUUID();
        const expiredImport = {
            slugId: "expired1",
            userId,
            conversationId: 42,
            createdAt: new Date(
                Date.now() - MAX_CONVERSATION_IMPORT_DURATION_MS - 1000,
            ),
        };
        await db.insert(conversationImportTable).values(expiredImport);
        await replicaDb.insert(conversationImportTable).values(expiredImport);
        const replicatedDb = withReplicas(db, [replicaDb]);
        expect(
            await getImportStatus({
                db: replicatedDb,
                userId,
                importSlugId: "expired1",
            }),
        ).toMatchObject({ status: "failed", failureReason: "timeout" });
        expect(
            await getActiveImportForUser({ db: replicatedDb, userId }),
        ).toBeNull();
        expect(
            await replicaDb
                .select({ status: conversationImportTable.status })
                .from(conversationImportTable),
        ).toEqual([{ status: "processing" }]);
    });

    it("keeps normal polling read-only", async () => {
        const userId = crypto.randomUUID();
        const created = await createImportRecord({ db, userId });
        expect(created.status).toBe("created");
        if (created.status !== "created") {
            throw new Error("Expected a fresh import");
        }
        const unavailableWriter = postgres({
            host: "127.0.0.1",
            port: 1,
            connect_timeout: 1,
        });
        try {
            const replicatedDb = withReplicas(drizzle(unavailableWriter), [db]);
            expect(
                await getImportStatus({
                    db: replicatedDb,
                    userId,
                    importSlugId: created.importSlugId,
                }),
            ).toMatchObject({ status: "processing" });
            expect(
                await getActiveImportForUser({ db: replicatedDb, userId }),
            ).toMatchObject({ importSlugId: created.importSlugId });
        } finally {
            await unavailableWriter.end({ timeout: 1 });
        }
    });

    it.each(["completed", "failed"] satisfies Array<"completed" | "failed">)(
        "preserves writer-side %s state when the replica still reports an overdue import",
        async (status) => {
            const userId = crypto.randomUUID();
            const fields = {
                slugId: "stale001",
                userId,
                conversationId: 42,
                createdAt: new Date(
                    Date.now() - MAX_CONVERSATION_IMPORT_DURATION_MS - 1000,
                ),
            };
            await replicaDb.insert(conversationImportTable).values(fields);
            await db.insert(conversationImportTable).values({
                ...fields,
                status,
                failureReason: status === "failed" ? "processing_error" : null,
            });
            const replicatedDb = withReplicas(db, [replicaDb]);

            expect(
                await getImportStatus({
                    db: replicatedDb,
                    userId,
                    importSlugId: fields.slugId,
                }),
            ).toMatchObject({
                status,
                failureReason: status === "failed" ? "processing_error" : null,
            });
            expect(
                await getActiveImportForUser({ db: replicatedDb, userId }),
            ).toBeNull();
        },
    );

    it("cannot expire another user's import by polling its ID", async () => {
        const userId = crypto.randomUUID();
        await db.insert(conversationImportTable).values({
            slugId: "private1",
            userId,
            createdAt: new Date(
                Date.now() - MAX_CONVERSATION_IMPORT_DURATION_MS - 1000,
            ),
        });
        expect(
            await getImportStatus({
                db,
                importSlugId: "private1",
                userId: crypto.randomUUID(),
            }),
        ).toBeNull();
        expect(
            await db
                .select({ status: conversationImportTable.status })
                .from(conversationImportTable),
        ).toEqual([{ status: "processing" }]);
    });

    it("preserves terminal import states when late failure handling runs", async () => {
        const userId = crypto.randomUUID();
        await db.insert(conversationImportTable).values({
            slugId: "done0001",
            userId,
            status: "completed",
            conversationId: 42,
        });
        await markImportFailed({
            db,
            importSlugId: "done0001",
            failureReason: "processing_error",
        });
        expect(
            await getImportStatus({ db, userId, importSlugId: "done0001" }),
        ).toMatchObject({ status: "completed", failureReason: null });
    });

    it("allows only one active export per user and conversation", async () => {
        const userId = crypto.randomUUID();
        const conversationId = 42;
        const generationId = await createExportGeneration({
            conversationId,
            slugId: "gen00001",
        });
        const expiresAt = new Date("2026-01-02T00:00:00.000Z");

        const first = await db
            .insert(conversationExportRequestTable)
            .values({
                slugId: "export01",
                conversationId,
                generationId,
                userId,
                status: "processing",
                expiresAt,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportRequestTable.id });

        const second = await db
            .insert(conversationExportRequestTable)
            .values({
                slugId: "export02",
                conversationId,
                generationId,
                userId,
                status: "processing",
                expiresAt,
                createdAt: new Date("2026-01-01T00:00:01.000Z"),
                updatedAt: new Date("2026-01-01T00:00:01.000Z"),
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportRequestTable.id });

        expect(first).toHaveLength(1);
        expect(second).toHaveLength(0);
    });

    it("allows a new processing export after the old one is deleted", async () => {
        const userId = crypto.randomUUID();
        const conversationId = 42;
        const generationId = await createExportGeneration({
            conversationId,
            slugId: "gen00001",
        });
        const expiresAt = new Date("2026-01-02T00:00:00.000Z");

        await db.insert(conversationExportRequestTable).values({
            slugId: "export01",
            conversationId,
            generationId,
            userId,
            status: "processing",
            expiresAt,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        });

        await db
            .update(conversationExportRequestTable)
            .set({
                deletedAt: new Date("2026-01-01T00:00:02.000Z"),
                updatedAt: new Date("2026-01-01T00:00:02.000Z"),
            })
            .where(eq(conversationExportRequestTable.slugId, "export01"));

        const second = await db
            .insert(conversationExportRequestTable)
            .values({
                slugId: "export02",
                conversationId,
                generationId,
                userId,
                status: "processing",
                expiresAt,
                createdAt: new Date("2026-01-01T00:00:03.000Z"),
                updatedAt: new Date("2026-01-01T00:00:03.000Z"),
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportRequestTable.id });

        expect(second).toHaveLength(1);
    });
});
