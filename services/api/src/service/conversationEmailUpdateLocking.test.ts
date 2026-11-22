import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    organizationMembershipTable,
    organizationTable,
    userTable,
} from "@/shared-backend/schema.js";
import { readDbFixtureSql } from "../../tests/dbFixture.js";
import { lockRequiredOwnerUserIds } from "./conversationEmailUpdate.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const owner = "00000000-0000-4000-8000-000000000001";
const moderator = "00000000-0000-4000-8000-000000000002";
const newMember = "00000000-0000-4000-8000-000000000003";
let container: StartedTestContainer | undefined;
let client: postgres.Sql | undefined;
let db: PostgresJsDatabase;

beforeAll(async () => {
    container = await new GenericContainer("postgres:16-alpine")
        .withEnvironment({ POSTGRES_PASSWORD: "postgres" })
        .withExposedPorts(5432)
        .start();
    client = postgres({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        database: "postgres",
        username: "postgres",
        password: "postgres",
    });
    db = drizzle({ client });
    await client.unsafe(
        readDbFixtureSql(
            "conversation-email-update-creation-authorization.sql",
        ),
    );
    // The generated fixture omits foreign keys. Inserts take the parent lock in production.
    await db.execute(sql`
        ALTER TABLE organization_membership
        ADD FOREIGN KEY (organization_id) REFERENCES organization (id)
    `);
    await db.insert(userTable).values([
        { id: owner, username: "owner" },
        { id: moderator, username: "moderator" },
        { id: newMember, username: "new-member" },
    ]);
    await db.insert(organizationTable).values({
        slug: "owner-organization",
        displayName: "Owner organization",
        defaultLanguageCode: "en",
        directoryVisibility: "listed",
        isFullImagePath: false,
    });
    await db.insert(organizationMembershipTable).values([
        { userId: owner, organizationId: 1, role: "admin" },
        { userId: moderator, organizationId: 1, role: "moderator" },
    ]);
}, 60_000);

afterAll(async () => {
    await client?.end({ timeout: 5 });
    await container?.stop();
});

it("keeps the required owner set stable against new memberships and role changes", async () => {
    let reportLocked: ((ownerUserIds: string[]) => void) | undefined;
    const locked = new Promise<string[]>((resolve) => {
        reportLocked = resolve;
    });
    let releaseLocks: (() => void) | undefined;
    const release = new Promise<void>((resolve) => {
        releaseLocks = resolve;
    });
    const lockingTransaction = db.transaction(async (tx) => {
        const ownerUserIds = await lockRequiredOwnerUserIds({
            db: tx,
            organizationIds: [1],
        });
        reportLocked?.(ownerUserIds);
        await release;
    });
    const mutations: ((tx: PostgresTransaction) => Promise<void>)[] = [
        async (tx) => {
            await tx.insert(organizationMembershipTable).values({
                userId: newMember,
                organizationId: 1,
                role: "manager",
            });
        },
        async (tx) => {
            await tx
                .update(organizationMembershipTable)
                .set({ role: "manager" })
                .where(eq(organizationMembershipTable.userId, moderator));
        },
    ];
    try {
        // An earlier transaction error must fail the test rather than hang the barrier.
        expect(await Promise.race([locked, lockingTransaction])).toEqual([
            owner,
        ]);
        await Promise.all(
            mutations.map(async (mutate) => {
                await expect(
                    db.transaction(async (tx) => {
                        await tx.execute(sql`SET LOCAL lock_timeout = '100ms'`);
                        await mutate(tx);
                    }),
                ).rejects.toMatchObject({ cause: { code: "55P03" } });
            }),
        );
    } finally {
        releaseLocks?.();
        await lockingTransaction;
    }
    for (const mutate of mutations) {
        await db.transaction(mutate);
    }
    expect(
        new Set(
            await db.transaction(
                async (tx) =>
                    await lockRequiredOwnerUserIds({
                        db: tx,
                        organizationIds: [1],
                    }),
            ),
        ),
    ).toEqual(new Set([owner, moderator, newMember]));
});
