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
    polisConversationConfigTable,
    projectTable,
    userTable,
} from "../src/shared-backend/schema.js";
import { queryPreferenceGroupPage } from "../src/service/conversationEmailUpdate.js";
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
            request: { limit: 2 },
        });
        expect(firstPage).toEqual({
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
            nextCursor: "project:second-project",
        });

        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: { limit: 2, cursor: "project:second-project" },
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
                request: { limit: 2, cursor: "no-project" },
            }),
        ).resolves.toEqual({
            success: true,
            groupKeys: [],
            nextCursor: undefined,
        });
    });

    it("matches child titles and treats search metacharacters literally", async () => {
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: { limit: 20, search: "needle" },
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
                request: { limit: 20, search: "%" },
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
                request: { limit: 20, search: "standalone" },
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
                request: { limit: 20, search: "no project" },
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
                request: { limit: 20, cursor: "invalid" },
            }),
        ).resolves.toEqual({ success: false });
        await expect(
            queryPreferenceGroupPage({
                db,
                userId: USER_ID,
                request: {
                    limit: 20,
                    cursor: "project:first-project",
                    search: "needle",
                },
            }),
        ).resolves.toEqual({ success: false });
    });
});
