import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    createConversationEmailUpdateService,
    groupScopes,
    listAuthorizedConversations,
} from "../src/service/conversationEmailUpdate.js";
import { decideConversationEmailFinalSend } from "../src/service/conversationEmailUpdatePolicy.js";
import {
    conversationContentTable,
    conversationTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    polisConversationConfigTable,
    premiumFeatureEntitlementTable,
    projectContactTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const PROMOTED_USER_ID = "00000000-0000-4000-8000-000000000002";
const NOW = new Date("2026-08-26T12:00:00.000Z");
const cases = [
    {
        slug: "real",
        directoryVisibility: "listed",
        personalUserId: null,
        noProject: false,
        expectedTitle: "Real Project",
    },
    {
        slug: "org",
        directoryVisibility: "listed",
        personalUserId: null,
        noProject: true,
        expectedTitle: "Public org",
    },
    {
        slug: "personal",
        directoryVisibility: "unlisted",
        personalUserId: USER_ID,
        noProject: true,
        expectedTitle: "current-username",
    },
    {
        slug: "promoted",
        directoryVisibility: "listed",
        personalUserId: PROMOTED_USER_ID,
        noProject: true,
        expectedTitle: "Public promoted",
    },
    {
        slug: "unlisted",
        directoryVisibility: "unlisted",
        personalUserId: null,
        noProject: true,
        expectedTitle: "Public unlisted",
    },
] satisfies {
    slug: string;
    directoryVisibility: "listed" | "unlisted";
    personalUserId: string | null;
    noProject: boolean;
    expectedTitle: string;
}[];

describe("Conversation Email Update branding", () => {
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
        });
        db = drizzle(sqlClient);
        await db.execute(
            sql.raw(
                readDbFixtureSql(
                    "conversation-email-update-preference-pagination.sql",
                ),
            ),
        );
        // The preference fixture lacks the authoring capability table.
        await db.execute(sql`
            CREATE TABLE organization_membership_all_project_capability (
                id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                organization_membership_id integer NOT NULL,
                capability text NOT NULL,
                granted_by_user_id uuid,
                revoked_by_user_id uuid,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now(),
                deleted_at timestamp
            )
        `);
        // History only reads these snapshot and delivery fields.
        await db.execute(sql`
            CREATE TABLE conversation_email_update (
                id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                public_id uuid NOT NULL,
                scope_kind text NOT NULL,
                project_title_snapshot text NOT NULL,
                subject text NOT NULL,
                body_html text NOT NULL
            );
            CREATE TABLE conversation_email_update_delivery (
                update_id integer PRIMARY KEY,
                project_id integer NOT NULL,
                participant_preference_scope text NOT NULL,
                accepted_at timestamp NOT NULL,
                displayed_participant_estimate integer NOT NULL,
                required_owner_copy_count integer NOT NULL,
                status text NOT NULL,
                failure_reason text,
                stop_reason text
            );
            CREATE TABLE conversation_email_update_conversation (
                update_id integer NOT NULL,
                conversation_id integer NOT NULL,
                conversation_title_snapshot text NOT NULL
            )
        `);
        await db.insert(userTable).values([
            { id: USER_ID, username: "current-username" },
            { id: PROMOTED_USER_ID, username: "private-founder" },
        ]);
        for (const entry of cases) {
            const [organization] = await db
                .insert(organizationTable)
                .values({
                    slug: entry.slug,
                    displayName: `Public ${entry.slug}`,
                    defaultLanguageCode: "en",
                    directoryVisibility: entry.directoryVisibility,
                    autoProvisionedForUserId: entry.personalUserId,
                    isFullImagePath: false,
                })
                .returning({ id: organizationTable.id });
            const [project] = await db
                .insert(projectTable)
                .values({
                    slug: entry.slug,
                    title: entry.noProject
                        ? "Stale internal title"
                        : "Real Project",
                    directoryVisibility: entry.noProject
                        ? "unlisted"
                        : "listed",
                    autoProvisionedForOrganizationId: entry.noProject
                        ? organization.id
                        : null,
                    conversationEmailUpdateDefaultEnabled: true,
                })
                .returning({ id: projectTable.id });
            const [membership] = await db
                .insert(organizationMembershipTable)
                .values({ userId: USER_ID, organizationId: organization.id })
                .returning({ id: organizationMembershipTable.id });
            const [configuration] = await db
                .insert(polisConversationConfigTable)
                .values({})
                .returning({ id: polisConversationConfigTable.id });
            await db.insert(projectOrganizationOwnershipTable).values({
                projectId: project.id,
                organizationId: organization.id,
            });
            await db
                .insert(organizationMembershipAllProjectCapabilityTable)
                .values({
                    organizationMembershipId: membership.id,
                    capability: "conversation_email_update",
                });
            await db.insert(premiumFeatureEntitlementTable).values({
                organizationId: organization.id,
                feature: "conversation_email_update",
                startsAt: NOW,
            });
            await db.insert(projectContactTable).values({
                projectId: project.id,
                firstName: "",
                email: "updates@example.com",
            });
            const [conversation] = await db
                .insert(conversationTable)
                .values({
                    projectId: project.id,
                    slugId: entry.slug.padEnd(8, "0"),
                    polisConfigId: configuration.id,
                })
                .returning({ id: conversationTable.id });
            const [content] = await db
                .insert(conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "Discussion",
                })
                .returning({ id: conversationContentTable.id });
            await db
                .update(conversationTable)
                .set({ currentContentId: content.id })
                .where(eq(conversationTable.id, conversation.id));
        }
    }, 120_000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    });

    it.each(cases)(
        "resolves $slug branding without changing authorization",
        async (entry) => {
            const rows = await listAuthorizedConversations({
                db,
                userId: USER_ID,
                now: NOW,
            });
            const row = rows.find(
                (candidate) => candidate.project_slug === entry.slug,
            );
            expect(row?.project_title).toBe(entry.expectedTitle);
            if (row === undefined)
                throw new Error("Missing authorized conversation");
            const basis = {
                authorizingOrganizationId: row.authorizing_organization_id,
                authorizingEntitlementId: row.authorizing_entitlement_id,
                replyToName: row.contact_name ?? row.project_title,
                replyToEmail: "updates@example.com",
                conversationIds: [row.conversation_id],
            };
            expect(
                decideConversationEmailFinalSend({
                    testStatus: "provider_accepted",
                    testUsed: false,
                    activeDelivery: false,
                    testedBasis: { ...basis, replyToName: entry.expectedTitle },
                    currentBasis: basis,
                    everyConversationSendingEnabled: true,
                }),
            ).toEqual({ allowed: true });
        },
    );

    it("keeps each backing organization's workspace branding separate", async () => {
        const rows = await listAuthorizedConversations({
            db,
            userId: USER_ID,
            now: NOW,
        });
        const scopes = groupScopes({
            rows,
            estimates: new Map(),
            operationalSendingEnabled: true,
        });
        expect(
            Dto.conversationEmailUpdateWorkspaceResponse.safeParse({
                success: true,
                resolvedContext: { kind: "global" },
                scopes,
            }).success,
        ).toBe(true);
        expect(scopes).toHaveLength(cases.length);
        for (const entry of cases) {
            expect(
                scopes.find((scope) =>
                    scope.conversations.some(
                        (conversation) =>
                            conversation.conversationSlugId ===
                            entry.slug.padEnd(8, "0"),
                    ),
                ),
            ).toMatchObject({
                kind: entry.noProject ? "no_project" : "project",
                title: entry.expectedTitle,
                unsubscribeScope: entry.noProject ? "conversation" : "project",
            });
        }
        expect(JSON.stringify(scopes)).not.toContain("private-founder");
        expect(JSON.stringify(scopes)).not.toContain("Stale internal title");
    });

    it.each([true, false])(
        "uses conversation unsubscribe scope with project defaults disabled and override %s",
        async (conversationOverrideEnabled) => {
            const rows = await listAuthorizedConversations({
                db,
                userId: USER_ID,
                now: NOW,
            });
            const scopes = groupScopes({
                rows: rows
                    .filter((row) => row.project_slug === "real")
                    .map((row) => ({
                        ...row,
                        project_default_enabled: false,
                        conversation_override: conversationOverrideEnabled,
                    })),
                estimates: new Map(),
                operationalSendingEnabled: true,
            });
            expect(scopes).toMatchObject([
                {
                    kind: "project",
                    unsubscribeScope: "conversation",
                    conversations: [
                        { sendingEnabled: conversationOverrideEnabled },
                    ],
                },
            ]);
            expect(
                Dto.conversationEmailUpdateWorkspaceOpenApiResponse.safeParse({
                    success: true,
                    resolvedContext: { kind: "global" },
                    scopes,
                }).success,
            ).toBe(true);
        },
    );

    it.each([
        {
            projectSlug: "real",
            persistedScope: "project",
            snapshotTitle: "Old project title",
        },
        {
            projectSlug: "real",
            persistedScope: "conversation",
            snapshotTitle: "Old project title",
        },
        {
            projectSlug: "personal",
            persistedScope: "conversation",
            snapshotTitle: "No Project",
        },
    ])(
        "preserves $projectSlug history's $persistedScope unsubscribe scope and old snapshots",
        async ({ projectSlug, persistedScope, snapshotTitle }) => {
            const rows = await listAuthorizedConversations({
                db,
                userId: USER_ID,
                now: NOW,
            });
            const row = rows.find(
                (candidate) => candidate.project_slug === projectSlug,
            );
            if (row === undefined)
                throw new Error("Missing authorized conversation");
            const updateId = randomUUID();
            await db.execute(sql`
                WITH inserted_update AS (
                    INSERT INTO conversation_email_update
                        (public_id, scope_kind, project_title_snapshot, subject, body_html)
                    VALUES (
                        ${updateId},
                        ${row.scope_kind === "project" ? "listed_project" : "no_project"},
                        ${snapshotTitle}, 'Historical update', '<p>Original body</p>'
                    )
                    RETURNING id
                ), inserted_delivery AS (
                    INSERT INTO conversation_email_update_delivery
                        (update_id, project_id, participant_preference_scope, accepted_at,
                         displayed_participant_estimate, required_owner_copy_count, status)
                    SELECT id, ${row.project_id}, ${persistedScope}, ${NOW.toISOString()}, 3, 1, 'completed'
                    FROM inserted_update
                )
                INSERT INTO conversation_email_update_conversation
                    (update_id, conversation_id, conversation_title_snapshot)
                SELECT id, ${row.conversation_id}, 'Old conversation title' FROM inserted_update
            `);
            await db
                .update(projectTable)
                .set({
                    conversationEmailUpdateDefaultEnabled:
                        persistedScope !== "project",
                })
                .where(eq(projectTable.id, row.project_id));
            try {
                const service = createConversationEmailUpdateService({
                    db,
                    sendingEnabled: true,
                    baseImageServiceUrl: "https://images.example.com",
                    siteBaseUrl: "https://agora.example.com",
                });
                const detail =
                    Dto.conversationEmailUpdateHistoryDetailResponse.parse(
                        await service.getHistoryDetail({
                            userId: USER_ID,
                            request: { updateId },
                        }),
                    );
                const history =
                    Dto.conversationEmailUpdateHistoryListResponse.parse(
                        await service.listHistory({
                            userId: USER_ID,
                            request: { context: { kind: "global" }, limit: 25 },
                        }),
                    );
                expect(detail).toMatchObject({
                    success: true,
                    record: {
                        updateId,
                        unsubscribeScope: persistedScope,
                        scope: { title: snapshotTitle },
                        bodyHtml: "<p>Original body</p>",
                        conversations: [{ title: "Old conversation title" }],
                    },
                });
                if (!detail.success || !history.success)
                    throw new Error("History unavailable");
                expect(
                    history.items.find((item) => item.updateId === updateId),
                ).toEqual(detail.record);
            } finally {
                await db
                    .update(projectTable)
                    .set({
                        conversationEmailUpdateDefaultEnabled:
                            row.project_default_enabled,
                    })
                    .where(eq(projectTable.id, row.project_id));
            }
        },
    );
});
