import { readFile } from "node:fs/promises";
import { pushSchema } from "drizzle-kit/api-postgres";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { pgSchema, text } from "drizzle-orm/pg-core";
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
import * as schema from "../src/shared-backend/schema.js";
import {
    conversationContentTable,
    conversationTable,
    organizationMembershipTable,
    organizationTable,
    polisConversationConfigTable,
    premiumFeatureEntitlementTable,
    projectContactTable,
    projectContentTable,
    projectDocumentTable,
    projectOrganizationAttributionTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { deleteOrganization } from "../src/service/administrator/organization.js";
import {
    getAdminNoProjectEmailUpdates,
    updateAdminNoProjectEmailUpdates,
} from "../src/service/administrator/organizationEmailUpdates.js";
import {
    createProject,
    deleteProject,
    updateProject,
} from "../src/service/administrator/project.js";
import {
    getOrCreateDefaultProjectForOrganization,
    hasProjectCapability,
    lockConversationCreateTarget,
    resolveConversationCreateTargetResult,
} from "../src/service/projectAccess.js";
import { getGovernanceConstraint } from "../src/service/organizationIntegrity.js";
import { lockListedProjectOrganizations } from "../src/service/projectOwnership.js";
import { accessProjectDocument } from "../src/service/projectDocument.js";

vi.mock("../src/app.js", () => ({
    config: {},
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../src/service/s3.js", () => ({
    generatePresignedUrl: vi.fn(),
    uploadToS3: vi.fn(),
    deleteFromS3: vi.fn(),
}));

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const OWNER = "00000000-0000-4000-8000-000000000001";
const OTHER_OWNER = "00000000-0000-4000-8000-000000000002";
const NOW = new Date("2026-10-29T12:00:00Z");

// Read-only system-view mapping for concurrency instrumentation; no test DDL.
const pgStatActivity = pgSchema("pg_catalog")
    .view("pg_stat_activity", {
        databaseName: text("datname"),
        waitEventType: text("wait_event_type"),
    })
    .existing();

function hasOwnerConstraint(error: unknown): boolean {
    return getGovernanceConstraint(error) === "project_active_owner_required";
}

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing fixture row");
    return row;
}

