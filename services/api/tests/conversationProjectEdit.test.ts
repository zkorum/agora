import { readFileSync } from "node:fs";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
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

vi.mock("@/app.js", () => ({
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/service/contentTranslation.js", () => ({
    createEagerContentTranslationWorkForKnownConversation: vi.fn(
        async () => [],
    ),
    fetchCurrentSurveyQuestionSources: async () => [],
    fetchSeedOpinionSources: async () => [],
}));

import { Dto } from "../src/shared/types/dto.js";
import {
    conversationContentTable,
    conversationEmailUpdateConversationTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateDeliveryTable,
    conversationModerationTable,
    conversationProjectAssignmentTable,
    conversationTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    polisConversationConfigTable,
    projectContentTable,
    projectOrganizationOwnershipTable,
    projectTable,
    projectTranslationTargetLanguageTable,
    conversationTranslationTargetLanguageTable,
    realtimeEventOutboxTable,
    userTable,
    premiumFeatureEntitlementTable,
    projectContactTable,
} from "../src/shared-backend/schema.js";
import { getConversationProjectOptions } from "../src/service/conversationProject.js";
import { getOrCreatePersonalOrganization } from "../src/service/projectAccess.js";
import { updateConversation } from "../src/service/postEdit.js";
import {
    requireConversationCapabilityBySlug,
    requireConversationDestination,
} from "../src/service/organizationAuthorization.js";
import { createEagerContentTranslationWorkForKnownConversation } from "../src/service/contentTranslation.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const userId = "00000000-0000-4000-8000-000000000001";

