import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    premiumFeatureEntitlementTable,
    projectContactTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "../src/shared-backend/schema.js";
import {
    hasProjectParticipantContactEmail,
    lockConversationCreateTarget,
    lockProjectParticipantContactEmail,
} from "../src/service/projectAccess.js";
import { lockConversationEmailUpdateProject } from "../src/service/conversationEmailUpdateProjectLock.js";
import { hasScopedProjectCapability } from "../src/service/organizationAuthorization.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-26T12:00:00.000Z");

describe("conversation Email Update creation authorization", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let organizationId: number;
    let projectId: number;
    let entitlementId: number;
    let contactId: number;

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
        db = drizzle({ client: sqlClient });
        await db.execute(
            sql.raw(
                readDbFixtureSql(
                    "conversation-email-update-creation-authorization.sql",
                ),
            ),
        );
    }, 120_000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.delete(projectContactTable);
        await db.delete(projectOrganizationOwnershipTable);
        await db.delete(projectTable);
        await db.delete(premiumFeatureEntitlementTable);
        await db.delete(organizationMembershipAllProjectCapabilityTable);
        await db.delete(organizationMembershipTable);
        await db.delete(organizationTable);
        await db.delete(userTable);
        await seedAuthorizedProject();
    });

    async function seedAuthorizedProject(): Promise<void> {
        await db.insert(userTable).values({ id: USER_ID, username: "author" });
        const organizations = await db
            .insert(organizationTable)
            .values({
                slug: "test-organization",
                displayName: "Test Organization",
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        const organization = organizations.at(0);
        if (organization === undefined) {
            throw new Error("Failed to seed organization");
        }
        organizationId = organization.id;
        const memberships = await db
            .insert(organizationMembershipTable)
            .values({
                userId: USER_ID,
                organizationId: organization.id,
                role: "admin",
            })
            .returning({ id: organizationMembershipTable.id });
        const membership = memberships.at(0);
        if (membership === undefined) {
            throw new Error("Failed to seed organization membership");
        }
        const projects = await db
            .insert(projectTable)
            .values({
                slug: "test-project",
                title: "Test Project",
                directoryVisibility: "listed",
            })
            .returning({ id: projectTable.id });
        const project = projects.at(0);
        if (project === undefined) {
            throw new Error("Failed to seed project");
        }
        projectId = project.id;
        const [, capabilities, entitlements, contacts] = await Promise.all([
            db.insert(projectOrganizationOwnershipTable).values({
                projectId: project.id,
                organizationId: organization.id,
            }),
            db
                .insert(organizationMembershipAllProjectCapabilityTable)
                .values({
                    organizationMembershipId: membership.id,
                    capability: "conversation_email_update",
                    grantedByUserId: USER_ID,
                })
                .returning({
                    id: organizationMembershipAllProjectCapabilityTable.id,
                }),
            db
                .insert(premiumFeatureEntitlementTable)
                .values({
                    organizationId: organization.id,
                    feature: "conversation_email_update",
                    startsAt: new Date("2026-08-01T00:00:00.000Z"),
                    createdByUserId: USER_ID,
                    updatedByUserId: USER_ID,
                })
                .returning({ id: premiumFeatureEntitlementTable.id }),
            db
                .insert(projectContactTable)
                .values({
                    projectId: project.id,
                    firstName: "Participant contact",
                    email: "updates@example.com",
                })
                .returning({ id: projectContactTable.id }),
        ]);
        const capability = capabilities.at(0);
        const entitlement = entitlements.at(0);
        const contact = contacts.at(0);
        if (
            capability === undefined ||
            entitlement === undefined ||
            contact === undefined
        ) {
            throw new Error("Failed to seed Email Update authorization");
        }
        entitlementId = entitlement.id;
        contactId = contact.id;
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values({
                organizationMembershipId: membership.id,
                capability: "conversation_create",
            });
    }

    it("accepts active authorization and an email contact", async () => {
        const authorized = await hasScopedProjectCapability({
            db,
            userId: USER_ID,
            target: { kind: "project", projectSlug: "test-project" },
            capability: "conversation_email_update",
        });
        await expect(
            db.transaction(async (tx) => {
                const projectLocked = await lockConversationEmailUpdateProject({
                    db: tx,
                    projectId,
                });
                return { projectLocked, authorized };
            }),
        ).resolves.toEqual({ projectLocked: true, authorized: true });
        await expect(
            hasProjectParticipantContactEmail({ db, projectId }),
        ).resolves.toBe(true);
    });

    it("coordinates concurrent creation without membership authorization locks", async () => {
        const otherUserId = "00000000-0000-4000-8000-000000000002";
        await db
            .insert(userTable)
            .values({ id: otherUserId, username: "other-author" });
        const otherMembership = (
            await db
                .insert(organizationMembershipTable)
                .values({ userId: otherUserId, organizationId, role: "admin" })
                .returning()
        ).at(0);
        if (otherMembership === undefined)
            throw new Error("Missing second membership");
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: otherMembership.id,
                    capability: "conversation_create",
                },
                {
                    organizationMembershipId: otherMembership.id,
                    capability: "conversation_email_update",
                },
            ]);
        const otherProject = (
            await db
                .insert(projectTable)
                .values({
                    slug: "other-project",
                    title: "Other",
                    directoryVisibility: "listed",
                })
                .returning({ id: projectTable.id })
        ).at(0);
        if (otherProject === undefined)
            throw new Error("Missing second project");
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId: otherProject.id, organizationId });
        let arrived = 0;
        let release = () => {};
        const ready = new Promise<void>((resolve) => {
            release = resolve;
        });
        const results = await Promise.allSettled(
            [
                { id: projectId, userId: USER_ID },
                { id: otherProject.id, userId: otherUserId },
            ].map(async ({ id, userId }) => {
                return await db.transaction(async (tx) => {
                    await tx.execute(sql`SET LOCAL lock_timeout = '500ms'`);
                    expect(
                        await lockConversationCreateTarget({
                            db: tx,
                            userId,
                            target: { projectId: id, organizationId },
                        }),
                    ).toBe(true);
                    arrived += 1;
                    if (arrived === 2) release();
                    await ready;
                    return true;
                });
            }),
        );
        expect(results).toEqual([
            { status: "fulfilled", value: true },
            { status: "fulfilled", value: true },
        ]);
    });

    it("rejects revoked authorization and a contact without email", async () => {
        await db
            .update(organizationMembershipTable)
            .set({ role: "moderator" })
            .where(eq(organizationMembershipTable.userId, USER_ID));
        await db
            .update(projectContactTable)
            .set({ email: null, websiteUrl: "https://example.com" })
            .where(eq(projectContactTable.id, contactId));

        await expect(
            hasScopedProjectCapability({
                db,
                userId: USER_ID,
                target: { kind: "project", projectSlug: "test-project" },
                capability: "conversation_email_update",
            }),
        ).resolves.toBe(false);
        await expect(
            hasProjectParticipantContactEmail({ db, projectId }),
        ).resolves.toBe(false);
    });

    it("rejects a deleted project before creation", async () => {
        await db
            .update(projectTable)
            .set({ deletedAt: NOW })
            .where(eq(projectTable.id, projectId));

        await expect(
            db.transaction(async (tx) => {
                return await lockConversationEmailUpdateProject({
                    db: tx,
                    projectId,
                });
            }),
        ).resolves.toBe(false);
    });

    it("does not block role or entitlement revocation behind contact-integrity work", async () => {
        expect(
            await hasScopedProjectCapability({
                db,
                userId: USER_ID,
                target: { kind: "project", projectSlug: "test-project" },
                capability: "conversation_email_update",
            }),
        ).toBe(true);
        let releaseAuthorization: (() => void) | undefined;
        const holdAuthorization = new Promise<void>((resolve) => {
            releaseAuthorization = resolve;
        });
        let reportLocked: (() => void) | undefined;
        const locked = new Promise<void>((resolve) => {
            reportLocked = resolve;
        });
        const authorizationTransaction = db.transaction(async (tx) => {
            const contactLocked = await lockProjectParticipantContactEmail({
                db: tx,
                projectId,
            });
            if (!contactLocked) {
                throw new Error("Expected active participant contact email");
            }
            reportLocked?.();
            await holdAuthorization;
        });

        await locked;
        const blockedRevocations = [
            db.transaction(async (tx) => {
                await tx.execute(sql`SET LOCAL lock_timeout = '100ms'`);
                await tx
                    .update(organizationMembershipTable)
                    .set({ role: "moderator" })
                    .where(eq(organizationMembershipTable.userId, USER_ID));
            }),
            db.transaction(async (tx) => {
                await tx.execute(sql`SET LOCAL lock_timeout = '100ms'`);
                await tx
                    .update(premiumFeatureEntitlementTable)
                    .set({ revokedAt: NOW })
                    .where(
                        eq(premiumFeatureEntitlementTable.id, entitlementId),
                    );
            }),
            db.transaction(async (tx) => {
                await tx.execute(sql`SET LOCAL lock_timeout = '100ms'`);
                await tx
                    .update(projectContactTable)
                    .set({ deletedAt: NOW })
                    .where(eq(projectContactTable.id, contactId));
            }),
        ];

        try {
            expect(
                (await Promise.allSettled(blockedRevocations)).map(
                    (result) => result.status,
                ),
            ).toEqual(["fulfilled", "fulfilled", "rejected"]);
        } finally {
            releaseAuthorization?.();
            await authorizationTransaction;
        }
    });
});
