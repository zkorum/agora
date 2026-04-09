import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN_LIST = "http://localhost:9000";
process.env.PEPPERS = Buffer.from("0123456789abcdef0123456789abcdef").toString(
    "base64",
);
process.env.VERIFICATOR_SVC_BASE_URL = "http://localhost:3000";

const schema = await import("../src/shared-backend/schema.js");
const importDatabase = await import("../src/service/conversationImport/database.js");
const importService = await import("../src/service/conversationImport/index.js");
const realtimeModule = await import("../src/service/realtimeSSE.js");

const { conversationExportTable, conversationImportTable } = schema;
const { createImportRecord, markImportFailed } = importDatabase;
const { requestUrlImport } = importService;
const { RealtimeSSEManager } = realtimeModule;
type ImportBuffer = import("../src/service/importBuffer.js").ImportBuffer;

describe("Admission guards", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: ReturnType<typeof drizzle>;

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
            max: 1,
        });
        db = drizzle(sqlClient);

        await sqlClient.unsafe(`
            CREATE TABLE "conversation_import" (
                "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                "slug_id" varchar(8) NOT NULL UNIQUE,
                "conversation_id" integer,
                "user_id" uuid NOT NULL,
                "status" text NOT NULL,
                "failure_reason" text,
                "csv_file_metadata" jsonb,
                "created_at" timestamp NOT NULL,
                "updated_at" timestamp NOT NULL
            );
            CREATE INDEX "conversation_import_status_idx" ON "conversation_import" ("status");
            CREATE INDEX "conversation_import_created_idx" ON "conversation_import" ("created_at");
            CREATE INDEX "conversation_import_user_idx" ON "conversation_import" ("user_id");
            CREATE INDEX "conversation_import_conversation_idx" ON "conversation_import" ("conversation_id");
            CREATE UNIQUE INDEX "conversation_import_active_user_unique"
                ON "conversation_import" ("user_id")
                WHERE status = 'processing';

            CREATE TABLE "conversation_export" (
                "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                "slug_id" varchar(8) NOT NULL UNIQUE,
                "conversation_id" integer NOT NULL,
                "user_id" uuid NOT NULL,
                "status" text NOT NULL,
                "total_file_size" integer,
                "total_file_count" integer,
                "bundle_file_name" varchar(160),
                "bundle_file_size" integer,
                "bundle_s3_key" text,
                "owner_bundle_file_name" varchar(160),
                "owner_bundle_file_size" integer,
                "owner_bundle_s3_key" text,
                "failure_reason" text,
                "cancellation_reason" text,
                "expires_at" timestamp NOT NULL,
                "is_deleted" boolean NOT NULL DEFAULT false,
                "deleted_at" timestamp,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now()
            );
            CREATE INDEX "conversation_export_conversation_idx" ON "conversation_export" ("conversation_id");
            CREATE INDEX "conversation_export_status_idx" ON "conversation_export" ("status");
            CREATE INDEX "conversation_export_deleted_idx" ON "conversation_export" ("is_deleted");
            CREATE INDEX "conversation_export_created_idx" ON "conversation_export" ("created_at");
            CREATE INDEX "conversation_export_user_idx" ON "conversation_export" ("user_id");
            CREATE UNIQUE INDEX "conversation_export_active_user_conversation_unique"
                ON "conversation_export" ("conversation_id", "user_id")
                WHERE status = 'processing' AND is_deleted = false;
        `);
    }, 120000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120000);

    beforeEach(async () => {
        await sqlClient.unsafe(`
            TRUNCATE TABLE "conversation_import", "conversation_export"
            RESTART IDENTITY;
        `);
    });

    it("allows only one active import per user", async () => {
        const userId = crypto.randomUUID();

        const first = await createImportRecord({ db, userId });
        expect(first.status).toBe("created");

        const second = await createImportRecord({ db, userId });
        expect(second.status).toBe("active_import_exists");
        if (first.status === "created" && second.status === "active_import_exists") {
            expect(second.importSlugId).toBe(first.importSlugId);
        }
    });

    it("keeps import admission correct under concurrent requests", async () => {
        const userId = crypto.randomUUID();

        const [a, b] = await Promise.all([
            createImportRecord({ db, userId }),
            createImportRecord({ db, userId }),
        ]);

        const createdCount = [a, b].filter((result) => result.status === "created");
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
                polisUrl: "https://pol.is/123",
                formData: {
                    participationMode: "guest",
                    isIndexed: true,
                },
                proof: "proof",
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

    it("allows only one active export per user and conversation", async () => {
        const userId = crypto.randomUUID();
        const conversationId = 42;
        const expiresAt = new Date("2026-01-02T00:00:00.000Z");

        const first = await db
            .insert(conversationExportTable)
            .values({
                slugId: "export01",
                conversationId,
                userId,
                status: "processing",
                expiresAt,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportTable.id });

        const second = await db
            .insert(conversationExportTable)
            .values({
                slugId: "export02",
                conversationId,
                userId,
                status: "processing",
                expiresAt,
                createdAt: new Date("2026-01-01T00:00:01.000Z"),
                updatedAt: new Date("2026-01-01T00:00:01.000Z"),
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportTable.id });

        expect(first).toHaveLength(1);
        expect(second).toHaveLength(0);
    });

    it("allows a new processing export after the old one is deleted", async () => {
        const userId = crypto.randomUUID();
        const conversationId = 42;
        const expiresAt = new Date("2026-01-02T00:00:00.000Z");

        await db.insert(conversationExportTable).values({
            slugId: "export01",
            conversationId,
            userId,
            status: "processing",
            expiresAt,
            isDeleted: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        });

        await db
            .update(conversationExportTable)
            .set({
                isDeleted: true,
                deletedAt: new Date("2026-01-01T00:00:02.000Z"),
                updatedAt: new Date("2026-01-01T00:00:02.000Z"),
            })
            .where(eq(conversationExportTable.slugId, "export01"));

        const second = await db
            .insert(conversationExportTable)
            .values({
                slugId: "export02",
                conversationId,
                userId,
                status: "processing",
                expiresAt,
                createdAt: new Date("2026-01-01T00:00:03.000Z"),
                updatedAt: new Date("2026-01-01T00:00:03.000Z"),
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportTable.id });

        expect(second).toHaveLength(1);
    });
});
