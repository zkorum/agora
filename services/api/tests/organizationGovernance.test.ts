import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/shared-backend/schema.js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    getGovernanceConstraint,
    type GovernanceConstraint,
} from "../src/service/organizationIntegrity.js";
import { lockListedProjectOrganizations } from "../src/service/projectOwnership.js";
import {
    organizationMembershipTable,
    projectOrganizationOwnershipTable,
    userTable,
    organizationTable,
    projectTable,
    conversationTable,
    opinionTable,
    polisConversationConfigTable,
} from "../src/shared-backend/schema.js";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import { getProjectCapabilitiesById } from "../src/service/projectAccess.js";
import { getConversationViewAccessLevelForConversation } from "../src/service/conversationAccess.js";
import {
    addUserOrganizationMapping,
    removeUserOrganizationMapping,
} from "../src/service/administrator/organization.js";
import {
    requireOrganizationCapability,
    requireProjectCapabilityBySlug,
    hasConversationCapabilityBySlug,
    requireOpinionManagement,
    getManagementAccess,
    getProjectManagementPermissions,
} from "../src/service/organizationAuthorization.js";

function hasConstraint(constraint: GovernanceConstraint) {
    return (error: unknown) => getGovernanceConstraint(error) === constraint;
}

describe("organization roles and PostgreSQL governance integrity", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    const alice = randomUUID();
    const bob = randomUUID();
    const carol = randomUUID();

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "governance",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "governance",
        };
        client = postgres({ ...connection, max: 5, onnotice: () => undefined });
        db = drizzle({ client });
        // Only this disposable database receives the canonical schema/trigger contract.
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
        await client`TRUNCATE opinion, conversation, project_organization_ownership, project, organization_membership, organization, "user" RESTART IDENTITY CASCADE`;
        await db.transaction(async (tx) => {
            await tx.insert(userTable).values([
                { id: alice, username: "alice" },
                { id: bob, username: "bob" },
                { id: carol, username: "carol" },
            ]);
            await tx
                .insert(organizationTable)
                .overridingSystemValue()
                .values([
                    {
                        id: 1,
                        slug: "a",
                        displayName: "Organization",
                        defaultLanguageCode: "en",
                        directoryVisibility: "listed",
                        isFullImagePath: false,
                    },
                    {
                        id: 2,
                        slug: "b",
                        displayName: "Organization",
                        defaultLanguageCode: "en",
                        directoryVisibility: "listed",
                        isFullImagePath: false,
                    },
                ]);
            await tx.insert(organizationMembershipTable).values([
                { userId: alice, organizationId: 1, role: "admin" },
                { userId: bob, organizationId: 1, role: "manager" },
                { userId: carol, organizationId: 2, role: "admin" },
            ]);
            await tx
                .insert(projectTable)
                .overridingSystemValue()
                .values([
                    {
                        id: 1,
                        slug: "shared",
                        title: "Shared",
                        directoryVisibility: "listed",
                    },
                    {
                        id: 2,
                        slug: "a-only",
                        title: "A",
                        directoryVisibility: "listed",
                    },
                ]);
            await tx.insert(projectOrganizationOwnershipTable).values([
                { projectId: 1, organizationId: 1 },
                { projectId: 1, organizationId: 2 },
                { projectId: 2, organizationId: 1 },
            ]);
            const configs = await tx
                .insert(polisConversationConfigTable)
                .values({})
                .returning({ id: polisConversationConfigTable.id });
            const config = configs.at(0);
            if (config === undefined) throw new Error("Missing Polis fixture");
            await tx.insert(conversationTable).overridingSystemValue().values({
                id: 1,
                slugId: "activity",
                projectId: 1,
                polisConfigId: config.id,
            });
            await tx
                .insert(opinionTable)
                .overridingSystemValue()
                .values([
                    {
                        id: 1,
                        slugId: "personal",
                        conversationId: 1,
                        authorId: bob,
                        isSeed: false,
                    },
                    {
                        id: 2,
                        slugId: "seed",
                        conversationId: 1,
                        authorId: alice,
                        isSeed: true,
                    },
                ]);
        });
    });

    afterAll(async () => {
        if (client !== undefined) await client.end();
        if (container !== undefined) await container.stop();
    });

    it("rejects an active organization without an admin at the database boundary", async () => {
        await expect(
            db.insert(organizationTable).overridingSystemValue().values({
                id: 3,
                slug: "orphan",
                displayName: "Orphan",
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
                isFullImagePath: false,
            }),
        ).rejects.toSatisfy(
            hasConstraint("organization_active_admin_required"),
        );
    });

    it("backfills every unassigned historical role as admin without reviving memberships or overriding assigned roles", async () => {
        const backfill = await readFile(
            new URL(
                "../scripts/prepare-organization-role-backfill.sql",
                import.meta.url,
            ),
            "utf8",
        );
        await db.transaction(async (tx) => {
            await tx.execute(
                sql`ALTER TABLE organization_membership ALTER COLUMN role DROP NOT NULL`,
            );
            // This fixture deliberately exercises the historical nullable schema,
            // which the final canonical non-null role type cannot represent.
            await tx
                .update(organizationMembershipTable)
                .set({ role: sql`NULL` })
                .where(
                    inArray(organizationMembershipTable.userId, [alice, carol]),
                );
            await tx.insert(organizationMembershipTable).values({
                userId: bob,
                organizationId: 2,
                role: sql`NULL`,
                deletedAt: new Date(),
            });
            // Exercise the exact staged backfill source, not a reimplementation.
            await tx.execute(sql.raw(backfill));
            await tx.execute(sql.raw(backfill));
            await tx.execute(
                sql`ALTER TABLE organization_membership ALTER COLUMN role SET NOT NULL`,
            );
        });
        const rows = await db
            .select()
            .from(organizationMembershipTable)
            .orderBy(organizationMembershipTable.id);
        expect(rows.map((row) => row.role)).toEqual([
            "admin",
            "manager",
            "admin",
            "admin",
        ]);
        expect(rows.at(-1)?.deletedAt).not.toBeNull();
    });

    it.each(["demote", "soft-delete", "delete"])(
        "rejects removing the last admin by %s",
        async (operation) => {
            const mutation =
                operation === "demote"
                    ? db
                          .update(organizationMembershipTable)
                          .set({ role: "manager" })
                          .where(eq(organizationMembershipTable.userId, alice))
                    : operation === "soft-delete"
                      ? db
                            .update(organizationMembershipTable)
                            .set({ deletedAt: new Date() })
                            .where(
                                eq(organizationMembershipTable.userId, alice),
                            )
                      : db
                            .delete(organizationMembershipTable)
                            .where(
                                eq(organizationMembershipTable.userId, alice),
                            );
            await expect(mutation).rejects.toSatisfy(
                hasConstraint("organization_active_admin_required"),
            );
        },
    );

    it("rejects account deletion when the account is the last active admin", async () => {
        await expect(
            db
                .update(userTable)
                .set({ isDeleted: true })
                .where(eq(userTable.id, alice)),
        ).rejects.toSatisfy(
            hasConstraint("organization_active_admin_required"),
        );
    });

    it("permits atomic admin handover, even when demotion is written first", async () => {
        await db.transaction(async (tx) => {
            await tx
                .update(organizationMembershipTable)
                .set({ role: "moderator" })
                .where(eq(organizationMembershipTable.userId, alice));
            await tx
                .update(organizationMembershipTable)
                .set({ role: "admin" })
                .where(eq(organizationMembershipTable.userId, bob));
        });
        await expect(
            db
                .update(userTable)
                .set({ isDeleted: true })
                .where(eq(userTable.id, alice)),
        ).resolves.toBeDefined();
    });

    it("requires an active account, not merely an admin-labelled membership", async () => {
        await db
            .update(userTable)
            .set({ isDeleted: true })
            .where(eq(userTable.id, bob));
        await db
            .update(organizationMembershipTable)
            .set({ role: "admin" })
            .where(eq(organizationMembershipTable.userId, bob));
        await expect(
            db
                .update(organizationMembershipTable)
                .set({ role: "manager" })
                .where(eq(organizationMembershipTable.userId, alice)),
        ).rejects.toSatisfy(
            hasConstraint("organization_active_admin_required"),
        );
    });

    it("permits deleting the organization and its exclusively owned project together", async () => {
        await db.transaction(async (tx) => {
            await tx
                .update(organizationTable)
                .set({ deletedAt: new Date() })
                .where(eq(organizationTable.id, 1));
            await tx
                .update(organizationMembershipTable)
                .set({ deletedAt: new Date() })
                .where(eq(organizationMembershipTable.organizationId, 1));
            await tx
                .update(projectTable)
                .set({ deletedAt: new Date() })
                .where(eq(projectTable.id, 2));
        });
    });

    it("rejects an ownerless new project", async () => {
        await expect(
            db.insert(projectTable).overridingSystemValue().values({
                id: 3,
                slug: "orphan",
                title: "Orphan",
                directoryVisibility: "listed",
            }),
        ).rejects.toSatisfy(hasConstraint("project_active_owner_required"));
    });

    it("allows removing one co-owner, but never the last owner", async () => {
        await db
            .update(projectOrganizationOwnershipTable)
            .set({ deletedAt: new Date() })
            .where(
                and(
                    eq(projectOrganizationOwnershipTable.projectId, 1),
                    eq(projectOrganizationOwnershipTable.organizationId, 1),
                ),
            );
        await expect(
            db
                .update(projectOrganizationOwnershipTable)
                .set({ deletedAt: new Date() })
                .where(
                    and(
                        eq(projectOrganizationOwnershipTable.projectId, 1),
                        eq(projectOrganizationOwnershipTable.organizationId, 2),
                    ),
                ),
        ).rejects.toSatisfy(hasConstraint("project_active_owner_required"));
    });

    it("rejects deleting an organization that is the only active owner", async () => {
        await expect(
            db
                .update(organizationTable)
                .set({ deletedAt: new Date() })
                .where(eq(organizationTable.id, 1)),
        ).rejects.toSatisfy(hasConstraint("project_active_owner_required"));
    });

    it("rejects restoring organizations/projects without restoring their required relationships", async () => {
        await db.transaction(async (tx) => {
            await tx.insert(organizationTable).overridingSystemValue().values({
                id: 3,
                slug: "deleted",
                displayName: "Deleted",
                defaultLanguageCode: "en",
                deletedAt: new Date(),
                directoryVisibility: "listed",
                isFullImagePath: false,
            });
            await tx.insert(projectTable).overridingSystemValue().values({
                id: 3,
                slug: "deleted",
                title: "Deleted",
                deletedAt: new Date(),
                directoryVisibility: "listed",
            });
        });
        await expect(
            db
                .update(organizationTable)
                .set({ deletedAt: null })
                .where(eq(organizationTable.id, 3)),
        ).rejects.toSatisfy(
            hasConstraint("organization_active_admin_required"),
        );
        await expect(
            db
                .update(projectTable)
                .set({ deletedAt: null })
                .where(eq(projectTable.id, 3)),
        ).rejects.toSatisfy(hasConstraint("project_active_owner_required"));
    });

    it.each(["read committed", "repeatable read"] as const)(
        "prevents concurrent last-admin removals under %s",
        async (isolation) => {
            await db
                .update(organizationMembershipTable)
                .set({ role: "admin" })
                .where(eq(organizationMembershipTable.userId, bob));
            const outcomes = await Promise.allSettled(
                [alice, bob].map(async (userId) => {
                    await db.transaction(
                        async (tx) => {
                            await tx
                                .update(organizationMembershipTable)
                                .set({ role: "moderator" })
                                .where(
                                    eq(
                                        organizationMembershipTable.userId,
                                        userId,
                                    ),
                                );
                        },
                        { isolationLevel: isolation },
                    );
                }),
            );
            expect(
                outcomes.filter((outcome) => outcome.status === "fulfilled"),
            ).toHaveLength(1);
            const admins = await db
                .select({ id: organizationMembershipTable.id })
                .from(organizationMembershipTable)
                .innerJoin(
                    userTable,
                    eq(userTable.id, organizationMembershipTable.userId),
                )
                .where(
                    and(
                        eq(organizationMembershipTable.organizationId, 1),
                        eq(organizationMembershipTable.role, "admin"),
                        isNull(organizationMembershipTable.deletedAt),
                        eq(userTable.isDeleted, false),
                    ),
                );
            expect(admins).toHaveLength(1);
        },
    );

    it("prevents concurrent co-owner organization deletions", async () => {
        await db
            .update(projectTable)
            .set({ deletedAt: new Date() })
            .where(eq(projectTable.id, 2));
        const outcomes = await Promise.allSettled(
            [1, 2].map(async (id) => {
                await db
                    .update(organizationTable)
                    .set({ deletedAt: new Date() })
                    .where(eq(organizationTable.id, id));
            }),
        );
        expect(
            outcomes.filter((outcome) => outcome.status === "fulfilled"),
        ).toHaveLength(1);
    });

    it.each(["demote", "remove"] as const)(
        "serializes valid concurrent service membership changes without lock upgrades (%s)",
        async (operation) => {
            const db = drizzle({ client });
            await db
                .update(organizationMembershipTable)
                .set({ role: "admin" })
                .where(eq(organizationMembershipTable.userId, bob));
            await db
                .insert(organizationMembershipTable)
                .values({ userId: carol, organizationId: 1, role: "admin" });
            await Promise.all(
                ["alice", "bob"].map(async (username) => {
                    if (operation === "demote") {
                        await addUserOrganizationMapping({
                            db,
                            username,
                            organizationName: "a",
                            role: "moderator",
                        });
                    } else {
                        await removeUserOrganizationMapping({
                            db,
                            username,
                            organizationName: "a",
                        });
                    }
                }),
            );
            const admins = await db
                .select({ userId: organizationMembershipTable.userId })
                .from(organizationMembershipTable)
                .where(
                    and(
                        eq(organizationMembershipTable.organizationId, 1),
                        eq(organizationMembershipTable.role, "admin"),
                        isNull(organizationMembershipTable.deletedAt),
                    ),
                );
            expect(admins.map((row) => row.userId)).toEqual([carol]);
        },
    );

    it("locks removed and retained ownership parents before project work without SHARE upgrades", async () => {
        const db = drizzle({ client });
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId: 2, organizationId: 2 });
        await Promise.all(
            [1, 2].map(async (projectId) => {
                await db.transaction(async (tx) => {
                    expect(
                        await lockListedProjectOrganizations({
                            db: tx,
                            projectId,
                            organizationIds: [2],
                        }),
                    ).toBe(true);
                    await tx
                        .update(projectOrganizationOwnershipTable)
                        .set({ deletedAt: new Date() })
                        .where(
                            and(
                                eq(
                                    projectOrganizationOwnershipTable.projectId,
                                    projectId,
                                ),
                                eq(
                                    projectOrganizationOwnershipTable.organizationId,
                                    1,
                                ),
                            ),
                        );
                });
            }),
        );
        const remaining = await db
            .select({
                organizationId:
                    projectOrganizationOwnershipTable.organizationId,
            })
            .from(projectOrganizationOwnershipTable)
            .where(isNull(projectOrganizationOwnershipTable.deletedAt))
            .orderBy(projectOrganizationOwnershipTable.projectId);
        expect(remaining.map((row) => row.organizationId)).toEqual([2, 2]);
    });

    it("combines co-owner capabilities without granting access to the other organization", async () => {
        const db = drizzle({ client });
        const capabilities = await getProjectCapabilitiesById({
            db,
            userId: bob,
            projectIds: [1],
            requestedCapabilities: [
                "conversation_edit",
                "conversation_delete",
                "conversation_view_restricted_survey",
            ],
        });
        expect(capabilities.get(1)).toEqual(
            new Set([
                "conversation_edit",
                "conversation_view_restricted_survey",
            ]),
        );
        await expect(
            requireOrganizationCapability({
                db,
                userId: bob,
                organizationSlug: "b",
                capability: "organization_manage_members",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        await db
            .insert(organizationMembershipTable)
            .values({ userId: bob, organizationId: 2, role: "admin" });
        expect(
            (
                await requireProjectCapabilityBySlug({
                    db,
                    userId: bob,
                    projectSlug: "shared",
                    capability: "project_delete",
                })
            ).has("project_delete"),
        ).toBe(true);
    });

    it("allows managers to edit a co-owned project without letting them change its owners", async () => {
        const db = drizzle({ client });
        expect(
            (
                await requireProjectCapabilityBySlug({
                    db,
                    userId: bob,
                    projectSlug: "shared",
                    capability: "project_update",
                    ownerOrganizationSlugs: ["b", "a"],
                })
            ).has("project_manage_owner_organizations"),
        ).toBe(false);
        await expect(
            requireProjectCapabilityBySlug({
                db,
                userId: bob,
                projectSlug: "shared",
                capability: "project_update",
                ownerOrganizationSlugs: ["a"],
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("lets managers read restricted data without granting deletion", async () => {
        const db = drizzle({ client });
        expect(
            await getConversationViewAccessLevelForConversation({
                db,
                userId: bob,
                projectId: 1,
            }),
        ).toBe("owner");
        await expect(
            hasConversationCapabilityBySlug({
                db,
                userId: bob,
                conversationSlugId: "activity",
                capability: "conversation_edit",
            }),
        ).resolves.toBe(true);
        await expect(
            hasConversationCapabilityBySlug({
                db,
                userId: bob,
                conversationSlugId: "activity",
                capability: "conversation_delete",
            }),
        ).resolves.toBe(false);
        await expect(
            hasConversationCapabilityBySlug({
                db,
                userId: bob,
                conversationSlugId: "activity",
                capability: "conversation_view_restricted_survey",
            }),
        ).resolves.toBe(true);
        expect(
            (
                await requireProjectCapabilityBySlug({
                    db,
                    userId: bob,
                    projectSlug: "shared",
                    capability: "project_view_restricted_documents",
                })
            ).has("project_view_restricted_documents"),
        ).toBe(true);
        await db
            .update(organizationMembershipTable)
            .set({ role: "moderator" })
            .where(eq(organizationMembershipTable.userId, bob));
        expect(
            await getConversationViewAccessLevelForConversation({
                db,
                userId: bob,
                projectId: 1,
            }),
        ).toBe("public");
        await expect(
            hasConversationCapabilityBySlug({
                db,
                userId: bob,
                conversationSlugId: "activity",
                capability: "conversation_view_restricted_survey",
            }),
        ).resolves.toBe(false);
        await expect(
            requireProjectCapabilityBySlug({
                db,
                userId: bob,
                projectSlug: "shared",
                capability: "project_view_restricted_documents",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            hasConversationCapabilityBySlug({
                db,
                userId: undefined,
                conversationSlugId: "activity",
                capability: "conversation_view_restricted_survey",
            }),
        ).resolves.toBe(false);
    });

    it("authorizes personal authorship separately from organization seed management", async () => {
        const db = drizzle({ client });
        await expect(
            requireOpinionManagement({
                db,
                userId: bob,
                opinionSlugId: "personal",
            }),
        ).resolves.toBeUndefined();
        await expect(
            requireOpinionManagement({
                db,
                userId: alice,
                opinionSlugId: "personal",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            requireOpinionManagement({
                db,
                userId: bob,
                opinionSlugId: "seed",
            }),
        ).resolves.toBeUndefined();
        await db
            .update(organizationMembershipTable)
            .set({ role: "moderator" })
            .where(eq(organizationMembershipTable.userId, bob));
        await expect(
            requireOpinionManagement({
                db,
                userId: bob,
                opinionSlugId: "seed",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("maps wrapped database constraint errors without exposing arbitrary database messages", () => {
        expect(
            getGovernanceConstraint(
                new Error("query failed", {
                    cause: {
                        code: "23514",
                        constraint_name: "organization_active_admin_required",
                    },
                }),
            ),
        ).toBe("organization_active_admin_required");
        expect(
            getGovernanceConstraint({
                code: "23514",
                constraint_name: "unrelated",
                message: "private",
            }),
        ).toBeUndefined();
    });

    it("returns scoped navigation and resource permissions instead of requiring frontend role rules", async () => {
        const db = drizzle({ client });
        const access = await getManagementAccess({ db, userId: bob });
        expect(access.organizations).toEqual([
            { slug: "a", name: "Organization", role: "manager" },
        ]);
        expect(access.permissions).toEqual({
            canManageOrganizations: false,
            canManageProjects: true,
            canCreateProjects: true,
            canCreateOrganizations: false,
            canManagePremiumEntitlements: false,
        });
        const capabilities = await requireProjectCapabilityBySlug({
            db,
            userId: bob,
            projectSlug: "shared",
            capability: "project_update",
        });
        expect(getProjectManagementPermissions(capabilities)).toEqual({
            canUpdate: true,
            canDelete: false,
            canManageOwners: false,
            canConfigureEmailUpdates: true,
            canViewRestrictedDocuments: true,
        });
        await db
            .update(organizationMembershipTable)
            .set({ role: "moderator" })
            .where(eq(organizationMembershipTable.userId, bob));
        expect(
            (await getManagementAccess({ db, userId: bob })).permissions
                .canManageProjects,
        ).toBe(false);
    });

    it("preserves Agora-team tools independently of organization memberships", async () => {
        await db
            .update(userTable)
            .set({ isSiteOrgAdmin: true })
            .where(eq(userTable.id, bob));
        expect(
            (await getManagementAccess({ db: drizzle({ client }), userId: bob }))
                .permissions,
        ).toEqual({
            canManageOrganizations: true,
            canManageProjects: true,
            canCreateProjects: true,
            canCreateOrganizations: true,
            canManagePremiumEntitlements: true,
        });
    });
});
