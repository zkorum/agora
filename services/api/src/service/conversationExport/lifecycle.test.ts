import { eq } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api";
import { withReplicas } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import JSZip from "jszip";
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
import {
    conversationTable,
    conversationContentTable,
    conversationExportArtifactTable,
    conversationExportGenerationTable,
    conversationExportRequestTable,
    conversationExportRequestFileTable,
    polisConversationConfigTable,
    projectTable,
    userTable,
} from "@/shared-backend/schema.js";
import * as schema from "@/shared-backend/schema.js";
import type { CsvGenerator } from "./generators/base.js";
import type {
    downloadFromS3,
    generatePresignedUrl,
    uploadToS3,
} from "../s3.js";
import type { getConversationViewAccessLevelForConversation } from "../conversationAccess.js";

const mocks = vi.hoisted(() => ({
    generate: vi.fn<CsvGenerator["generate"]>(),
    upload: vi.fn<typeof uploadToS3>(),
    download: vi.fn<typeof downloadFromS3>(),
    delete: vi.fn(),
    notify: vi.fn(),
    sign: vi.fn<typeof generatePresignedUrl>(),
    access: vi.fn<typeof getConversationViewAccessLevelForConversation>(),
}));

vi.mock("@/app.js", () => ({
    config: {
        EXPORT_CONVOS_AWS_S3_BUCKET_NAME: "test-exports",
        EXPORT_CONVOS_AWS_S3_REGION: "eu-west-1",
        EXPORT_CONVOS_S3_PRESIGNED_URL_EXPIRY_SECONDS: 300,
    },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../s3.js", () => ({
    uploadToS3: mocks.upload,
    downloadFromS3: mocks.download,
    deleteFromS3: mocks.delete,
    generatePresignedUrl: mocks.sign,
}));
vi.mock("./notifications.js", () => ({
    createExportNotification: mocks.notify,
}));
vi.mock("../survey.js", () => ({ getActiveSurveyConfigRecord: vi.fn() }));
vi.mock("../conversationAccess.js", () => ({
    getConversationViewAccessLevelForConversation: mocks.access,
}));
vi.mock("./generators/factory.js", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("./generators/factory.js")>();
    return {
        ...actual,
        getExportGeneratorByFileType: () =>
            ({
                fileType: "comments",
                minimumAccessLevel: "public",
                generate: mocks.generate,
            }) satisfies CsvGenerator,
    };
});

import {
    cleanupExpiredExports,
    cleanupStaleExports,
    createExportWorker,
    getConversationExportHistory,
    getConversationExportStatus,
} from "./core.js";
import { getExportReadinessForConversation } from "./readiness.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ORIGINAL_CSV = Buffer.from(
    "comment-id,comment_text\n0,Original statement\n",
);

