import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
    notificationTable,
    notificationImportTable,
    notificationOpinionVoteTable,
    notificationNewOpinionTable,
    notificationExportTable,
} from "../src/shared-backend/schema.js";
import { createVoteNotifications } from "../src/service/notification.js";
import { readDbFixtureSql } from "./dbFixture.js";

vi.mock("../src/app.js", () => ({
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("../src/service/common.js", () => ({
    useCommonPost: () => ({ createCompactHtmlBody: (body: string) => body }),
}));

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

describe("notification persistence invariants", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    const userId = randomUUID();

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
            max: 4,
        });
        db = drizzle(client);
        await client.unsafe(readDbFixtureSql("notification-integrity.sql"));
        await client.unsafe(
            readFileSync(
                new URL(
                    "../database/flyway/V0096.1__enforce_notification_detail_integrity.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
        await client.unsafe(
            readFileSync(
                new URL(
                    "../database/flyway/V0096.2__avoid_redundant_notification_integrity_checks.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(notificationImportTable);
            await tx.delete(notificationExportTable);
            await tx.delete(notificationNewOpinionTable);
            await tx.delete(notificationOpinionVoteTable);
            await tx.delete(notificationTable);
        });
    });

    it("rejects incomplete and wrong-variant notifications at commit", async () => {
        await expect(
            db.insert(notificationTable).values({
                userId,
                slugId: "missing",
                notificationType: "import_started",
            }),
        ).rejects.toThrow();
        await expect(
            db.transaction(async (tx) => {
                const [parent] = await tx
                    .insert(notificationTable)
                    .values({
                        userId,
                        slugId: "wrong",
                        notificationType: "new_opinion",
                    })
                    .returning({ id: notificationTable.id });
                await tx
                    .insert(notificationImportTable)
                    .values({ notificationId: parent.id, importId: 1 });
            }),
        ).rejects.toThrow();
        expect(await db.select().from(notificationTable)).toHaveLength(0);
    });

    it("allows a complete import and a standalone security reminder", async () => {
        await db.transaction(async (tx) => {
            const [parent] = await tx
                .insert(notificationTable)
                .values({
                    userId,
                    slugId: "import",
                    notificationType: "import_started",
                })
                .returning({ id: notificationTable.id });
            await tx
                .insert(notificationImportTable)
                .values({ notificationId: parent.id, importId: 1 });
        });
        await db.insert(notificationTable).values({
            userId,
            slugId: "security",
            notificationType: "security_add_email",
            securityKey: "add_email",
        });
        expect(await db.select().from(notificationTable)).toHaveLength(2);
    });

    it("rejects duplicate details without leaving the parent", async () => {
        await expect(
            db.transaction(async (tx) => {
                const [parent] = await tx
                    .insert(notificationTable)
                    .values({
                        userId,
                        slugId: "double",
                        notificationType: "import_started",
                    })
                    .returning({ id: notificationTable.id });
                await tx.insert(notificationImportTable).values([
                    { notificationId: parent.id, importId: 1 },
                    { notificationId: parent.id, importId: 2 },
                ]);
            }),
        ).rejects.toThrow();
        expect(await db.select().from(notificationTable)).toHaveLength(0);
    });

    it("requires the cancellation reason instead of synthesizing it", async () => {
        await expect(
            db.transaction(async (tx) => {
                const [parent] = await tx
                    .insert(notificationTable)
                    .values({
                        userId,
                        slugId: "cancel",
                        notificationType: "export_cancelled",
                    })
                    .returning({ id: notificationTable.id });
                await tx.insert(notificationExportTable).values({
                    notificationId: parent.id,
                    exportSlugId: "export",
                    conversationId: 1,
                });
            }),
        ).rejects.toThrow();
    });

    it("rolls back the producer's parent insert when a vote detail fails", async () => {
        await createVoteNotifications({
            db,
            recipientUserIds: [userId],
            opinionId: 1,
            conversationId: 1,
            conversationSlugId: "conv",
            opinionSlugId: "opinion",
            opinionContent: "hello",
            numVotes: 0,
            isSeed: false,
        });
        expect(await db.select().from(notificationTable)).toHaveLength(0);
        expect(
            await db.select().from(notificationOpinionVoteTable),
        ).toHaveLength(0);
    });

    it("persists producer vote fields from the same notification content", async () => {
        await createVoteNotifications({
            db,
            recipientUserIds: [userId],
            opinionId: 1,
            conversationId: 1,
            conversationSlugId: "conv",
            opinionSlugId: "opinion",
            opinionContent: "hello",
            numVotes: 5,
            isSeed: true,
        });
        expect(await db.select().from(notificationTable)).toHaveLength(1);
        expect(
            await db
                .select({
                    numVotes: notificationOpinionVoteTable.numVotes,
                    isSeed: notificationOpinionVoteTable.isSeed,
                })
                .from(notificationOpinionVoteTable),
        ).toEqual([{ numVotes: 5, isSeed: true }]);
    });

    it("marks notifications read without executing detail integrity queries", async () => {
        await db.transaction(async (tx) => {
            const [parent] = await tx
                .insert(notificationTable)
                .values({
                    userId,
                    slugId: "read",
                    notificationType: "import_started",
                })
                .returning({ id: notificationTable.id });
            await tx.insert(notificationImportTable).values({
                notificationId: parent.id,
                importId: 1,
            });
        });
        await db.transaction(async (tx) => {
            await tx.execute(sql`SAVEPOINT integrity_probe`);
            // Instrument the database checker only inside this rollbackable probe.
            await tx.execute(sql`
                CREATE OR REPLACE FUNCTION check_notification_detail_integrity(notification_id_to_check integer)
                RETURNS void LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'Read updates must not query notification details';
                END;
                $$;
            `);
            await tx.update(notificationTable).set({ isRead: true });
            await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);
            expect(
                await tx
                    .select({ isRead: notificationTable.isRead })
                    .from(notificationTable),
            ).toEqual([{ isRead: true }]);
            await tx.execute(sql`ROLLBACK TO SAVEPOINT integrity_probe`);
        });
    });

    it("still validates changed variants and updated detail reasons", async () => {
        const parentId = await db.transaction(async (tx) => {
            const [parent] = await tx
                .insert(notificationTable)
                .values({
                    userId,
                    slugId: "cancel",
                    notificationType: "export_cancelled",
                })
                .returning({ id: notificationTable.id });
            await tx.insert(notificationExportTable).values({
                notificationId: parent.id,
                exportSlugId: "export",
                conversationId: 1,
                cancellationReason: "cooldown_active",
            });
            return parent.id;
        });
        await expect(
            db
                .update(notificationTable)
                .set({ notificationType: "import_completed" })
                .where(eq(notificationTable.id, parentId)),
        ).rejects.toThrow();
        await expect(
            db
                .update(notificationExportTable)
                .set({ cancellationReason: null })
                .where(eq(notificationExportTable.notificationId, parentId)),
        ).rejects.toThrow();
        expect(
            await db
                .select({
                    cancellationReason:
                        notificationExportTable.cancellationReason,
                })
                .from(notificationExportTable),
        ).toEqual([{ cancellationReason: "cooldown_active" }]);
    });
});
