import { eq, sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lockRequiredOwnerUserIds } from "./conversationEmailUpdate.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const OWNER_USER_ID = "00000000-0000-4000-8000-000000000001";
const PROSPECTIVE_OWNER_USER_ID = "00000000-0000-4000-8000-000000000002";
const NEW_MEMBER_USER_ID = "00000000-0000-4000-8000-000000000003";
const testOrganizationTable = pgTable("organization", {
    id: integer("id").primaryKey(),
    deletedAt: timestamp("deleted_at"),
});
const testOrganizationMembershipTable = pgTable("organization_membership", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id").notNull(),
    organizationId: integer("organization_id").notNull(),
    deletedAt: timestamp("deleted_at"),
});
const testOrganizationCapabilityTable = pgTable(
    "organization_membership_all_project_capability",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        organizationMembershipId: integer(
            "organization_membership_id",
        ).notNull(),
        capability: text("capability").notNull(),
        deletedAt: timestamp("deleted_at"),
    },
);

describe("required owner lock hierarchy", () => {
    let container: StartedTestContainer | undefined;
    let sqlClient: postgres.Sql | undefined;
    let db: PostgresJsDatabase;

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
            max: 8,
        });
        db = drizzle(sqlClient);
        await sqlClient.unsafe(`
            CREATE TABLE "organization" (
                "id" integer PRIMARY KEY,
                "deleted_at" timestamp
            );
            CREATE TABLE "organization_membership" (
                "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                "user_id" uuid NOT NULL,
                "organization_id" integer NOT NULL REFERENCES "organization" ("id"),
                "deleted_at" timestamp
            );
            CREATE TABLE "organization_membership_all_project_capability" (
                "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                "organization_membership_id" integer NOT NULL REFERENCES "organization_membership" ("id"),
                "capability" text NOT NULL,
                "deleted_at" timestamp
            );
        `);
        await db.insert(testOrganizationTable).values([{ id: 1 }, { id: 2 }]);
        await db.insert(testOrganizationMembershipTable).values([
            { userId: OWNER_USER_ID, organizationId: 1 },
            { userId: PROSPECTIVE_OWNER_USER_ID, organizationId: 2 },
            { userId: OWNER_USER_ID, organizationId: 2 },
        ]);
        await db.insert(testOrganizationCapabilityTable).values([
            {
                organizationMembershipId: 1,
                capability: "conversation_email_update",
            },
            {
                organizationMembershipId: 3,
                capability: "conversation_email_update",
            },
        ]);
    }, 60_000);

    afterAll(async () => {
        if (sqlClient !== undefined) await sqlClient.end();
        if (container !== undefined) await container.stop();
    });

    it("serializes membership and capability changes behind stable owner locks", async () => {
        let releaseLocks: (() => void) | undefined;
        const holdLocks = new Promise<void>((resolve) => {
            releaseLocks = resolve;
        });
        let reportLocked: ((ownerUserIds: string[]) => void) | undefined;
        const locked = new Promise<string[]>((resolve) => {
            reportLocked = resolve;
        });
        const lockingTransaction = db.transaction(async (transaction) => {
            const ownerUserIds = await lockRequiredOwnerUserIds({
                db: transaction,
                organizationIds: [2, 1, 2],
            });
            reportLocked?.(ownerUserIds);
            await holdLocks;
        });

        await expect(locked).resolves.toEqual([OWNER_USER_ID]);

        const insertMembership = async (): Promise<void> => {
            await db.insert(testOrganizationMembershipTable).values({
                userId: NEW_MEMBER_USER_ID,
                organizationId: 1,
            });
        };
        const softDeleteMembership = async (): Promise<void> => {
            await db
                .update(testOrganizationMembershipTable)
                .set({ deletedAt: new Date() })
                .where(eq(testOrganizationMembershipTable.id, 1));
        };
        const grantCapability = async (): Promise<void> => {
            await db.insert(testOrganizationCapabilityTable).values({
                organizationMembershipId: 2,
                capability: "conversation_email_update",
            });
        };
        const revokeCapability = async (): Promise<void> => {
            await db
                .update(testOrganizationCapabilityTable)
                .set({ deletedAt: new Date() })
                .where(eq(testOrganizationCapabilityTable.id, 1));
        };
        const blockedMutations = [
            db.transaction(async (transaction) => {
                await transaction.execute(
                    sql`SET LOCAL lock_timeout = '100ms'`,
                );
                await transaction
                    .insert(testOrganizationMembershipTable)
                    .values({
                        userId: NEW_MEMBER_USER_ID,
                        organizationId: 1,
                    });
            }),
            db.transaction(async (transaction) => {
                await transaction.execute(
                    sql`SET LOCAL lock_timeout = '100ms'`,
                );
                await transaction
                    .update(testOrganizationMembershipTable)
                    .set({ deletedAt: new Date() })
                    .where(eq(testOrganizationMembershipTable.id, 1));
            }),
            db.transaction(async (transaction) => {
                await transaction.execute(
                    sql`SET LOCAL lock_timeout = '100ms'`,
                );
                await transaction
                    .insert(testOrganizationCapabilityTable)
                    .values({
                        organizationMembershipId: 2,
                        capability: "conversation_email_update",
                    });
            }),
            db.transaction(async (transaction) => {
                await transaction.execute(
                    sql`SET LOCAL lock_timeout = '100ms'`,
                );
                await transaction
                    .update(testOrganizationCapabilityTable)
                    .set({ deletedAt: new Date() })
                    .where(eq(testOrganizationCapabilityTable.id, 1));
            }),
        ];

        try {
            await Promise.all(
                blockedMutations.map(async (mutation) => {
                    await expect(mutation).rejects.toThrow();
                }),
            );
        } finally {
            releaseLocks?.();
            await lockingTransaction;
        }

        await Promise.all([
            insertMembership(),
            softDeleteMembership(),
            grantCapability(),
            revokeCapability(),
        ]);
    });
});