describe("export lifecycle with a stale replica", () => {
    const containers: StartedTestContainer[] = [];
    const clients: postgres.Sql[] = [];
    let primary: PostgresJsDatabase;
    let replica: PostgresJsDatabase;
    let db: PostgresJsDatabase;
    const storedObjects = new Map<string, Buffer>();

    beforeAll(async () => {
        const createDatabase = async (): Promise<PostgresJsDatabase> => {
            const container = await new GenericContainer("postgres:16-alpine")
                .withEnvironment({
                    POSTGRES_USER: "postgres",
                    POSTGRES_PASSWORD: "postgres",
                    POSTGRES_DB: "agora_test",
                })
                .withExposedPorts(5432)
                .start();
            containers.push(container);
            const connection = {
                host: container.getHost(),
                port: container.getMappedPort(5432),
                database: "agora_test",
                username: "postgres",
                password: "postgres",
            };
            const client = postgres(connection);
            clients.push(client);
            const database = drizzle(client);
            // Generate the real schema in a disposable database, including its constraints.
            // Drizzle Kit's push API expects node-postgres's result.rows shape.
            const pool = new Pool({ ...connection, user: connection.username });
            try {
                const migration = await pushSchema(
                    schema,
                    drizzleNodePostgres(pool),
                );
                await migration.apply();
            } finally {
                await pool.end();
            }
            return database;
        };
        // Independent databases make replica lag deterministic: its rows never advance.
        [primary, replica] = await Promise.all([
            createDatabase(),
            createDatabase(),
        ]);
        db = withReplicas(primary, [replica]);
    }, 120_000);

    afterAll(async () => {
        await Promise.all(
            clients.map(async (client) => {
                await client.end({ timeout: 5 });
            }),
        );
        await Promise.all(
            containers.map(async (container) => await container.stop()),
        );
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        mocks.access.mockReset().mockResolvedValue("public");
        mocks.sign.mockReset().mockResolvedValue({
            url: "https://example.com/download",
            expiresAt: new Date(Date.now() + 300_000),
        });
        storedObjects.clear();
        mocks.generate
            .mockReset()
            .mockResolvedValue({ csvBuffer: ORIGINAL_CSV, recordCount: 1 });
        mocks.upload.mockReset().mockImplementation(({ s3Key, buffer }) => {
            storedObjects.set(s3Key, buffer);
            return Promise.resolve();
        });
        mocks.download.mockReset().mockImplementation(({ s3Key }) => {
            const buffer = storedObjects.get(s3Key);
            if (buffer === undefined)
                throw new Error(`Missing stored object ${s3Key}`);
            return Promise.resolve(buffer);
        });
        await Promise.all([primary, replica].map(seedDatabase));
    });

    async function seedDatabase(database: PostgresJsDatabase): Promise<void> {
        await database.transaction(async (tx) => {
            await tx.delete(conversationExportRequestFileTable);
            await tx.delete(conversationExportRequestTable);
            await tx.delete(conversationExportArtifactTable);
            await tx.delete(conversationExportGenerationTable);
            await tx.update(conversationTable).set({ currentContentId: null });
            await tx.delete(conversationContentTable);
            await tx.delete(conversationTable);
            await tx.delete(polisConversationConfigTable);
            await tx.delete(projectTable);
            await tx.delete(userTable);

            const now = new Date();
            await tx
                .insert(userTable)
                .values({ id: USER_ID, username: "export-author" });
            await tx.insert(projectTable).overridingSystemValue().values({
                id: 1,
                slug: "export-project",
                title: "Test project",
                directoryVisibility: "listed",
            });
            await tx
                .insert(polisConversationConfigTable)
                .overridingSystemValue()
                .values({ id: 1 });
            await tx.insert(conversationTable).overridingSystemValue().values({
                id: 1,
                slugId: "convo01",
                projectId: 1,
                polisConfigId: 1,
            });
            await tx
                .insert(conversationContentTable)
                .overridingSystemValue()
                .values({
                    id: 1,
                    conversationId: 1,
                    title: "Test conversation",
                });
            await tx
                .update(conversationTable)
                .set({ currentContentId: 1 })
                .where(eq(conversationTable.id, 1));
            await tx
                .insert(conversationExportGenerationTable)
                .overridingSystemValue()
                .values({
                    id: 1,
                    slugId: "gener01",
                    conversationId: 1,
                    collectingEndsAt: new Date(now.getTime() - 1000),
                    createdAt: now,
                });
            await tx
                .insert(conversationExportArtifactTable)
                .overridingSystemValue()
                .values([
                    {
                        id: 1,
                        generationId: 1,
                        fileType: "comments",
                        audience: "redacted",
                        fileName: "comments.csv",
                    },
                    {
                        id: 2,
                        generationId: 1,
                        fileType: "bundle",
                        audience: "redacted",
                        fileName: "bundle.zip",
                    },
                ]);
            await tx
                .insert(conversationExportRequestTable)
                .overridingSystemValue()
                .values({
                    id: 1,
                    slugId: "export1",
                    conversationId: 1,
                    generationId: 1,
                    userId: USER_ID,
                    expiresAt: new Date(now.getTime() + 86_400_000),
                    createdAt: now,
                });
            await tx
                .insert(conversationExportRequestFileTable)
                .overridingSystemValue()
                .values([
                    {
                        id: 1,
                        requestId: 1,
                        artifactId: 1,
                        fileType: "comments",
                        audience: "redacted",
                    },
                    {
                        id: 2,
                        requestId: 1,
                        artifactId: 2,
                        fileType: "bundle",
                        audience: "redacted",
                    },
                ]);
        });
    }

    async function runWorker(): Promise<void> {
        const worker = createExportWorker({ db });
        await worker.shutdown();
    }

    async function getGeneration() {
        const [generation] = await primary
            .select({
                status: conversationExportGenerationTable.status,
                attempts: conversationExportGenerationTable.attempts,
                failureReason: conversationExportGenerationTable.failureReason,
            })
            .from(conversationExportGenerationTable);
        return generation;
    }

    it("completes in one attempt and serves completion while replica rows remain queued", async () => {
        await runWorker();
        expect(await getGeneration()).toMatchObject({
            status: "completed",
            attempts: 1,
        });
        expect(mocks.generate).toHaveBeenCalledOnce();
        expect(mocks.upload).toHaveBeenCalledTimes(2);
        expect(mocks.download).not.toHaveBeenCalled();
        expect(mocks.notify).toHaveBeenCalledOnce();
        expect(
            await replica
                .select({ status: conversationExportArtifactTable.status })
                .from(conversationExportArtifactTable),
        ).toEqual([{ status: "queued" }, { status: "queued" }]);
        const status = await getConversationExportStatus({
            db,
            exportSlugId: "export1",
            userId: USER_ID,
        });
        expect(status.status).toBe("completed");
        if (status.status !== "completed") {
            throw new Error("Expected completed export status");
        }
        expect(status.files).toHaveLength(1);
        expect(status.bundle).toBeDefined();
        expect(
            await getConversationExportHistory({
                db,
                conversationSlugId: "convo01",
                userId: USER_ID,
            }),
        ).toEqual([expect.objectContaining({ status: "completed" })]);
        expect(
            await getExportReadinessForConversation({
                db,
                conversationSlugId: "convo01",
                userId: USER_ID,
            }),
        ).toMatchObject({ status: "cooldown" });
    });

    it("retries a failed ZIP using the published CSV without regenerating changed data", async () => {
        mocks.upload
            .mockImplementationOnce(({ s3Key, buffer }) => {
                storedObjects.set(s3Key, buffer);
                return Promise.resolve();
            })
            .mockRejectedValueOnce(new Error("Temporary S3 failure"));
        await runWorker();
        expect(await getGeneration()).toMatchObject({
            status: "queued",
            attempts: 1,
        });
        expect(mocks.notify).not.toHaveBeenCalled();
        mocks.generate.mockResolvedValue({
            csvBuffer: Buffer.from("Changed data"),
            recordCount: 10,
        });
        await primary
            .update(conversationExportGenerationTable)
            .set({ nextAttemptAt: new Date(0) })
            .where(eq(conversationExportGenerationTable.id, 1));

        await runWorker();
        expect(await getGeneration()).toEqual({
            status: "completed",
            attempts: 2,
            failureReason: null,
        });
        expect(mocks.generate).toHaveBeenCalledOnce();
        expect(mocks.download).toHaveBeenCalledOnce();
        const zipBuffer = storedObjects.get(
            "exports/conversations/convo01/gener01/redacted/bundle.zip",
        );
        if (zipBuffer === undefined)
            throw new Error("Expected a published ZIP");
        const zip = await JSZip.loadAsync(zipBuffer);
        const csv = zip.file("comments.csv");
        expect(await csv?.async("nodebuffer")).toEqual(ORIGINAL_CSV);
    });

    it("regenerates partially failed CSVs together to preserve cross-file participant IDs", async () => {
        await primary
            .update(conversationExportArtifactTable)
            .set({ audience: "owner" })
            .where(eq(conversationExportArtifactTable.id, 2));
        await primary
            .insert(conversationExportArtifactTable)
            .overridingSystemValue()
            .values({
                id: 3,
                generationId: 1,
                fileType: "survey_participant_responses",
                audience: "owner",
                fileName: "survey_participant_responses.csv",
            });
        let generatedFileCount = 0;
        mocks.generate.mockImplementation(({ participantMap }) => {
            generatedFileCount += 1;
            if (generatedFileCount === 2)
                throw new Error("Partial CSV failure");
            const rows =
                generatedFileCount % 2 === 1
                    ? ["author-a", "author-b"]
                    : ["author-b"];
            const csvBuffer = Buffer.from(
                rows
                    .map(
                        (userId) =>
                            `${userId},${String(participantMap.getOrCreateExportParticipantId({ userId }))}`,
                    )
                    .join("\n"),
            );
            return Promise.resolve({ csvBuffer, recordCount: rows.length });
        });
        await runWorker();
        expect(await getGeneration()).toMatchObject({ status: "queued" });
        await primary
            .update(conversationExportGenerationTable)
            .set({ nextAttemptAt: new Date(0) })
            .where(eq(conversationExportGenerationTable.id, 1));
        await runWorker();
        expect(await getGeneration()).toMatchObject({ status: "completed" });
        expect(mocks.generate).toHaveBeenCalledTimes(4);
        expect(mocks.download).not.toHaveBeenCalled();
        const zipBuffer = storedObjects.get(
            "exports/conversations/convo01/gener01/owner/bundle.zip",
        );
        if (zipBuffer === undefined) throw new Error("Expected owner bundle");
        const zip = await JSZip.loadAsync(zipBuffer);
        expect(await zip.file("comments.csv")?.async("string")).toContain(
            "author-b,1",
        );
        expect(
            await zip.file("survey_participant_responses.csv")?.async("string"),
        ).toBe("author-b,1");
    });

    it("keeps owner-only CSVs out of the redacted ZIP", async () => {
        await primary
            .insert(conversationExportArtifactTable)
            .overridingSystemValue()
            .values([
                {
                    id: 3,
                    generationId: 1,
                    fileType: "survey_full_aggregates",
                    audience: "owner",
                    fileName: "survey_full_aggregates.csv",
                },
                {
                    id: 4,
                    generationId: 1,
                    fileType: "bundle",
                    audience: "owner",
                    fileName: "bundle.zip",
                },
            ]);
        await runWorker();
        for (const audience of ["redacted", "owner"]) {
            const zipBuffer = storedObjects.get(
                `exports/conversations/convo01/gener01/${audience}/bundle.zip`,
            );
            if (zipBuffer === undefined)
                throw new Error(`Expected ${audience} bundle`);
            const zip = await JSZip.loadAsync(zipBuffer);
            expect(Object.keys(zip.files)).toEqual(
                audience === "owner"
                    ? ["comments.csv", "survey_full_aggregates.csv"]
                    : ["comments.csv"],
            );
        }
    });

    it("expires and removes unreferenced artifacts despite replica requests still appearing active", async () => {
        await runWorker();
        await primary
            .update(conversationExportRequestTable)
            .set({ expiresAt: new Date(0) })
            .where(eq(conversationExportRequestTable.id, 1));
        await cleanupExpiredExports({ db });
        expect(mocks.delete).toHaveBeenCalledTimes(2);
        expect(
            await primary
                .select({ s3Key: conversationExportArtifactTable.s3Key })
                .from(conversationExportArtifactTable),
        ).toEqual([{ s3Key: null }, { s3Key: null }]);
        expect(
            await getConversationExportStatus({
                db,
                exportSlugId: "export1",
                userId: USER_ID,
            }),
        ).toMatchObject({ status: "expired" });
    });

    it("retains artifacts while another live request still references the generation", async () => {
        await runWorker();
        await primary
            .insert(conversationExportRequestTable)
            .overridingSystemValue()
            .values({
                id: 2,
                slugId: "export2",
                conversationId: 1,
                generationId: 1,
                userId: USER_ID,
                status: "completed",
                expiresAt: new Date(Date.now() + 86_400_000),
            });
        await primary
            .update(conversationExportRequestTable)
            .set({ expiresAt: new Date(0) })
            .where(eq(conversationExportRequestTable.id, 1));
        await cleanupExpiredExports({ db });
        expect(mocks.delete).not.toHaveBeenCalled();
        const artifacts = await primary
            .select({ s3Key: conversationExportArtifactTable.s3Key })
            .from(conversationExportArtifactTable);
        expect(artifacts).toHaveLength(2);
        for (const artifact of artifacts) {
            expect(artifact.s3Key).toBeTypeOf("string");
        }
    });

    it("does not fail a completed generation when stale cleanup sees an old processing row", async () => {
        await runWorker();
        await replica
            .update(conversationExportGenerationTable)
            .set({ status: "processing", heartbeatAt: new Date(0) })
            .where(eq(conversationExportGenerationTable.id, 1));
        expect(
            await cleanupStaleExports({ db, staleThresholdMs: 60_000 }),
        ).toBe(0);
        expect(await getGeneration()).toMatchObject({
            status: "completed",
            failureReason: null,
        });
    });

    it("rechecks heartbeat freshness before timing out a stale replica candidate", async () => {
        await primary
            .update(conversationExportGenerationTable)
            .set({ status: "processing", heartbeatAt: new Date() });
        await replica
            .update(conversationExportGenerationTable)
            .set({ status: "processing", heartbeatAt: new Date(0) });
        expect(
            await cleanupStaleExports({ db, staleThresholdMs: 60_000 }),
        ).toBe(0);
        expect(await getGeneration()).toMatchObject({ status: "processing" });
    });

    it("does not complete a worker attempt that was timed out during its upload", async () => {
        mocks.upload.mockImplementationOnce(async ({ s3Key, buffer }) => {
            storedObjects.set(s3Key, buffer);
            await primary
                .update(conversationExportGenerationTable)
                .set({ status: "failed", failureReason: "timeout" });
            await primary
                .update(conversationExportRequestTable)
                .set({ status: "failed", failureReason: "timeout" });
        });
        await runWorker();
        expect(await getGeneration()).toMatchObject({
            status: "failed",
            failureReason: "timeout",
        });
        expect(mocks.notify).not.toHaveBeenCalled();
        expect(
            await getConversationExportStatus({
                db,
                exportSlugId: "export1",
                userId: USER_ID,
            }),
        ).toMatchObject({ status: "failed", failureReason: "timeout" });
    });

    it("does not requeue a failed attempt after its generation was deleted", async () => {
        mocks.upload.mockImplementationOnce(async () => {
            await primary
                .update(conversationExportGenerationTable)
                .set({ status: "failed", failureReason: "processing_error" });
            await primary
                .update(conversationExportRequestTable)
                .set({ deletedAt: new Date() });
            throw new Error("S3 failure after deletion");
        });
        await runWorker();
        expect(await getGeneration()).toMatchObject({
            status: "failed",
            attempts: 1,
        });
        expect(mocks.notify).not.toHaveBeenCalled();
    });

    it("rejects another user's export before signing any download", async () => {
        await runWorker();
        await expect(
            getConversationExportStatus({
                db,
                exportSlugId: "export1",
                userId: "00000000-0000-4000-8000-000000000002",
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(mocks.sign).not.toHaveBeenCalled();
    });

    it("hides owner-only files and bundles when the requester's permission is revoked", async () => {
        await runWorker();
        await primary
            .insert(conversationExportArtifactTable)
            .overridingSystemValue()
            .values([
                {
                    id: 3,
                    generationId: 1,
                    fileType: "survey_full_aggregates",
                    audience: "owner",
                    status: "completed",
                    fileName: "survey_full_aggregates.csv",
                    fileSize: 10,
                    recordCount: 1,
                    s3Key: "private/survey.csv",
                },
                {
                    id: 4,
                    generationId: 1,
                    fileType: "bundle",
                    audience: "owner",
                    status: "completed",
                    fileName: "bundle.zip",
                    fileSize: 20,
                    recordCount: 2,
                    s3Key: "private/bundle.zip",
                },
            ]);
        await primary
            .update(conversationExportRequestFileTable)
            .set({ artifactId: 4, audience: "owner" })
            .where(eq(conversationExportRequestFileTable.id, 2));
        await primary
            .insert(conversationExportRequestFileTable)
            .overridingSystemValue()
            .values({
                id: 3,
                requestId: 1,
                artifactId: 3,
                fileType: "survey_full_aggregates",
                audience: "owner",
            });

        mocks.access.mockResolvedValue("owner");
        const ownerStatus = await getConversationExportStatus({
            db,
            exportSlugId: "export1",
            userId: USER_ID,
        });
        if (ownerStatus.status !== "completed")
            throw new Error("Expected completed owner export");
        expect(ownerStatus.files.map((file) => file.fileType)).toEqual([
            "comments",
            "survey_full_aggregates",
        ]);
        expect(ownerStatus.bundle).toBeDefined();

        mocks.access.mockResolvedValue("public");
        mocks.sign.mockClear();
        expect(
            await getConversationExportStatus({
                db,
                exportSlugId: "export1",
                userId: USER_ID,
            }),
        ).toMatchObject({
            status: "completed",
            files: [expect.objectContaining({ fileType: "comments" })],
            bundle: undefined,
        });
        expect(mocks.sign).toHaveBeenCalledOnce();
        expect(mocks.sign.mock.calls.map(([params]) => params.s3Key)).toEqual([
            "exports/conversations/convo01/gener01/redacted/comments.csv",
        ]);
    });
});