describe("conversation project editing", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let conversationId: number;
    let sourceProjectId: number;
    let destinationProjectId: number;
    let membershipId: number;

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
            max: 8,
        });
        db = drizzle({ client });
        await db.execute(
            sql.raw(readDbFixtureSql("conversation-project-edit.sql")),
        );
        await db.execute(
            sql.raw(
                readFileSync(
                    new URL(
                        "../database/flyway/V0100__strange_wildside.sql",
                        import.meta.url,
                    ),
                    "utf8",
                ),
            ),
        );
        await db.execute(
            sql.raw(
                readFileSync(
                    new URL(
                        "../database/flyway/V0100.1__record_conversation_project_assignments.sql",
                        import.meta.url,
                    ),
                    "utf8",
                ),
            ),
        );
        const scopeConstraint = readFileSync(
            new URL(
                "../drizzle/0101_special_lady_deathstrike.sql",
                import.meta.url,
            ),
            "utf8",
        )
            .split("--> statement-breakpoint")
            .find((statement) =>
                statement.includes(
                    'ADD CONSTRAINT "email_update_scope_conversation_project_fk"',
                ),
            );
        if (scopeConstraint === undefined)
            throw new Error("Missing generated assignment foreign key");
        await db.execute(sql.raw(scopeConstraint));
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        vi.mocked(
            createEagerContentTranslationWorkForKnownConversation,
        ).mockClear();
        await db.execute(
            sql`TRUNCATE conversation_project_assignment, conversation_email_update_conversation, conversation_email_update_delivery, conversation_email_update, conversation_content, conversation_moderation, conversation_translation_target_language, conversation, polis_conversation_config, project_content, project_contact, project_translation_target_language, project_organization_ownership, project, premium_feature_entitlement, organization_membership_all_project_capability, organization_membership_capability, organization_membership, organization_localization, organization, "user", realtime_event_outbox_topic, realtime_event_outbox RESTART IDENTITY CASCADE`,
        );
        await db
            .insert(userTable)
            .values({ id: userId, username: "facilitator" });
        const [organization] = await db
            .insert(organizationTable)
            .values({
                slug: "owner",
                displayName: "Owner",
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        if (organization === undefined)
            throw new Error("Missing organization fixture");
        const [membership] = await db
            .insert(organizationMembershipTable)
            .values({ organizationId: organization.id, userId, role: "admin" })
            .returning({ id: organizationMembershipTable.id });
        if (membership === undefined)
            throw new Error("Missing membership fixture");
        membershipId = membership.id;
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: membershipId,
                    capability: "conversation_create",
                },
                {
                    organizationMembershipId: membershipId,
                    capability: "conversation_edit",
                },
            ]);
        const [source, destination] = await db
            .insert(projectTable)
            .values([
                {
                    slug: "source",
                    title: "Source",
                    directoryVisibility: "listed",
                },
                {
                    slug: "destination",
                    title: "Destination",
                    directoryVisibility: "listed",
                },
            ])
            .returning({ id: projectTable.id, title: projectTable.title });
        if (source === undefined || destination === undefined)
            throw new Error("Missing project fixtures");
        sourceProjectId = source.id;
        destinationProjectId = destination.id;
        await db.insert(projectOrganizationOwnershipTable).values([
            { organizationId: organization.id, projectId: source.id },
            { organizationId: organization.id, projectId: destination.id },
        ]);
        for (const project of [source, destination]) {
            const [content] = await db
                .insert(projectContentTable)
                .values({ projectId: project.id, title: project.title })
                .returning({ id: projectContentTable.id });
            if (content === undefined)
                throw new Error("Missing project content fixture");
            await db
                .update(projectTable)
                .set({ currentContentId: content.id })
                .where(eq(projectTable.id, project.id));
        }
        const [config] = await db
            .insert(polisConversationConfigTable)
            .values({})
            .returning({ id: polisConversationConfigTable.id });
        if (config === undefined)
            throw new Error("Missing configuration fixture");
        const [conversation] = await db
            .insert(conversationTable)
            .values({
                slugId: "conv1234",
                projectId: source.id,
                polisConfigId: config.id,
            })
            .returning({ id: conversationTable.id });
        if (conversation === undefined)
            throw new Error("Missing conversation fixture");
        conversationId = conversation.id;
        const [content] = await db
            .insert(conversationContentTable)
            .values({ conversationId, title: "Conversation" })
            .returning({ id: conversationContentTable.id });
        if (content === undefined) throw new Error("Missing content fixture");
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, conversationId));
    });

    function request() {
        return Dto.updateConversationRequest.parse({
            conversationSlugId: "conv1234",
            conversationTitle: "Conversation",
            isIndexed: true,
            participationMode: "account_required",
            multilingualSetting: {
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            },
            conversationTypeConfig: {
                conversationType: "polis",
                votingPresentation: "list",
            },
            projectChange: {
                expectedProjectSlug: "source",
                target: { kind: "project", projectSlug: "destination" },
            },
        });
    }

    it("moves atomically and publishes the committed assignment", async () => {
        const response = await updateConversation({
            db,
            userId,
            data: request(),
        });
        expect(response).toMatchObject({
            success: true,
            projectAssignment: {
                previousProjectSlug: "source",
                projectSlug: "destination",
            },
        });
        expect(
            (
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversationId))
            ).at(0)?.projectId,
        ).toBe(destinationProjectId);
        expect(
            await db.select().from(conversationProjectAssignmentTable),
        ).toHaveLength(2);
        expect(
            (await db.select().from(realtimeEventOutboxTable)).at(0)?.eventType,
        ).toBe("conversation_settings_updated");
    });

    it("rejects a stale assignment without applying other edits", async () => {
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "stale",
            target: { kind: "project", projectSlug: "destination" },
        };
        data.conversationTitle = "Changed";
        expect(
            await updateConversation({
                db,
                userId,
                data,
            }),
        ).toMatchObject({
            success: false,
            reason: "project_assignment_changed",
        });
        expect(await db.select().from(conversationContentTable)).toHaveLength(
            1,
        );
        expect(await db.select().from(realtimeEventOutboxTable)).toHaveLength(
            0,
        );
    });

    it("serializes concurrent moves so a stale save cannot win", async () => {
        const results = await Promise.all([
            updateConversation({
                db,
                userId,
                data: request(),
            }),
            updateConversation({
                db,
                userId,
                data: request(),
            }),
        ]);
        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(results.filter((result) => !result.success)).toEqual([
            { success: false, reason: "project_assignment_changed" },
        ]);
    });

    it("rejects a deleted destination", async () => {
        await db
            .update(projectTable)
            .set({ deletedAt: new Date() })
            .where(eq(projectTable.id, destinationProjectId));
        expect(
            await updateConversation({
                db,
                userId,
                data: request(),
            }),
        ).toMatchObject({ success: false, reason: "project_not_available" });
    });

    it("rejects moving a locked conversation", async () => {
        await db.insert(conversationModerationTable).values({
            conversationId,
            authorId: userId,
            moderationAction: "lock",
            moderationReason: "spam",
        });
        expect(
            await updateConversation({
                db,
                userId,
                data: request(),
            }),
        ).toMatchObject({ success: false, reason: "conversation_locked" });
    });

    it.each(["source", "destination"])(
        "rejects a move during an active %s delivery",
        async (scope) => {
            await db.insert(conversationEmailUpdateDeliveryTable).values({
                projectId:
                    scope === "source" ? sourceProjectId : destinationProjectId,
                updateId: 1,
                acceptedTestAttemptId: 1,
                acceptedByUserId: userId,
                status: "preparing",
                participantPreferenceScope: "project",
                audienceCutoffAt: new Date(),
                displayedParticipantEstimate: 1,
                acceptanceParticipantEstimate: 1,
                requiredOwnerCopyCount: 1,
                acceptedAt: new Date(),
            });
            expect(
                await updateConversation({
                    db,
                    userId,
                    data: request(),
                }),
            ).toMatchObject({
                success: false,
                reason: "active_delivery_conflict",
            });
        },
    );

    it("requires destination creation permission even when the source is editable", async () => {
        const [destinationOwner] = await db
            .insert(organizationTable)
            .values({
                slug: "destination-only",
                displayName: "Destination",
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        if (destinationOwner === undefined)
            throw new Error("Missing destination owner");
        await db
            .insert(organizationMembershipTable)
            .values({
                organizationId: destinationOwner.id,
                userId,
                role: "moderator",
            });
        await db
            .update(projectOrganizationOwnershipTable)
            .set({ organizationId: destinationOwner.id })
            .where(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    destinationProjectId,
                ),
            );
        await requireConversationCapabilityBySlug({
            db,
            userId,
            conversationSlugId: request().conversationSlugId,
            capability: "conversation_edit",
        });
        await expect(
            requireConversationDestination({
                db,
                userId,
                target: { kind: "project", projectSlug: "destination" },
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("keeps the assignment when a survey/details save omits a move", async () => {
        const data = request();
        data.projectChange = undefined;
        expect(
            await updateConversation({
                db,
                userId,
                data,
            }),
        ).toMatchObject({ success: true });
        expect(
            (await db.select().from(conversationTable)).at(0)?.projectId,
        ).toBe(sourceProjectId);
        expect(
            await db.select().from(conversationProjectAssignmentTable),
        ).toHaveLength(1);
    });

    it("offers authorized destinations and an explicit organization No Project scope", async () => {
        const options = await getConversationProjectOptions({ db, userId });
        expect(options.map((option) => option.target)).toEqual(
            expect.arrayContaining([
                { kind: "project", projectSlug: "destination" },
                { kind: "no_project", organizationSlug: "owner" },
            ]),
        );
        expect(options).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: { kind: "project", projectSlug: "destination" },
                    organizationSlugs: ["owner"],
                }),
                expect.objectContaining({
                    target: { kind: "no_project", organizationSlug: "owner" },
                }),
            ]),
        );
    });

    it("derives Email Update permissions through any owner rather than the displayed organization", async () => {
        const [owner] = await db
            .insert(organizationTable)
            .values({
                slug: "email-owner",
                displayName: "Email owner",
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        if (owner === undefined)
            throw new Error("Missing additional owner fixture");
        const [membership] = await db
            .insert(organizationMembershipTable)
            .values({ organizationId: owner.id, userId, role: "admin" })
            .returning({ id: organizationMembershipTable.id });
        if (membership === undefined)
            throw new Error("Missing additional membership fixture");
        await db.insert(projectOrganizationOwnershipTable).values({
            projectId: destinationProjectId,
            organizationId: owner.id,
        });
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_edit",
                },
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_email_update",
                },
            ]);
        await db.insert(premiumFeatureEntitlementTable).values({
            organizationId: owner.id,
            feature: "conversation_email_update",
            startsAt: new Date(Date.now() - 60_000),
        });
        const options = await getConversationProjectOptions({ db, userId });
        expect(
            options.find(
                (option) =>
                    option.target.kind === "project" &&
                    option.target.projectSlug === "destination",
            )?.emailUpdates.canConfigure,
        ).toBe(true);
        expect(options).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: { kind: "project", projectSlug: "destination" },
                    organizationSlugs: expect.arrayContaining([
                        "owner",
                        "email-owner",
                    ]),
                }),
            ]),
        );
    });

    it("provisions the authenticated user's personal scope only when saving the move", async () => {
        const options = await getConversationProjectOptions({ db, userId });
        expect(options).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: { kind: "no_project", organizationSlug: undefined },
                }),
            ]),
        );
        expect(await db.select().from(organizationTable)).toHaveLength(1);
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "source",
            target: { kind: "no_project" },
        };
        const response = await updateConversation({ db, userId, data });
        expect(response).toMatchObject({
            success: true,
            projectAssignment: { target: { kind: "no_project" } },
        });
        const [personal] = await db
            .select()
            .from(organizationTable)
            .where(eq(organizationTable.autoProvisionedForUserId, userId));
        if (personal === undefined)
            throw new Error("Missing personal organization");
        const [personalProject] = await db
            .select()
            .from(projectTable)
            .where(
                eq(projectTable.autoProvisionedForOrganizationId, personal.id),
            );
        expect(personalProject).toBeDefined();
        expect(
            (await db.select().from(conversationTable)).at(0)?.projectId,
        ).toBe(personalProject?.id);
        const refreshedOptions = await getConversationProjectOptions({
            db,
            userId,
        });
        expect(
            refreshedOptions.filter(
                (option) =>
                    option.target.kind === "no_project" &&
                    option.target.organizationSlug === undefined,
            ),
        ).toHaveLength(1);
    });

    it("serializes concurrent first-time personal moves without duplicate scopes", async () => {
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "source",
            target: { kind: "no_project" },
        };
        const responses = await Promise.all([
            updateConversation({ db, userId, data }),
            updateConversation({ db, userId, data }),
        ]);
        expect(responses.filter((response) => response.success)).toHaveLength(
            1,
        );
        expect(responses.filter((response) => !response.success)).toEqual([
            { success: false, reason: "project_assignment_changed" },
        ]);
        expect(
            await db
                .select()
                .from(organizationTable)
                .where(eq(organizationTable.autoProvisionedForUserId, userId)),
        ).toHaveLength(1);
    });

    it("does not provision a personal scope for an unauthorized source editor", async () => {
        await db
            .update(organizationMembershipTable)
            .set({ role: "moderator" })
            .where(eq(organizationMembershipTable.id, membershipId));
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "source",
            target: { kind: "no_project" },
        };
        await expect(
            requireConversationCapabilityBySlug({
                db,
                userId,
                conversationSlugId: data.conversationSlugId,
                capability: "conversation_edit",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(await db.select().from(organizationTable)).toHaveLength(1);
    });

    it("coordinates personal moves with personal organization creation from other flows", async () => {
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "source",
            target: { kind: "no_project" },
        };
        const [organization, response] = await Promise.all([
            getOrCreatePersonalOrganization({
                db,
                userId,
                autoProvisionedDefaultLanguage: "en",
            }),
            updateConversation({ db, userId, data }),
        ]);
        expect(response.success).toBe(true);
        expect(
            await db
                .select()
                .from(organizationTable)
                .where(eq(organizationTable.autoProvisionedForUserId, userId)),
        ).toHaveLength(1);
        const [personalProject] = await db
            .select()
            .from(projectTable)
            .where(
                eq(
                    projectTable.autoProvisionedForOrganizationId,
                    organization.organizationId,
                ),
            );
        expect(personalProject).toBeDefined();
        expect(
            (await db.select().from(conversationTable)).at(0)?.projectId,
        ).toBe(personalProject?.id);
    });

    it("identifies the personal No project scope separately from organizations", async () => {
        const [organization] = await db
            .insert(organizationTable)
            .values({
                slug: "personal-scope",
                displayName: "Facilitator",
                autoProvisionedForUserId: userId,
                defaultLanguageCode: "en",
                directoryVisibility: "unlisted",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        if (organization === undefined)
            throw new Error("Missing personal scope");
        const [membership] = await db
            .insert(organizationMembershipTable)
            .values({ organizationId: organization.id, userId, role: "admin" })
            .returning({ id: organizationMembershipTable.id });
        if (membership === undefined)
            throw new Error("Missing personal membership");
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_create",
                },
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_edit",
                },
            ]);
        const options = await getConversationProjectOptions({ db, userId });
        const personalScope = options.find(
            (option) =>
                option.target.kind === "no_project" &&
                option.target.organizationSlug === undefined,
        );
        expect(personalScope).toBeDefined();
        expect(
            options.filter((option) => option.target.kind === "no_project"),
        ).toHaveLength(2);
    });

    it("does not expose or move into another user's personal scope through an organization slug", async () => {
        const otherUserId = "00000000-0000-4000-8000-000000000002";
        await db
            .insert(userTable)
            .values({ id: otherUserId, username: "other-user" });
        const [personal] = await db
            .insert(organizationTable)
            .values({
                slug: "other-personal",
                displayName: "Other personal",
                autoProvisionedForUserId: otherUserId,
                defaultLanguageCode: "en",
                directoryVisibility: "unlisted",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        if (personal === undefined)
            throw new Error("Missing other personal organization");
        const [membership] = await db
            .insert(organizationMembershipTable)
            .values({ organizationId: personal.id, userId, role: "admin" })
            .returning({ id: organizationMembershipTable.id });
        if (membership === undefined)
            throw new Error("Missing other personal membership");
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_create",
                },
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_edit",
                },
            ]);
        const options = await getConversationProjectOptions({ db, userId });
        expect(
            options.filter(
                (option) =>
                    option.target.kind === "no_project" &&
                    option.target.organizationSlug === undefined,
            ),
        ).toHaveLength(1);
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "source",
            target: { kind: "no_project", organizationSlug: "other-personal" },
        };
        await expect(
            requireConversationDestination({
                db,
                userId,
                target: {
                    kind: "no_project",
                    organizationSlug: "other-personal",
                },
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(
            (await db.select().from(conversationTable)).at(0)?.projectId,
        ).toBe(sourceProjectId);
    });

    it("does not provision destination defaults for an unauthorized source editor", async () => {
        await db
            .update(organizationMembershipTable)
            .set({ role: "moderator" })
            .where(eq(organizationMembershipTable.id, membershipId));
        const [organization] = await db
            .insert(organizationTable)
            .values({
                slug: "other-owner",
                displayName: "Other",
                directoryVisibility: "listed",
                defaultLanguageCode: "en",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        if (organization === undefined)
            throw new Error("Missing organization fixture");
        const [membership] = await db
            .insert(organizationMembershipTable)
            .values({ organizationId: organization.id, userId, role: "admin" })
            .returning({ id: organizationMembershipTable.id });
        if (membership === undefined)
            throw new Error("Missing membership fixture");
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_create",
                },
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_edit",
                },
            ]);
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "source",
            target: { kind: "no_project", organizationSlug: "other-owner" },
        };
        await expect(
            requireConversationCapabilityBySlug({
                db,
                userId,
                conversationSlugId: data.conversationSlugId,
                capability: "conversation_edit",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(
            await db
                .select()
                .from(projectTable)
                .where(
                    eq(
                        projectTable.autoProvisionedForOrganizationId,
                        organization.id,
                    ),
                ),
        ).toHaveLength(0);
    });

    it("loads destination options in a bounded number of queries", async () => {
        const rows = await db
            .insert(projectTable)
            .values(
                Array.from(
                    { length: 12 },
                    (_, index) =>
                        ({
                            slug: `project-${index}`,
                            title: `Project ${index}`,
                            directoryVisibility: "listed",
                        }) satisfies typeof projectTable.$inferInsert,
                ),
            )
            .returning({ id: projectTable.id });
        await db
            .insert(projectOrganizationOwnershipTable)
            .values(
                rows.map((row) => ({ projectId: row.id, organizationId: 1 })),
            );
        const selects = vi.spyOn(db, "select");
        const options = await getConversationProjectOptions({ db, userId });
        expect(
            options.filter((option) => option.target.kind === "project"),
        ).toHaveLength(14);
        expect(selects).toHaveBeenCalledTimes(5);
        selects.mockRestore();
    });

    it("allows turning off inherited/explicit Email Updates while moving to a scope without the feature", async () => {
        await db
            .update(conversationTable)
            .set({ conversationEmailUpdateEnabledOverride: true })
            .where(eq(conversationTable.id, conversationId));
        const data = request();
        data.conversationEmailUpdateEnabledOverride = false;
        expect(
            await updateConversation({
                db,
                userId,
                data,
            }),
        ).toMatchObject({ success: true });
        expect(
            (await db.select().from(conversationTable)).at(0)
                ?.conversationEmailUpdateEnabledOverride,
        ).toBe(false);
    });

    it("preserves an unchanged analysis preference when ordinary settings are saved after entitlement expiry", async () => {
        await db
            .update(polisConversationConfigTable)
            .set({ preferredOpinionGroupCount: 3 });
        const data = request();
        data.projectChange = undefined;
        if (data.conversationTypeConfig.conversationType === "polis")
            data.conversationTypeConfig.preferredOpinionGroupCount = 3;
        expect(
            await updateConversation({
                db,
                userId,
                data,
            }),
        ).toMatchObject({ success: true });
        expect(
            (await db.select().from(polisConversationConfigTable)).at(0)
                ?.preferredOpinionGroupCount,
        ).toBe(3);
    });

    it.each([false, true])(
        "preserves unchanged translation settings in ordinary edits without access (translation=%s)",
        async (dynamicTranslationEnabled) => {
            await db
                .update(conversationTable)
                .set({ dynamicTranslationEnabled })
                .where(eq(conversationTable.id, conversationId));
            await db
                .update(conversationContentTable)
                .set({ sourceLanguageCode: "en" })
                .where(
                    eq(conversationContentTable.conversationId, conversationId),
                );
            await db.insert(conversationTranslationTargetLanguageTable).values([
                { conversationId, languageCode: "en" },
                { conversationId, languageCode: "fr" },
            ]);
            const data = request();
            data.projectChange = undefined;
            data.isIndexed = false;
            data.multilingualSetting = {
                dynamicTranslationEnabled,
                additionalLanguageCodes: ["fr"],
            };
            expect(
                await updateConversation({ db, userId, data }),
            ).toMatchObject({
                success: true,
                eagerContentTranslationWorkIds: [],
            });
            const [conversation] = await db
                .select()
                .from(conversationTable)
                .where(eq(conversationTable.id, conversationId));
            expect(conversation?.dynamicTranslationEnabled).toBe(
                dynamicTranslationEnabled,
            );
            expect(conversation?.isIndexed).toBe(false);
            expect(
                vi.mocked(createEagerContentTranslationWorkForKnownConversation)
                    .mock.lastCall?.[0].targetLanguagePolicy
                    .dynamicTranslationEnabled,
            ).toBe(false);
            expect(
                await db.select().from(conversationContentTable),
            ).toHaveLength(1);
        },
    );

    it.each([false, true])(
        "avoids translation-history reads when no grandfathering is needed (access=%s)",
        async (hasAccess) => {
            if (hasAccess) {
                await db.insert(premiumFeatureEntitlementTable).values({
                    organizationId: 1,
                    feature: "dynamic_translation",
                    startsAt: new Date(Date.now() - 60_000),
                });
            }
            const queries: string[] = [];
            const tracedDb = drizzle({
                client,
                logger: {
                    logQuery: (query) => {
                        queries.push(query);
                    },
                },
            });
            const data = request();
            data.projectChange = undefined;
            data.isIndexed = false;
            data.multilingualSetting.additionalLanguageCodes = hasAccess
                ? ["fr"]
                : [];
            expect(
                await updateConversation({ db: tracedDb, userId, data }),
            ).toMatchObject({ success: true });
            expect(
                queries.filter(
                    (query) =>
                        query.startsWith("select ") &&
                        query.includes(
                            '"conversation_translation_target_language"',
                        ),
                ),
            ).toHaveLength(0);
        },
    );

    it("rejects newly requested languages without access and leaves the conversation unchanged", async () => {
        const data = request();
        data.projectChange = undefined;
        data.isIndexed = false;
        data.multilingualSetting.additionalLanguageCodes = ["fr"];
        expect(await updateConversation({ db, userId, data })).toMatchObject({
            success: false,
            reason: "premium_access_required",
        });
        expect(
            (await db.select().from(conversationTable)).at(0)?.isIndexed,
        ).toBe(true);
    });

    it("does not carry existing premium languages into an unentitled destination", async () => {
        await db
            .insert(conversationTranslationTargetLanguageTable)
            .values({ conversationId, languageCode: "fr" });
        const data = request();
        data.multilingualSetting.additionalLanguageCodes = ["fr"];
        expect(await updateConversation({ db, userId, data })).toMatchObject({
            success: false,
            reason: "premium_access_required",
        });
        expect(
            (await db.select().from(conversationTable)).at(0)?.projectId,
        ).toBe(sourceProjectId);
    });

    it("authorizes inherited destination settings from the database rather than the submitted override", async () => {
        await db
            .update(projectTable)
            .set({ dynamicTranslationEnabled: true })
            .where(eq(projectTable.id, destinationProjectId));
        const data = request();
        data.languageSettingsSource = "project_inherited";
        expect(await updateConversation({ db, userId, data })).toMatchObject({
            success: false,
            reason: "premium_access_required",
        });
        expect(
            (await db.select().from(conversationTable)).at(0)?.projectId,
        ).toBe(sourceProjectId);
    });

    it("does not authorize content edits merely because expired translation settings can be preserved", async () => {
        await db
            .update(conversationContentTable)
            .set({ sourceLanguageCode: "en" })
            .where(eq(conversationContentTable.conversationId, conversationId));
        await db.insert(conversationTranslationTargetLanguageTable).values([
            { conversationId, languageCode: "en" },
            { conversationId, languageCode: "fr" },
        ]);
        const data = request();
        data.projectChange = undefined;
        data.multilingualSetting.additionalLanguageCodes = ["fr"];
        data.conversationTitle = "Unauthorized content change";
        expect(await updateConversation({ db, userId, data })).toMatchObject({
            success: false,
            reason: "premium_access_expired",
        });
        expect(await db.select().from(conversationContentTable)).toHaveLength(
            1,
        );
        expect(
            (await db.select().from(conversationContentTable)).at(0)?.title,
        ).toBe("Conversation");
    });

    it("allows disabling translation and reducing existing targets without access", async () => {
        await db
            .update(conversationTable)
            .set({ dynamicTranslationEnabled: true })
            .where(eq(conversationTable.id, conversationId));
        await db
            .update(conversationContentTable)
            .set({ sourceLanguageCode: "en" })
            .where(eq(conversationContentTable.conversationId, conversationId));
        await db.insert(conversationTranslationTargetLanguageTable).values([
            { conversationId, languageCode: "en" },
            { conversationId, languageCode: "fr" },
            { conversationId, languageCode: "es" },
        ]);
        const data = request();
        data.projectChange = undefined;
        data.multilingualSetting = {
            dynamicTranslationEnabled: false,
            additionalLanguageCodes: ["fr"],
        };
        expect(await updateConversation({ db, userId, data })).toMatchObject({
            success: true,
            eagerContentTranslationWorkIds: [],
        });
        expect(
            (await db.select().from(conversationTable)).at(0)
                ?.dynamicTranslationEnabled,
        ).toBe(false);
        const targets = await db
            .select({
                languageCode:
                    conversationTranslationTargetLanguageTable.languageCode,
            })
            .from(conversationTranslationTargetLanguageTable)
            .where(
                and(
                    eq(
                        conversationTranslationTargetLanguageTable.conversationId,
                        conversationId,
                    ),
                    isNull(
                        conversationTranslationTargetLanguageTable.deletedAt,
                    ),
                ),
            );
        expect(targets.map((target) => target.languageCode).sort()).toEqual([
            "en",
            "fr",
        ]);
    });

    it("preserves expired inherited settings without mistaking the project primary language for a manual target", async () => {
        await db
            .update(projectTable)
            .set({ dynamicTranslationEnabled: true })
            .where(eq(projectTable.id, sourceProjectId));
        await db
            .insert(projectTranslationTargetLanguageTable)
            .values({ projectId: sourceProjectId, languageCode: "fr" });
        await db
            .update(conversationTable)
            .set({
                dynamicTranslationEnabled: true,
                languageSettingsSource: "project_inherited",
            })
            .where(eq(conversationTable.id, conversationId));
        await db
            .update(conversationContentTable)
            .set({ sourceLanguageCode: "bs" })
            .where(eq(conversationContentTable.conversationId, conversationId));
        await db.insert(conversationTranslationTargetLanguageTable).values([
            { conversationId, languageCode: "en" },
            { conversationId, languageCode: "fr" },
        ]);
        const data = request();
        data.projectChange = undefined;
        data.languageSettingsSource = "project_inherited";
        data.isIndexed = false;
        expect(await updateConversation({ db, userId, data })).toMatchObject({
            success: true,
            eagerContentTranslationWorkIds: [],
        });
        const [conversation] = await db
            .select()
            .from(conversationTable)
            .where(eq(conversationTable.id, conversationId));
        expect(conversation?.dynamicTranslationEnabled).toBe(true);
        expect(conversation?.languageSettingsSource).toBe("project_inherited");
    });

    it("does not upgrade shared authorization locks during concurrent Email Update-enabled moves", async () => {
        const otherProjects = await db
            .insert(projectTable)
            .values([
                {
                    slug: "other-source",
                    title: "Other source",
                    directoryVisibility: "listed",
                },
                {
                    slug: "other-destination",
                    title: "Other destination",
                    directoryVisibility: "listed",
                },
            ])
            .returning({ id: projectTable.id });
        const [otherSource, otherDestination] = otherProjects;
        if (otherSource === undefined || otherDestination === undefined)
            throw new Error("Missing project fixtures");
        await db.insert(projectOrganizationOwnershipTable).values(
            otherProjects.map((project) => ({
                projectId: project.id,
                organizationId: 1,
            })),
        );
        const [config] = await db
            .insert(polisConversationConfigTable)
            .values({})
            .returning({ id: polisConversationConfigTable.id });
        if (config === undefined) throw new Error("Missing config fixture");
        const [otherConversation] = await db
            .insert(conversationTable)
            .values({
                slugId: "conv5678",
                projectId: otherSource.id,
                polisConfigId: config.id,
            })
            .returning({ id: conversationTable.id });
        if (otherConversation === undefined)
            throw new Error("Missing conversation fixture");
        const [content] = await db
            .insert(conversationContentTable)
            .values({
                conversationId: otherConversation.id,
                title: "Conversation",
            })
            .returning({ id: conversationContentTable.id });
        if (content === undefined) throw new Error("Missing content fixture");
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, otherConversation.id));
        await db.insert(premiumFeatureEntitlementTable).values({
            organizationId: 1,
            feature: "conversation_email_update",
            startsAt: new Date(Date.now() - 60_000),
        });
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values({
                organizationMembershipId: membershipId,
                capability: "conversation_email_update",
            });
        await db
            .update(projectTable)
            .set({ conversationEmailUpdateDefaultEnabled: true })
            .where(
                inArray(projectTable.id, [
                    destinationProjectId,
                    otherDestination.id,
                ]),
            );
        await db.insert(projectContactTable).values([
            {
                projectId: destinationProjectId,
                firstName: "Contact",
                email: "contact@example.com",
            },
            {
                projectId: otherDestination.id,
                firstName: "Contact",
                email: "contact@example.com",
            },
        ]);
        const second = request();
        second.conversationSlugId = "conv5678";
        second.projectChange = {
            expectedProjectSlug: "other-source",
            target: { kind: "project", projectSlug: "other-destination" },
        };
        const results = await Promise.all([
            updateConversation({
                db,
                userId,
                data: request(),
            }),
            updateConversation({
                db,
                userId,
                data: second,
            }),
        ]);
        expect(results.every((result) => result.success)).toBe(true);
    });

    it("resolves No Project to the selected organization's default", async () => {
        const data = request();
        data.projectChange = {
            expectedProjectSlug: "source",
            target: { kind: "no_project", organizationSlug: "owner" },
        };
        const response = await updateConversation({
            db,
            userId,
            data,
        });
        expect(response).toMatchObject({
            success: true,
            projectAssignment: {
                target: { kind: "no_project", organizationSlug: "owner" },
            },
        });
    });

    it("uses destination inherited languages and rejects unavailable entitlements", async () => {
        await db
            .insert(projectTranslationTargetLanguageTable)
            .values({ projectId: destinationProjectId, languageCode: "fr" });
        const data = request();
        data.languageSettingsSource = "project_inherited";
        expect(
            await updateConversation({
                db,
                userId,
                data,
            }),
        ).toMatchObject({ success: false, reason: "premium_access_required" });
        expect(
            (await db.select().from(conversationTable)).at(0)?.projectId,
        ).toBe(sourceProjectId);
    });
    it("validates the resulting language policy rather than the source project's old targets", async () => {
        await db
            .insert(conversationTranslationTargetLanguageTable)
            .values({ conversationId, languageCode: "fr" });
        expect(
            await updateConversation({
                db,
                userId,
                data: request(),
            }),
        ).toMatchObject({ success: true });
    });

    it("retains historical scope while enforcing current scope for new Email Updates", async () => {
        const [update] = await db
            .insert(conversationEmailUpdateTable)
            .values({
                projectId: sourceProjectId,
                scopeKind: "listed_project",
                createdByUserId: userId,
                authorizingOrganizationId: 1,
                authorizingPremiumFeatureId: 1,
                projectTitleSnapshot: "Source",
                replyToNameSnapshot: "Owner",
                replyToEmailSnapshot: "contact@example.com",
                subject: "Update",
                bodyHtml: "<p>Update</p>",
                bodyPlainText: "Update",
            })
            .returning({ id: conversationEmailUpdateTable.id });
        if (update === undefined)
            throw new Error("Missing Email Update fixture");
        const snapshot = {
            updateId: update.id,
            projectId: sourceProjectId,
            conversationId,
            conversationTitleSnapshot: "Conversation",
            conversationUrlSnapshot: "/project/source/conversation/conv1234/",
        };
        await db
            .insert(conversationEmailUpdateConversationTable)
            .values(snapshot);
        expect(
            await updateConversation({
                db,
                userId,
                data: request(),
            }),
        ).toMatchObject({ success: true });
        expect(
            (
                await db.select().from(conversationEmailUpdateConversationTable)
            ).at(0),
        ).toMatchObject(snapshot);
        await expect(
            db
                .insert(conversationEmailUpdateConversationTable)
                .values({ ...snapshot, updateId: update.id + 1 }),
        ).rejects.toThrow();
        await expect(
            db
                .insert(conversationProjectAssignmentTable)
                .values({ projectId: 999, conversationId }),
        ).rejects.toThrow();
        await expect(
            db
                .update(conversationProjectAssignmentTable)
                .set({ projectId: destinationProjectId })
                .where(
                    eq(
                        conversationProjectAssignmentTable.projectId,
                        sourceProjectId,
                    ),
                ),
        ).rejects.toThrow();
    });
});