function createBarrier() {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe("project and organization deletion", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    let organizationId: number;
    let otherOrganizationId: number;
    let projectId: number;
    let conversationId: number;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "agora_test",
        };
        client = postgres({ ...connection, max: 8, onnotice: () => undefined });
        db = drizzle({ client });
        // Install the canonical schema and PostgreSQL-only trigger contract in
        // this disposable container, never the development/production database.
        const pool = new Pool(connection);
        try {
            await (await pushSchema(schema, drizzlePg({ client: pool }))).apply();
        } finally {
            await pool.end();
        }
        await db.execute(
            sql.raw(
                await readFile(
                    new URL(
                        "../scripts/prepare-organization-governance.sql",
                        import.meta.url,
                    ),
                    "utf8",
                ),
            ),
        );
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE "user", organization, premium_feature_entitlement, organization_localization, organization_membership, organization_membership_capability, organization_membership_all_project_capability,
            project, project_content, project_content_translation, project_content_banner_localization, project_translation_target_language,
            project_organization_ownership, project_organization_attribution, project_external_organization, project_external_organization_localization, project_contact,
            project_document, project_document_file, project_document_localization, conversation, conversation_content, polis_conversation_config, conversation_translation_target_language, content_translation_work
            RESTART IDENTITY CASCADE`);
        // Required relationships must exist at commit, just as in real creation.
        await db.transaction(async (tx) => {
            await tx.insert(userTable).values([
                { id: OWNER, username: "owner" },
                { id: OTHER_OWNER, username: "other-owner" },
            ]);
            organizationId = first(
                await tx
                    .insert(organizationTable)
                    .values({
                        slug: "first-org",
                        displayName: "First",
                        defaultLanguageCode: "en",
                        directoryVisibility: "listed",
                        isFullImagePath: false,
                    })
                    .returning(),
            ).id;
            otherOrganizationId = first(
                await tx
                    .insert(organizationTable)
                    .values({
                        slug: "second-org",
                        displayName: "Second",
                        defaultLanguageCode: "en",
                        directoryVisibility: "listed",
                        isFullImagePath: false,
                    })
                    .returning(),
            ).id;
            for (const member of [
                { organizationId, userId: OWNER },
                { organizationId: otherOrganizationId, userId: OTHER_OWNER },
            ]) {
                await tx
                    .insert(organizationMembershipTable)
                    .values({ ...member, role: "admin" });
            }
            projectId = first(
                await tx
                    .insert(projectTable)
                    .values({
                        slug: "test-project",
                        title: "Test",
                        directoryVisibility: "listed",
                    })
                    .returning(),
            ).id;
            const content = first(
                await tx
                    .insert(projectContentTable)
                    .values({ projectId, title: "Test" })
                    .returning(),
            );
            await tx
                .update(projectTable)
                .set({ currentContentId: content.id })
                .where(eq(projectTable.id, projectId));
            await tx
                .insert(projectOrganizationOwnershipTable)
                .values({ projectId, organizationId });
            const config = first(
                await tx
                    .insert(polisConversationConfigTable)
                    .values({})
                    .returning(),
            );
            conversationId = first(
                await tx
                    .insert(conversationTable)
                    .values({
                        slugId: "conv1234",
                        projectId,
                        polisConfigId: config.id,
                    })
                    .returning(),
            ).id;
            const conversationContent = first(
                await tx
                    .insert(conversationContentTable)
                    .values({ conversationId, title: "Conversation" })
                    .returning(),
            );
            await tx
                .update(conversationTable)
                .set({ currentContentId: conversationContent.id })
                .where(eq(conversationTable.id, conversationId));
        });
    });

    async function addCoOwner(): Promise<void> {
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId, organizationId: otherOrganizationId });
    }

    async function activeOwners(): Promise<number[]> {
        const owners = await db
            .select({ id: organizationTable.id })
            .from(projectOrganizationOwnershipTable)
            .innerJoin(
                organizationTable,
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
            )
            .where(
                and(
                    eq(projectOrganizationOwnershipTable.projectId, projectId),
                    isNull(projectOrganizationOwnershipTable.deletedAt),
                    isNull(organizationTable.deletedAt),
                ),
            );
        return owners.map((owner) => owner.id);
    }

    function projectRequest(ownerOrganizationSlugs: string[]) {
        return Dto.updateProjectRequest.parse({
            currentProjectSlug: "test-project",
            projectSlug: "test-project",
            projectTitle: "Test",
            ownerOrganizationSlugs,
        });
    }

    async function waitForBlockedQueries(minimumCount: number): Promise<void> {
        await expect
            .poll(
                async () => {
                    const result = await db
                        .select({ count: count() })
                        .from(pgStatActivity)
                        .where(
                            and(
                                eq(pgStatActivity.databaseName, "agora_test"),
                                eq(pgStatActivity.waitEventType, "Lock"),
                            ),
                        );
                    return first(result).count;
                },
                { timeout: 5_000 },
            )
            .toBeGreaterThanOrEqual(minimumCount);
    }

    it("hides a deleted project's conversations and documents while retaining its owned history", async () => {
        const document = first(
            await db
                .insert(projectDocumentTable)
                .values({
                    projectId,
                    defaultLanguageCode: "en",
                    createdByUsername: "owner",
                    publishedAt: NOW,
                })
                .returning(),
        );
        await deleteProject({ db, projectSlug: "test-project" });
        const project = first(await db.select().from(projectTable));
        expect(project.deletedAt).not.toBeNull();
        expect(project.currentContentId).not.toBeNull();
        expect(
            first(await db.select().from(conversationTable)).currentContentId,
        ).toBeNull();
        await expect(
            db.select().from(projectContentTable),
        ).resolves.toHaveLength(1);
        await expect(
            db.select().from(conversationContentTable),
        ).resolves.toHaveLength(1);
        await expect(
            hasProjectCapability({
                db,
                userId: OWNER,
                projectId,
                capability: "conversation_edit",
            }),
        ).resolves.toBe(false);
        await expect(
            accessProjectDocument({
                db,
                request: {
                    projectSlug: "test-project",
                    documentId: document.publicId,
                    audience: "participant",
                    languageCode: "en",
                    mode: "download",
                },
            }),
        ).rejects.toThrow("Project document not found");
    });

    it("does not reset the deletion time on repeated deletion", async () => {
        await deleteProject({ db, projectSlug: "test-project" });
        const deletedAt = first(await db.select().from(projectTable)).deletedAt;
        await expect(
            deleteProject({ db, projectSlug: "test-project" }),
        ).rejects.toThrow("Project not found");
        expect(first(await db.select().from(projectTable)).deletedAt).toEqual(
            deletedAt,
        );
    });

    it("rolls back the parent and child visibility changes together", async () => {
        await expect(
            db.transaction(async (tx) => {
                await deleteProject({ db: tx, projectSlug: "test-project" });
                throw new Error("Roll back deletion");
            }),
        ).rejects.toThrow("Roll back deletion");
        expect(
            first(await db.select().from(projectTable)).deletedAt,
        ).toBeNull();
        expect(
            first(await db.select().from(conversationTable)).currentContentId,
        ).not.toBeNull();
    });

    it("does not alter an already deleted conversation's timestamp during parent deletion", async () => {
        await db
            .update(conversationTable)
            .set({ currentContentId: null, updatedAt: NOW })
            .where(eq(conversationTable.id, conversationId));
        await deleteProject({ db, projectSlug: "test-project" });
        expect(
            first(await db.select().from(conversationTable)).updatedAt,
        ).toEqual(NOW);
    });

    it("provisions a new default without restoring the deleted project's conversations or content", async () => {
        await db
            .update(projectTable)
            .set({ autoProvisionedForOrganizationId: organizationId });
        const original = first(await db.select().from(projectTable));
        await deleteProject({ db, projectSlug: "test-project" });
        const replacement = await getOrCreateDefaultProjectForOrganization({
            db,
            organizationId,
        });
        expect(replacement.projectId).not.toBe(projectId);
        const historical = first(
            await db
                .select()
                .from(projectTable)
                .where(eq(projectTable.id, projectId)),
        );
        expect(historical.deletedAt).not.toBeNull();
        expect(historical.currentContentId).toBe(original.currentContentId);
        expect(
            first(await db.select().from(conversationTable)).currentContentId,
        ).toBeNull();
        expect(first(await db.select().from(conversationTable)).projectId).toBe(
            projectId,
        );
        await expect(
            db.select().from(projectContentTable),
        ).resolves.toHaveLength(2);
    });

    it("waits for an authorized creation and hides its committed child before deletion returns", async () => {
        const locked = createBarrier();
        const release = createBarrier();
        const creation = db.transaction(async (tx) => {
            expect(
                await lockConversationCreateTarget({
                    db: tx,
                    userId: OWNER,
                    target: { projectId, organizationId },
                }),
            ).toBe(true);
            locked.resolve();
            await release.promise;
            const config = first(
                await tx
                    .insert(polisConversationConfigTable)
                    .values({})
                    .returning(),
            );
            const conversation = first(
                await tx
                    .insert(conversationTable)
                    .values({
                        slugId: "conv5678",
                        projectId,
                        polisConfigId: config.id,
                    })
                    .returning(),
            );
            const content = first(
                await tx
                    .insert(conversationContentTable)
                    .values({
                        conversationId: conversation.id,
                        title: "Late creation",
                    })
                    .returning(),
            );
            await tx
                .update(conversationTable)
                .set({ currentContentId: content.id })
                .where(eq(conversationTable.id, conversation.id));
        });
        await locked.promise;
        const deletion = deleteProject({ db, projectSlug: "test-project" });
        try {
            await waitForBlockedQueries(1);
        } finally {
            release.resolve();
        }
        await Promise.all([creation, deletion]);
        const conversations = await db.select().from(conversationTable);
        expect(conversations).toHaveLength(2);
        expect(
            conversations.every(
                (conversation) => conversation.currentContentId === null,
            ),
        ).toBe(true);
    });

    it("rejects organization deletion with a solely owned project atomically", async () => {
        await expect(
            deleteOrganization({ db, organizationName: "first-org" }),
        ).rejects.toSatisfy(hasOwnerConstraint);
        expect(
            first(
                await db
                    .select()
                    .from(organizationTable)
                    .where(eq(organizationTable.id, organizationId)),
            ).deletedAt,
        ).toBeNull();
        expect(await activeOwners()).toEqual([organizationId]);
    });

    it("does not exempt auto-provisioned projects from the transfer requirement", async () => {
        await db
            .update(projectTable)
            .set({ autoProvisionedForOrganizationId: organizationId });
        await expect(
            deleteOrganization({ db, organizationName: "first-org" }),
        ).rejects.toSatisfy(hasOwnerConstraint);
    });

    it.each(["deleted organization", "removed ownership"])(
        "does not count a %s as a surviving owner",
        async (state) => {
            await addCoOwner();
            if (state === "deleted organization")
                await db
                    .update(organizationTable)
                    .set({ deletedAt: NOW })
                    .where(eq(organizationTable.id, otherOrganizationId));
            else
                await db
                    .update(projectOrganizationOwnershipTable)
                    .set({ deletedAt: NOW })
                    .where(
                        eq(
                            projectOrganizationOwnershipTable.organizationId,
                            otherOrganizationId,
                        ),
                    );
            await expect(
                deleteOrganization({ db, organizationName: "first-org" }),
            ).rejects.toSatisfy(hasOwnerConstraint);
        },
    );

    it("preserves co-owned projects and surviving access while removing organization relationships", async () => {
        await addCoOwner();
        await db.insert(projectOrganizationAttributionTable).values({
            projectId,
            organizationId,
            role: "project_owner",
            sortOrder: 0,
        });
        await db.insert(projectContactTable).values({
            projectId,
            organizationId,
            firstName: "Contact",
            email: "contact@example.com",
        });
        await deleteOrganization({ db, organizationName: "first-org" });
        expect(
            first(await db.select().from(projectTable)).deletedAt,
        ).toBeNull();
        expect(
            first(await db.select().from(conversationTable)).currentContentId,
        ).not.toBeNull();
        expect(await activeOwners()).toEqual([otherOrganizationId]);
        expect(
            first(await db.select().from(projectOrganizationAttributionTable))
                .deletedAt,
        ).not.toBeNull();
        expect(
            first(await db.select().from(projectContactTable)).organizationId,
        ).toBeNull();
        await expect(
            hasProjectCapability({
                db,
                userId: OWNER,
                projectId,
                capability: "conversation_edit",
            }),
        ).resolves.toBe(false);
        await expect(
            hasProjectCapability({
                db,
                userId: OTHER_OWNER,
                projectId,
                capability: "conversation_edit",
            }),
        ).resolves.toBe(true);
    });

    it("allows deleting an organization once its remaining projects have been deleted", async () => {
        await deleteProject({ db, projectSlug: "test-project" });
        await deleteOrganization({ db, organizationName: "first-org" });
        expect(
            first(
                await db
                    .select()
                    .from(organizationTable)
                    .where(eq(organizationTable.id, organizationId)),
            ).deletedAt,
        ).not.toBeNull();
    });

    it("allows transfer through the project update service before organization deletion", async () => {
        const result = await updateProject({
            db,
            data: projectRequest(["second-org"]),
            googleCloudCredentials: undefined,
        });
        expect(result.success).toBe(true);
        await deleteOrganization({ db, organizationName: "first-org" });
        expect(await activeOwners()).toEqual([otherOrganizationId]);
    });

    it("cannot update or create a project owned by a deleted organization", async () => {
        await db
            .update(organizationTable)
            .set({ deletedAt: NOW })
            .where(eq(organizationTable.id, otherOrganizationId));
        const update = await updateProject({
            db,
            data: projectRequest(["second-org"]),
            googleCloudCredentials: undefined,
        });
        expect(update).toMatchObject({
            success: false,
            reason: "unknown_organization_slug",
        });
        const create = await createProject({
            db,
            data: Dto.createProjectRequest.parse({
                projectSlug: "new-project",
                projectTitle: "New",
                ownerOrganizationSlugs: ["second-org"],
            }),
            googleCloudCredentials: undefined,
        });
        expect(create).toMatchObject({
            success: false,
            reason: "unknown_organization_slug",
        });
        expect(await activeOwners()).toEqual([organizationId]);
    });

    it("does not let project updates mutate a deleted project", async () => {
        await deleteProject({ db, projectSlug: "test-project" });
        await expect(
            updateProject({
                db,
                data: projectRequest(["second-org"]),
                googleCloudCredentials: undefined,
            }),
        ).resolves.toEqual({ success: false, reason: "project_not_found" });
    });

    it("rechecks creation targets after project or organization deletion", async () => {
        const target = { projectId, organizationId };
        await expect(
            db.transaction((tx) =>
                lockConversationCreateTarget({ db: tx, userId: OWNER, target }),
            ),
        ).resolves.toBe(true);
        await addCoOwner();
        await deleteOrganization({ db, organizationName: "first-org" });
        await expect(
            db.transaction((tx) =>
                lockConversationCreateTarget({ db: tx, userId: OWNER, target }),
            ),
        ).resolves.toBe(false);
        const survivingTarget = {
            projectId,
            organizationId: otherOrganizationId,
        };
        await expect(
            db.transaction((tx) =>
                lockConversationCreateTarget({
                    db: tx,
                    userId: OTHER_OWNER,
                    target: survivingTarget,
                }),
            ),
        ).resolves.toBe(true);
        await deleteProject({ db, projectSlug: "test-project" });
        await expect(
            db.transaction((tx) =>
                lockConversationCreateTarget({
                    db: tx,
                    userId: OTHER_OWNER,
                    target: survivingTarget,
                }),
            ),
        ).resolves.toBe(false);
    });

    it("does not hold organization locks while waiting for the creating user's lifecycle lock", async () => {
        const locked = createBarrier();
        const probe = createBarrier();
        const lifecycle = db.transaction(async (tx) => {
            await tx
                .select({ id: userTable.id })
                .from(userTable)
                .where(eq(userTable.id, OWNER))
                .for("no key update");
            locked.resolve();
            await probe.promise;
            await tx.execute(sql`SET LOCAL lock_timeout = '500ms'`);
            await tx
                .select({ id: organizationTable.id })
                .from(organizationTable)
                .where(eq(organizationTable.id, organizationId))
                .for("update");
        });
        await locked.promise;
        const creation = db.transaction(
            async (tx) =>
                await lockConversationCreateTarget({
                    db: tx,
                    userId: OWNER,
                    target: { projectId, organizationId },
                }),
        );
        const results = Promise.allSettled([lifecycle, creation]);
        try {
            await waitForBlockedQueries(1);
        } finally {
            probe.resolve();
        }
        const outcomes = await results;
        expect(outcomes.at(0)?.status).toBe("fulfilled");
        expect(outcomes.at(1)).toEqual({ status: "fulfilled", value: true });
    });

    it("serializes same-author creations before their seed-statement counter writes", async () => {
        const locked = createBarrier();
        const release = createBarrier();
        const firstCreation = db.transaction(async (tx) => {
            expect(
                await lockConversationCreateTarget({
                    db: tx,
                    userId: OWNER,
                    target: { projectId, organizationId },
                }),
            ).toBe(true);
            locked.resolve();
            await release.promise;
            await tx
                .update(userTable)
                .set({
                    totalOpinionCount: sql`${userTable.totalOpinionCount} + 1`,
                })
                .where(eq(userTable.id, OWNER));
        });
        await locked.promise;
        const secondCreation = db.transaction(async (tx) => {
            expect(
                await lockConversationCreateTarget({
                    db: tx,
                    userId: OWNER,
                    target: { projectId, organizationId },
                }),
            ).toBe(true);
            await tx
                .update(userTable)
                .set({
                    totalOpinionCount: sql`${userTable.totalOpinionCount} + 1`,
                })
                .where(eq(userTable.id, OWNER));
        });
        const completion = Promise.all([firstCreation, secondCreation]);
        try {
            await waitForBlockedQueries(1);
        } finally {
            release.resolve();
        }
        await completion;
        expect(
            first(
                await db
                    .select()
                    .from(userTable)
                    .where(eq(userTable.id, OWNER)),
            ).totalOpinionCount,
        ).toBe(2);
    });

    it("rejects a resolved creation target after its author account is deleted", async () => {
        await db
            .insert(organizationMembershipTable)
            .values({ userId: OTHER_OWNER, organizationId, role: "admin" });
        await db
            .update(userTable)
            .set({ isDeleted: true })
            .where(eq(userTable.id, OWNER));
        await expect(
            db.transaction((tx) =>
                lockConversationCreateTarget({
                    db: tx,
                    userId: OWNER,
                    target: { projectId, organizationId },
                }),
            ),
        ).resolves.toBe(false);
    });

    it.each([
        "removed membership",
        "demoted role",
        "removed ownership",
    ] as const)(
        "rejects new authorization after %s without reauthorizing an already resolved target",
        async (state) => {
            // Revocation fixtures must themselves retain an active admin and owner.
            await db
                .insert(organizationMembershipTable)
                .values({ userId: OTHER_OWNER, organizationId, role: "admin" });
            await addCoOwner();
            const request = {
                db,
                userId: OWNER,
                postAsOrganizationSlug: "first-org",
                projectSlug: "test-project",
                autoProvisionedDefaultLanguage: "en",
            } satisfies Parameters<
                typeof resolveConversationCreateTargetResult
            >[0];
            const authorized =
                await resolveConversationCreateTargetResult(request);
            expect(authorized).toEqual({
                success: true,
                target: { projectId, organizationId },
            });
            if (!authorized.success)
                throw new Error("Missing authorized fixture target");
            if (state === "removed membership")
                await db
                    .update(organizationMembershipTable)
                    .set({ deletedAt: NOW })
                    .where(
                        and(
                            eq(
                                organizationMembershipTable.organizationId,
                                organizationId,
                            ),
                            eq(organizationMembershipTable.userId, OWNER),
                        ),
                    );
            if (state === "demoted role") {
                await db
                    .update(organizationMembershipTable)
                    .set({ role: "moderator" })
                    .where(
                        and(
                            eq(
                                organizationMembershipTable.organizationId,
                                organizationId,
                            ),
                            eq(organizationMembershipTable.userId, OWNER),
                        ),
                    );
            }
            if (state === "removed ownership")
                await db
                    .update(projectOrganizationOwnershipTable)
                    .set({ deletedAt: NOW })
                    .where(
                        eq(
                            projectOrganizationOwnershipTable.organizationId,
                            organizationId,
                        ),
                    );
            await expect(
                resolveConversationCreateTargetResult(request),
            ).resolves.toEqual({
                success: false,
                reason:
                    state === "demoted role"
                        ? "missing_conversation_create_capability"
                        : "organization_not_available",
            });
            await expect(
                db.transaction(
                    async (tx) =>
                        await lockConversationCreateTarget({
                            db: tx,
                            userId: OWNER,
                            target: authorized.target,
                        }),
                ),
            ).resolves.toBe(true);
        },
    );

    it("prevents concurrent owner removal and organization deletion from orphaning a project", async () => {
        await addCoOwner();
        const locked = createBarrier();
        const release = createBarrier();
        const blocker = db.transaction(async (tx) => {
            await tx
                .select({ id: organizationTable.id })
                .from(organizationTable)
                .where(eq(organizationTable.id, organizationId))
                .for("update");
            locked.resolve();
            await release.promise;
        });
        await locked.promise;
        const changes = Promise.allSettled([
            updateProject({
                db,
                data: projectRequest(["first-org"]),
                googleCloudCredentials: undefined,
            }),
            deleteOrganization({ db, organizationName: "first-org" }),
        ]);
        try {
            await waitForBlockedQueries(2);
        } finally {
            release.resolve();
        }
        await blocker;
        const outcomes = await changes;
        expect(
            outcomes.filter((outcome) => outcome.status === "fulfilled"),
        ).toHaveLength(1);
        expect(await activeOwners()).toHaveLength(1);
    });

    it("prevents two concurrent organization deletions from orphaning their shared project", async () => {
        await addCoOwner();
        const locked = createBarrier();
        const release = createBarrier();
        const blocker = db.transaction(async (tx) => {
            await tx
                .select({ id: organizationTable.id })
                .from(organizationTable)
                .for("update");
            locked.resolve();
            await release.promise;
        });
        await locked.promise;
        const deletions = Promise.allSettled([
            deleteOrganization({ db, organizationName: "first-org" }),
            deleteOrganization({ db, organizationName: "second-org" }),
        ]);
        try {
            await waitForBlockedQueries(2);
        } finally {
            release.resolve();
        }
        await blocker;
        const outcomes = await deletions;
        expect(
            outcomes.filter((outcome) => outcome.status === "fulfilled"),
        ).toHaveLength(1);
        expect(await activeOwners()).toHaveLength(1);
    });

    it("serializes new default-project ownership against organization deletion", async () => {
        await deleteProject({ db, projectSlug: "test-project" });
        await db
            .update(projectOrganizationOwnershipTable)
            .set({ deletedAt: NOW });
        const locked = createBarrier();
        const release = createBarrier();
        const blocker = db.transaction(async (tx) => {
            await tx
                .select({ id: organizationTable.id })
                .from(organizationTable)
                .where(eq(organizationTable.id, organizationId))
                .for("update");
            locked.resolve();
            await release.promise;
        });
        await locked.promise;
        const provisioning = getOrCreateDefaultProjectForOrganization({
            db,
            organizationId,
        });
        await waitForBlockedQueries(1);
        const changes = Promise.allSettled([
            provisioning,
            deleteOrganization({ db, organizationName: "first-org" }),
        ]);
        try {
            await waitForBlockedQueries(2);
        } finally {
            release.resolve();
        }
        await blocker;
        const results = await changes;
        expect(results.at(0)?.status).toBe("fulfilled");
        expect(results.at(1)).toMatchObject({
            status: "rejected",
            reason: { statusCode: 409 },
        });
        const organization = first(
            await db
                .select()
                .from(organizationTable)
                .where(eq(organizationTable.id, organizationId)),
        );
        const defaults = await db
            .select()
            .from(projectTable)
            .where(
                and(
                    eq(
                        projectTable.autoProvisionedForOrganizationId,
                        organizationId,
                    ),
                    isNull(projectTable.deletedAt),
                ),
            );
        expect(organization.deletedAt).toBeNull();
        expect(defaults).toHaveLength(1);
    });

    it("rechecks default ownership after waiting for a project transfer", async () => {
        await addCoOwner();
        await db
            .update(projectTable)
            .set({ autoProvisionedForOrganizationId: organizationId })
            .where(eq(projectTable.id, projectId));
        const locked = createBarrier();
        const release = createBarrier();
        const transfer = db.transaction(async (tx) => {
            // Match real ownership mutations: organization parents precede the
            // project lock, so provisioning can wait without a lock-order cycle.
            expect(
                await lockListedProjectOrganizations({
                    db: tx,
                    projectId,
                    organizationIds: [otherOrganizationId],
                }),
            ).toBe(true);
            await tx
                .select({ id: projectTable.id })
                .from(projectTable)
                .where(eq(projectTable.id, projectId))
                .for("update");
            locked.resolve();
            await release.promise;
            await tx
                .update(projectTable)
                .set({ title: "Transferred" })
                .where(eq(projectTable.id, projectId));
            await tx
                .update(projectOrganizationOwnershipTable)
                .set({ deletedAt: NOW })
                .where(
                    eq(
                        projectOrganizationOwnershipTable.organizationId,
                        organizationId,
                    ),
                );
        });
        await locked.promise;
        const provisioning = getOrCreateDefaultProjectForOrganization({
            db,
            organizationId,
        });
        const results = Promise.allSettled([transfer, provisioning]);
        try {
            await waitForBlockedQueries(1);
        } finally {
            release.resolve();
        }
        const outcomes = await results;
        expect(outcomes.at(0)?.status).toBe("fulfilled");
        expect(outcomes.at(1)).toMatchObject({
            status: "rejected",
            reason: {
                statusCode: 409,
                message: "Default project ownership is unavailable",
            },
        });
    });

    it("does not read or change a transferred default's contact through its former organization", async () => {
        await addCoOwner();
        await db
            .update(projectTable)
            .set({ autoProvisionedForOrganizationId: organizationId })
            .where(eq(projectTable.id, projectId));
        await db.insert(projectContactTable).values({
            projectId,
            firstName: "Surviving contact",
            email: "survivor@example.com",
        });
        await db.insert(premiumFeatureEntitlementTable).values({
            organizationId,
            feature: "conversation_email_update",
            startsAt: new Date("2026-01-01"),
            createdByUserId: OWNER,
            updatedByUserId: OWNER,
        });
        const before = await getAdminNoProjectEmailUpdates({
            db,
            organizationSlug: "first-org",
            now: NOW,
        });
        expect(before).toMatchObject({
            success: true,
            configuration: { contact: { email: "survivor@example.com" } },
        });
        await db
            .update(projectOrganizationOwnershipTable)
            .set({ deletedAt: NOW })
            .where(
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    organizationId,
                ),
            );
        const after = await getAdminNoProjectEmailUpdates({
            db,
            organizationSlug: "first-org",
            now: NOW,
        });
        expect(after).toMatchObject({
            success: true,
            configuration: { contact: undefined, defaultEnabled: false },
        });
        await expect(
            updateAdminNoProjectEmailUpdates({
                db,
                userId: OWNER,
                request: {
                    organizationSlug: "first-org",
                    defaultEnabled: false,
                    contact: {
                        name: "Replacement",
                        email: "replacement@example.com",
                    },
                },
                now: NOW,
            }),
        ).rejects.toThrow("Default project ownership is unavailable");
        expect(first(await db.select().from(projectContactTable)).email).toBe(
            "survivor@example.com",
        );
    });
});
