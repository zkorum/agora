import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    conversationContentTable,
    conversationEmailUpdateUserConversationPreferenceTable,
    conversationEmailUpdateUserProjectPreferenceTable,
    conversationTable,
    organizationTable,
    organizationMembershipTable,
    premiumFeatureEntitlementTable,
    polisConversationConfigTable,
    projectTable,
    projectContactTable,
    projectOrganizationOwnershipTable,
    userTable,
} from "../src/shared-backend/schema.js";
import {
    queryInitialPreferenceConversationPages,
    queryPreferenceConversationPage,
    queryPreferenceGroupPage,
} from "../src/service/conversationEmailUpdate.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-26T12:00:00.000Z");

describe("conversation Email Update preference pagination", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let firstProjectId: number;
    let secondProjectId: number;
    let noProjectContainerId: number;
    let organizationId: number;

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
        await db.execute(
            sql.raw(
                readDbFixtureSql(
                    "conversation-email-update-preference-pagination.sql",
                ),
            ),
        );
        await db.insert(userTable).values({ id: USER_ID, username: "reader" });
        const organizations = await db
            .insert(organizationTable)
            .values({
                slug: "reader-organization",
                displayName: "Reader Organization",
                defaultLanguageCode: "en",
                directoryVisibility: "unlisted",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        const organization = organizations.at(0);
        if (organization === undefined) {
            throw new Error("Failed to seed organization");
        }
        organizationId = organization.id;
        const projects = await db
            .insert(projectTable)
            .values([
                {
                    slug: "first-project",
                    title: "First Project",
                    directoryVisibility: "listed",
                },
                {
                    slug: "second-project",
                    title: "Second Project",
                    directoryVisibility: "listed",
                },
                {
                    slug: "no-project-container",
                    title: "Private Container",
                    directoryVisibility: "unlisted",
                    autoProvisionedForOrganizationId: organization.id,
                },
            ])
            .returning({ id: projectTable.id });
        const firstProject = projects.at(0);
        const secondProject = projects.at(1);
        const noProjectContainer = projects.at(2);
        if (
            firstProject === undefined ||
            secondProject === undefined ||
            noProjectContainer === undefined
        ) {
            throw new Error("Failed to seed projects");
        }
        firstProjectId = firstProject.id;
        secondProjectId = secondProject.id;
        noProjectContainerId = noProjectContainer.id;
        await Promise.all([
            db.insert(projectOrganizationOwnershipTable).values({
                projectId: firstProject.id,
                organizationId: organization.id,
            }),
            db.insert(premiumFeatureEntitlementTable).values({
                organizationId: organization.id,
                feature: "conversation_email_update",
                startsAt: new Date("2026-08-01T00:00:00.000Z"),
                createdByUserId: USER_ID,
                updatedByUserId: USER_ID,
            }),
            db.insert(projectContactTable).values({
                projectId: firstProject.id,
                firstName: "Participant contact",
                email: "updates@example.com",
            }),
            db.insert(projectOrganizationOwnershipTable).values({
                projectId: noProjectContainer.id,
                organizationId: organization.id,
            }),
            db.insert(projectContactTable).values({
                projectId: noProjectContainer.id,
                firstName: "Private participant contact",
                email: "private-updates@example.com",
            }),
        ]);
        await db
            .insert(conversationEmailUpdateUserProjectPreferenceTable)
            .values({
                userId: USER_ID,
                projectId: firstProject.id,
                enabled: true,
                choiceAt: NOW,
                choiceSource: "settings",
            });
        const secondConversationId = await addConversation({
            projectId: secondProject.id,
            slugId: "second01",
            title: "Needle discussion",
        });
        const noProjectConversationId = await addConversation({
            projectId: noProjectContainer.id,
            slugId: "direct01",
            title: "Standalone discussion",
        });
        await addConversation({
            projectId: noProjectContainer.id,
            slugId: "private1",
            title: "Private undisclosed discussion",
        });
        const percentConversationId = await addConversation({
            projectId: firstProject.id,
            slugId: "percent1",
            title: "Literal % topic",
        });
        await db
            .insert(conversationEmailUpdateUserConversationPreferenceTable)
            .values([
                {
                    userId: USER_ID,
                    conversationId: secondConversationId,
                    enabled: true,
                    choiceAt: NOW,
                    choiceSource: "settings",
                },
                {
                    userId: USER_ID,
                    conversationId: noProjectConversationId,
                    enabled: true,
                    choiceAt: NOW,
                    choiceSource: "settings",
                },
                {
                    userId: USER_ID,
                    conversationId: percentConversationId,
                    enabled: true,
                    choiceAt: NOW,
                    choiceSource: "settings",
                },
            ]);
        for (let index = 1; index <= 12; index += 1) {
            await addConversation({
                projectId: firstProject.id,
                slugId: `child${String(index).padStart(3, "0")}`,
                title: `Child conversation ${String(index)}`,
            });
        }
    }, 120_000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    async function addConversation({
        projectId,
        slugId,
        title,
    }: {
        projectId: number;
        slugId: string;
        title: string;
    }): Promise<number> {
        const configurations = await db
            .insert(polisConversationConfigTable)
            .values({})
            .returning({ id: polisConversationConfigTable.id });
        const configuration = configurations.at(0);
        if (configuration === undefined) {
            throw new Error("Failed to seed conversation configuration");
        }
        const conversations = await db
            .insert(conversationTable)
            .values({ projectId, slugId, polisConfigId: configuration.id })
            .returning({ id: conversationTable.id });
        const conversation = conversations.at(0);
        if (conversation === undefined) {
            throw new Error("Failed to seed conversation");
        }
        const contents = await db
            .insert(conversationContentTable)
            .values({ conversationId: conversation.id, title })
            .returning({ id: conversationContentTable.id });
        const content = contents.at(0);
        if (content === undefined) {
            throw new Error("Failed to seed conversation content");
        }
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, conversation.id));
        return conversation.id;
    }

    it("paginates project groups before the No Project group", async () => {
        const firstPage = await queryPreferenceGroupPage({
            db,
            userId: USER_ID,
            request: { mode: "browse", limit: 2 },
        });
        expect(firstPage).toMatchObject({
            success: true,
            groupKeys: [
                {
                    kind: "project",
                    projectId: firstProjectId,
                    projectSlug: "first-project",
                },
                {
                    kind: "project",
                    projectId: secondProjectId,
                    projectSlug: "second-project",
                },
            ],
            nextCursor: expect.any(String),
        });
        if (!firstPage.success || firstPage.nextCursor === undefined) return;

        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: {
                    mode: "browse",
                    limit: 2,
                    cursor: firstPage.nextCursor,
                },
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [{ kind: "no_project" }],
            nextCursor: undefined,
        });
    });

    it("matches child titles and treats search metacharacters literally", async () => {
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: { mode: "browse", limit: 20, search: "needle" },
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [
                {
                    kind: "project",
                    projectId: secondProjectId,
                    projectSlug: "second-project",
                },
            ],
            nextCursor: undefined,
        });
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: { mode: "browse", limit: 20, search: "%" },
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [
                {
                    kind: "project",
                    projectId: firstProjectId,
                    projectSlug: "first-project",
                },
            ],
            nextCursor: undefined,
        });
    });

    it("searches No Project children but not the synthetic label", async () => {
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: {
                    mode: "browse",
                    limit: 20,
                    search: "standalone",
                },
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [{ kind: "no_project" }],
            nextCursor: undefined,
        });
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: {
                    mode: "browse",
                    limit: 20,
                    search: "no project",
                },
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [],
            nextCursor: undefined,
        });
    });

    it("rejects invalid and search-excluded cursors", async () => {
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: { mode: "browse", limit: 20, cursor: "invalid" },
            }),
        ).resolves.toEqual({ success: false });
        const unfilteredPage = await queryPreferenceGroupPage({
            db,
            userId: USER_ID,
            request: { mode: "browse", limit: 1 },
        });
        expect(unfilteredPage.success).toBe(true);
        if (!unfilteredPage.success || unfilteredPage.nextCursor === undefined) {
            return;
        }
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: {
                    mode: "browse",
                    limit: 20,
                    cursor: unfilteredPage.nextCursor,
                    search: "needle",
                },
            }),
        ).resolves.toEqual({ success: false });
    });

    it("paginates explicit conversations before inherited conversations", async () => {
        const group = {
            kind: "project",
            projectId: firstProjectId,
            projectSlug: "first-project",
        } satisfies Parameters<
            typeof queryPreferenceConversationPage
        >[0]["group"];
        const firstPage = await queryPreferenceConversationPage({
            db,
            userId: USER_ID,
            now: NOW,
            group,
            search: undefined,
            focusConversationSlugId: undefined,
            cursor: undefined,
        });
        expect(firstPage.success).toBe(true);
        if (!firstPage.success) return;
        expect(firstPage.rows).toHaveLength(10);
        expect(firstPage.rows[0]).toMatchObject({
            conversation_slug_id: "percent1",
            conversation_enabled: true,
        });
        expect(
            firstPage.rows
                .slice(1)
                .every((row) => row.conversation_enabled === undefined),
        ).toBe(true);
        expect(firstPage.nextCursor).toBeDefined();
        const cursor = firstPage.nextCursor;
        if (cursor === undefined) return;

        await expect(
            queryPreferenceConversationPage({
                db,
                userId: USER_ID,
                now: NOW,
                group: { kind: "no_project" },
                search: undefined,
                focusConversationSlugId: undefined,
                cursor,
            }),
        ).resolves.toEqual({ success: false });
        await expect(
            queryPreferenceConversationPage({
                db,
                userId: USER_ID,
                now: NOW,
                group,
                search: "needle",
                focusConversationSlugId: undefined,
                cursor,
            }),
        ).resolves.toEqual({ success: false });

        const secondPage = await queryPreferenceConversationPage({
            db,
            userId: USER_ID,
            now: NOW,
            group,
            search: undefined,
            focusConversationSlugId: undefined,
            cursor,
        });
        expect(secondPage.success).toBe(true);
        if (!secondPage.success) return;
        expect(secondPage.rows).toHaveLength(3);
        expect(secondPage.rows[0]?.conversation_slug_id).toBe("child010");
        expect(secondPage.nextCursor).toBeUndefined();
    });

    it("batches the same initial conversation page for every group", async () => {
        const groups = [
            {
                kind: "project",
                projectId: firstProjectId,
                projectSlug: "first-project",
            },
            {
                kind: "project",
                projectId: secondProjectId,
                projectSlug: "second-project",
            },
            { kind: "no_project" },
        ] satisfies Parameters<
            typeof queryInitialPreferenceConversationPages
        >[0]["groupKeys"];
        const batch = await queryInitialPreferenceConversationPages({
            db,
            userId: USER_ID,
            now: NOW,
            groupKeys: groups,
            search: undefined,
            focusConversationSlugId: undefined,
        });

        for (const group of groups) {
            const page = await queryPreferenceConversationPage({
                db,
                userId: USER_ID,
                now: NOW,
                group,
                search: undefined,
                focusConversationSlugId: undefined,
                cursor: undefined,
            });
            expect(page.success).toBe(true);
            if (!page.success) return;
            const scopeKind = group.kind;
            expect(
                batch.rows.filter((row) => row.scope_kind === scopeKind &&
                    (group.kind === "no_project" ||
                        row.project_id === group.projectId)),
            ).toEqual(page.rows);
            const groupKey =
                group.kind === "project"
                    ? `project:${group.projectSlug}`
                    : "no-project";
            expect(batch.nextCursorByGroup.get(groupKey)).toBe(page.nextCursor);
        }
    });

    it("returns all valid children for a project-title search and exact focus", async () => {
        const group = {
            kind: "project",
            projectId: firstProjectId,
            projectSlug: "first-project",
        } satisfies Parameters<
            typeof queryPreferenceConversationPage
        >[0]["group"];
        const titleSearchPage = await queryPreferenceConversationPage({
            db,
            userId: USER_ID,
            now: NOW,
            group,
            search: "first project",
            focusConversationSlugId: undefined,
            cursor: undefined,
        });
        expect(titleSearchPage.success).toBe(true);
        if (!titleSearchPage.success) return;
        expect(titleSearchPage.rows).toHaveLength(10);

        const focusedPage = await queryPreferenceConversationPage({
            db,
            userId: USER_ID,
            now: NOW,
            group,
            search: undefined,
            focusConversationSlugId: "child012",
            cursor: undefined,
        });
        expect(focusedPage).toMatchObject({
            success: true,
            rows: [{ conversation_slug_id: "child012" }],
            nextCursor: undefined,
        });
    });

    it("only searches undisclosed No Project conversations available to the user", async () => {
        const request = {
            mode: "browse",
            limit: 20,
            search: "private undisclosed",
        } satisfies Parameters<typeof queryPreferenceGroupPage>[0]["request"];
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request,
                now: NOW,
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [],
            nextCursor: undefined,
        });

        await db.insert(organizationMembershipTable).values({
            organizationId,
            userId: USER_ID,
        });
        await db
            .update(conversationTable)
            .set({ isIndexed: false })
            .where(eq(conversationTable.slugId, "private1"));
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request,
                now: NOW,
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [],
            nextCursor: undefined,
        });
        await db
            .update(conversationTable)
            .set({ isIndexed: true })
            .where(eq(conversationTable.slugId, "private1"));
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request,
                now: NOW,
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [{ kind: "no_project" }],
            nextCursor: undefined,
        });
        const page = await queryPreferenceConversationPage({
            db,
            userId: USER_ID,
            now: NOW,
            group: { kind: "no_project" },
            search: request.search,
            focusConversationSlugId: undefined,
            cursor: undefined,
        });
        expect(page).toMatchObject({
            success: true,
            rows: [
                {
                    project_id: noProjectContainerId,
                    conversation_slug_id: "private1",
                    conversation_enabled: undefined,
                },
            ],
        });
    });
});
