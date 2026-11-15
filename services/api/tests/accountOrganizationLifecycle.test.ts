import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../src/shared-backend/schema.js";
import { deleteUserAccount } from "../src/service/account.js";
import { unlinkAccountSharedProvenance } from "../src/shared-backend/deletionProvenance.js";
import { restoreAccountAfterVerification } from "../src/service/accountRecovery.js";
import {
    getOrCreateDefaultProjectForOrganization,
    getOrCreatePersonalOrganization,
} from "../src/service/projectAccess.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined)
        throw new Error("Missing account governance fixture");
    return row;
}

describe("account deletion organization governance", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "account_governance",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "account_governance",
        };
        client = postgres({ ...connection, onnotice: () => undefined });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (await pushSchema(schema, drizzlePg({ client: pool }))).apply();
        } finally {
            await pool.end();
        }
        await client.unsafe(
            await readFile(
                new URL(
                    "../scripts/prepare-organization-governance.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
    }, 120_000);
    beforeEach(async () => {
        await client.unsafe(
            'TRUNCATE "user", organization, project RESTART IDENTITY CASCADE',
        );
    });
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function account() {
        const userId = randomUUID();
        const email = `${userId}@example.com`;
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: userId.slice(0, 20) });
        await db
            .insert(schema.emailTable)
            .values({ userId, email, type: "primary" });
        await db.insert(schema.deviceTable).values({
            userId,
            didWrite: `did:key:zOriginal${userId}`,
            userAgent: "test",
            sessionExpiry: new Date(Date.now() + 86_400_000),
        });
        return { userId, email };
    }
    async function organization(userId: string) {
        return await db.transaction(async (tx) => {
            const row = first(
                await tx
                    .insert(schema.organizationTable)
                    .values({
                        slug: randomUUID(),
                        displayName: "Organization",
                        defaultLanguageCode: "en",
                        directoryVisibility: "listed",
                        isFullImagePath: false,
                    })
                    .returning(),
            );
            await tx
                .insert(schema.organizationMembershipTable)
                .values({ userId, organizationId: row.id, role: "admin" });
            return row;
        });
    }
    async function defaults(userId: string) {
        const personal = await getOrCreatePersonalOrganization({
            db,
            userId,
            autoProvisionedDefaultLanguage: "en",
        });
        const project = await getOrCreateDefaultProjectForOrganization({
            db,
            organizationId: personal.organizationId,
        });
        return { ...personal, ...project };
    }
    async function restore(fixture: Awaited<ReturnType<typeof account>>) {
        return await db.transaction(
            async (tx) =>
                await restoreAccountAfterVerification({
                    db: tx,
                    userId: fixture.userId,
                    didWrite: `did:key:zFresh${randomUUID()}`,
                    userAgent: "recovery",
                    sessionLifetimeDays: 30,
                    proof: { method: "email", email: fixture.email },
                }),
        );
    }

    it("refuses the last admin without changing the account, defaults, credentials or sessions", async () => {
        const actor = await account();
        await defaults(actor.userId);
        await organization(actor.userId);
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: false,
            reason: "last_active_organization_admin",
        });
        expect(first(await db.select().from(schema.userTable)).isDeleted).toBe(
            false,
        );
        expect(first(await db.select().from(schema.emailTable)).isDeleted).toBe(
            false,
        );
        expect(
            first(
                await db.select().from(schema.deviceTable),
            ).sessionExpiry.getTime(),
        ).toBeGreaterThan(Date.now());
        expect(
            (await db.select().from(schema.organizationTable)).every(
                (row) =>
                    row.deletedAt === null &&
                    row.retiredForAccountDeletionAt === null,
            ),
        ).toBe(true);
    });

    it.each([
        "deleted_account",
        "deleted_membership",
        "manager",
        "moderator",
    ] as const)(
        "does not count another %s as an active admin",
        async (kind) => {
            const actor = await account();
            const other = await account();
            const org = await organization(actor.userId);
            if (kind === "deleted_account")
                await db
                    .update(schema.userTable)
                    .set({ isDeleted: true })
                    .where(eq(schema.userTable.id, other.userId));
            await db.insert(schema.organizationMembershipTable).values({
                userId: other.userId,
                organizationId: org.id,
                role:
                    kind === "manager" || kind === "moderator" ? kind : "admin",
                deletedAt: kind === "deleted_membership" ? new Date() : null,
            });
            expect(
                await deleteUserAccount({ db, userId: actor.userId }),
            ).toEqual({
                success: false,
                reason: "last_active_organization_admin",
            });
        },
    );

    it("accepts an admin's deletion when another active admin remains, preserving shared resources", async () => {
        const actor = await account();
        const other = await account();
        const org = await organization(actor.userId);
        await db.insert(schema.organizationMembershipTable).values({
            userId: other.userId,
            organizationId: org.id,
            role: "admin",
        });
        const project = await getOrCreateDefaultProjectForOrganization({
            db,
            organizationId: org.id,
        });
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        expect(
            first(await db.select().from(schema.organizationTable)).deletedAt,
        ).toBeNull();
        expect(
            first(
                await db
                    .select()
                    .from(schema.projectTable)
                    .where(eq(schema.projectTable.id, project.projectId)),
            ).deletedAt,
        ).toBeNull();
    });

    it.each(["manager", "moderator"] as const)(
        "does not block an ordinary %s membership",
        async (role) => {
            const actor = await account();
            const other = await account();
            const org = await organization(other.userId);
            await db
                .insert(schema.organizationMembershipTable)
                .values({ userId: actor.userId, organizationId: org.id, role });
            expect(
                await deleteUserAccount({ db, userId: actor.userId }),
            ).toEqual({ success: true });
        },
    );

    it("retires and recovers only the default shells without deleting their content", async () => {
        const actor = await account();
        const personal = await defaults(actor.userId);
        const originalProject = first(
            await db.select().from(schema.projectTable),
        );
        const config = first(
            await db
                .insert(schema.polisConversationConfigTable)
                .values({})
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    projectId: personal.projectId,
                    polisConfigId: config.id,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "Retained conversation",
                })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        const deletedAccount = first(await db.select().from(schema.userTable));
        expect(
            first(await db.select().from(schema.organizationTable))
                .retiredForAccountDeletionAt,
        ).toEqual(deletedAccount.deletionRequestedAt);
        expect(
            first(await db.select().from(schema.projectTable))
                .retiredForAccountDeletionAt,
        ).toEqual(deletedAccount.deletionRequestedAt);
        expect(
            first(await db.select().from(schema.projectTable)).currentContentId,
        ).toBe(originalProject.currentContentId);
        // Historical parent-deletion cleanup must not reinterpret account-only
        // retirement as an independent project/content deletion.
        await client.unsafe(
            await readFile(
                new URL(
                    "../scripts/prepare-deletion-intent-backfill.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
        expect(
            first(await db.select().from(schema.conversationTable)),
        ).toMatchObject({ deletedAt: null, currentContentId: content.id });
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        expect(
            first(await db.select().from(schema.userTable)).deletionRequestedAt,
        ).toEqual(deletedAccount.deletionRequestedAt);
        expect(await restore(actor)).toMatchObject({ success: true });
        expect(
            first(await db.select().from(schema.organizationTable)),
        ).toMatchObject({
            id: personal.organizationId,
            deletedAt: null,
            retiredForAccountDeletionAt: null,
        });
        expect(
            first(await db.select().from(schema.projectTable)),
        ).toMatchObject({
            id: personal.projectId,
            deletedAt: null,
            retiredForAccountDeletionAt: null,
            currentContentId: originalProject.currentContentId,
        });
    });

    it("never restores independently deleted default shells", async () => {
        const actor = await account();
        const personal = await defaults(actor.userId);
        const earlier = new Date("2026-01-01T00:00:00Z");
        await db.transaction(async (tx) => {
            await tx
                .update(schema.projectTable)
                .set({ deletedAt: earlier })
                .where(eq(schema.projectTable.id, personal.projectId));
            await tx
                .update(schema.organizationTable)
                .set({ deletedAt: earlier })
                .where(
                    eq(schema.organizationTable.id, personal.organizationId),
                );
        });
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        expect(await restore(actor)).toMatchObject({ success: true });
        expect(
            first(await db.select().from(schema.organizationTable)).deletedAt,
        ).toEqual(earlier);
        expect(
            first(await db.select().from(schema.projectTable)).deletedAt,
        ).toEqual(earlier);
    });

    it("restores the default organization but not its independently deleted project", async () => {
        const actor = await account();
        const personal = await defaults(actor.userId);
        const earlier = new Date("2026-01-01T00:00:00Z");
        await db
            .update(schema.projectTable)
            .set({ deletedAt: earlier })
            .where(eq(schema.projectTable.id, personal.projectId));
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        expect(await restore(actor)).toMatchObject({ success: true });
        expect(
            first(await db.select().from(schema.organizationTable)).deletedAt,
        ).toBeNull();
        expect(
            first(await db.select().from(schema.projectTable)).deletedAt,
        ).toEqual(earlier);
    });

    it("does not restore defaults marked by a different deletion cycle", async () => {
        const actor = await account();
        const personal = await defaults(actor.userId);
        const earlier = new Date("2026-01-01T00:00:00.123Z");
        await db.transaction(async (tx) => {
            await tx
                .update(schema.projectTable)
                .set({
                    deletedAt: earlier,
                    retiredForAccountDeletionAt: earlier,
                })
                .where(eq(schema.projectTable.id, personal.projectId));
            await tx
                .update(schema.organizationTable)
                .set({
                    deletedAt: earlier,
                    retiredForAccountDeletionAt: earlier,
                })
                .where(
                    eq(schema.organizationTable.id, personal.organizationId),
                );
        });
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        expect(await restore(actor)).toMatchObject({ success: true });
        expect(
            first(await db.select().from(schema.organizationTable))
                .retiredForAccountDeletionAt,
        ).toEqual(earlier);
        expect(
            first(await db.select().from(schema.projectTable))
                .retiredForAccountDeletionAt,
        ).toEqual(earlier);
    });

    it("rejects retirement markers on active default resources", async () => {
        const actor = await account();
        const personal = await defaults(actor.userId);
        await expect(
            db
                .update(schema.organizationTable)
                .set({ retiredForAccountDeletionAt: new Date() })
                .where(
                    eq(schema.organizationTable.id, personal.organizationId),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "organization_account_retirement_check" },
        });
        await expect(
            db
                .update(schema.projectTable)
                .set({ retiredForAccountDeletionAt: new Date() })
                .where(eq(schema.projectTable.id, personal.projectId)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "project_account_retirement_check" },
        });
    });

    it("can unlink default-organization provenance after the recovery window has ended", async () => {
        const actor = await account();
        const personal = await defaults(actor.userId);
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        const requestedAt = new Date(Date.now() - 20 * 86_400_000);
        await db.transaction(async (tx) => {
            await tx
                .update(schema.organizationTable)
                .set({
                    deletedAt: requestedAt,
                    retiredForAccountDeletionAt: requestedAt,
                })
                .where(
                    eq(schema.organizationTable.id, personal.organizationId),
                );
            await tx
                .update(schema.projectTable)
                .set({
                    deletedAt: requestedAt,
                    retiredForAccountDeletionAt: requestedAt,
                })
                .where(eq(schema.projectTable.id, personal.projectId));
            await tx
                .update(schema.userTable)
                .set({
                    deletionRequestedAt: requestedAt,
                    recoverableUntil: new Date(
                        requestedAt.getTime() + 15 * 86_400_000,
                    ),
                    purgeStartedAt: new Date(),
                })
                .where(eq(schema.userTable.id, actor.userId));
        });
        expect(
            await db.transaction(
                async (tx) =>
                    await unlinkAccountSharedProvenance({
                        db: tx,
                        userId: actor.userId,
                    }),
            ),
        ).toMatchObject({ status: "progress" });
        const row = first(await db.select().from(schema.organizationTable));
        expect(row.autoProvisionedForUserId).toBeNull();
        expect(row.retiredForAccountDeletionAt).toBeNull();
        expect(row.deletedAt).not.toBeNull();
    });

    it.each(["organization", "project", "custom_project"] as const)(
        "does not treat a promoted or custom %s as a personal default",
        async (kind) => {
            const actor = await account();
            const personal = await defaults(actor.userId);
            if (kind === "organization")
                await db
                    .update(schema.organizationTable)
                    .set({ directoryVisibility: "listed" })
                    .where(
                        eq(
                            schema.organizationTable.id,
                            personal.organizationId,
                        ),
                    );
            else if (kind === "project")
                await db
                    .update(schema.projectTable)
                    .set({ directoryVisibility: "listed" })
                    .where(eq(schema.projectTable.id, personal.projectId));
            else
                await db.transaction(async (tx) => {
                    const project = first(
                        await tx
                            .insert(schema.projectTable)
                            .values({
                                slug: "custom",
                                title: "Custom",
                                directoryVisibility: "unlisted",
                            })
                            .returning(),
                    );
                    await tx
                        .insert(schema.projectOrganizationOwnershipTable)
                        .values({
                            projectId: project.id,
                            organizationId: personal.organizationId,
                        });
                });
            expect(
                await deleteUserAccount({ db, userId: actor.userId }),
            ).toEqual({
                success: false,
                reason: "last_active_organization_admin",
            });
            expect(
                first(await db.select().from(schema.userTable)).isDeleted,
            ).toBe(false);
        },
    );

    it("preserves a shared default project when another active owner remains", async () => {
        const actor = await account();
        const other = await account();
        const personal = await defaults(actor.userId);
        const org = await organization(other.userId);
        await db
            .insert(schema.projectOrganizationOwnershipTable)
            .values({ projectId: personal.projectId, organizationId: org.id });
        expect(await deleteUserAccount({ db, userId: actor.userId })).toEqual({
            success: true,
        });
        expect(
            first(await db.select().from(schema.projectTable)).deletedAt,
        ).toBeNull();
        expect(await restore(actor)).toMatchObject({ success: true });
        expect(
            first(await db.select().from(schema.projectTable))
                .retiredForAccountDeletionAt,
        ).toBeNull();
    });

    it("allows only one of two remaining admins to delete their account concurrently", async () => {
        const actor = await account();
        const other = await account();
        const org = await organization(actor.userId);
        await db.insert(schema.organizationMembershipTable).values({
            userId: other.userId,
            organizationId: org.id,
            role: "admin",
        });
        const outcomes = await Promise.all([
            deleteUserAccount({ db, userId: actor.userId }),
            deleteUserAccount({ db, userId: other.userId }),
        ]);
        expect(outcomes.filter((outcome) => outcome.success)).toHaveLength(1);
        expect(outcomes.filter((outcome) => !outcome.success)).toHaveLength(1);
    });
});
