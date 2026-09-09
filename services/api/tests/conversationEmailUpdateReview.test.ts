import { randomUUID } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getTableConfig, withReplicas } from "drizzle-orm/pg-core";
import { parseHTML } from "linkedom";
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
import {
    createConversationEmailUpdateService,
    type ConversationEmailUpdateService,
} from "../src/service/conversationEmailUpdate.js";
import { lockConversationEmailUpdateProject } from "../src/service/conversationEmailUpdateProjectLock.js";
import {
    userTable,
    userDisplayLanguageTable,
    emailTable,
    organizationTable,
    organizationMembershipTable,
    organizationMembershipAllProjectCapabilityTable,
    premiumFeatureEntitlementTable,
    projectTable,
    projectContentTable,
    projectContactTable,
    projectOrganizationOwnershipTable,
    projectOrganizationAttributionTable,
    projectExternalOrganizationTable,
    polisConversationConfigTable,
    conversationTable,
    conversationContentTable,
    opinionTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateConversationTable,
    conversationEmailUpdateTestAttemptTable,
    conversationEmailUpdateDeliveryTable,
    conversationEmailUpdateUserProjectPreferenceTable,
} from "../src/shared-backend/schema.js";
import {
    Dto,
    type ConversationEmailUpdateDevComparisonRequest,
    type ConversationEmailUpdatePrepareDraftRequest,
} from "../src/shared/types/dto.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const owner = "00000000-0000-4000-8000-000000000001";
const participant = "00000000-0000-4000-8000-000000000002";
const past = new Date("2026-01-01T00:00:00Z");
const draft: ConversationEmailUpdatePrepareDraftRequest = {
    selection: {
        kind: "project",
        projectSlug: "river",
        conversationSlugIds: ["convo001"],
    },
    subject: "Our next steps",
    bodyHtml: "<p>Thank you for participating.</p>",
};

describe("locked Conversation Email Update reviews", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    let service: ConversationEmailUpdateService;
    const queries: string[] = [];

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "review_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "review_test",
            username: "postgres",
            password: "postgres",
            max: 8,
        });
        db = drizzle(client, {
            logger: {
                logQuery: (query) => {
                    queries.push(query);
                },
            },
        });
        service = createConversationEmailUpdateService({
            db,
            sendingEnabled: true,
            baseImageServiceUrl: "https://images.example.com/",
            siteBaseUrl: "https://agora.example.com",
        });
    }, 120_000);
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });
    beforeEach(async () => {
        // This connection exists only inside the disposable test container.
        await db.execute(
            sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`,
        );
        await db.execute(
            sql.raw(readDbFixtureSql("conversation-email-update-review.sql")),
        );
        await db.insert(userTable).values([
            { id: owner, username: "facilitator" },
            { id: participant, username: "participant" },
        ]);
        await db.insert(emailTable).values([
            { userId: owner, email: "owner@example.com", type: "primary" },
            {
                userId: participant,
                email: "participant@example.com",
                type: "primary",
            },
        ]);
        await db.insert(organizationTable).values({
            slug: "council",
            displayName: "Council",
            defaultLanguageCode: "en",
            directoryVisibility: "listed",
            isFullImagePath: false,
        });
        await db
            .insert(organizationMembershipTable)
            .values({ organizationId: 1, userId: owner });
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values({
                organizationMembershipId: 1,
                capability: "conversation_email_update",
            });
        await db.insert(premiumFeatureEntitlementTable).values({
            organizationId: 1,
            feature: "conversation_email_update",
            startsAt: past,
        });
        await db.insert(projectTable).values({
            slug: "river",
            title: "River District",
            directoryVisibility: "listed",
            conversationEmailUpdateDefaultEnabled: true,
        });
        await db.insert(projectContentTable).values({
            projectId: 1,
            title: "River District",
            bannerPath: "river.png",
        });
        await db
            .update(projectTable)
            .set({ currentContentId: 1 })
            .where(eq(projectTable.id, 1));
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId: 1, organizationId: 1 });
        await db.insert(projectContactTable).values({
            projectId: 1,
            firstName: "Alex",
            email: "contact@example.com",
        });
        await db.insert(polisConversationConfigTable).values({});
        await db
            .insert(conversationTable)
            .values({ projectId: 1, slugId: "convo001", polisConfigId: 1 });
        await db
            .insert(conversationContentTable)
            .values({ conversationId: 1, title: "A shared future" });
        await db
            .update(conversationTable)
            .set({ currentContentId: 1 })
            .where(eq(conversationTable.id, 1));
        await db.insert(opinionTable).values({
            slugId: "opinion1",
            authorId: participant,
            conversationId: 1,
            currentContentId: 1,
            createdAt: past,
        });
        await db
            .insert(conversationEmailUpdateUserProjectPreferenceTable)
            .values({
                userId: participant,
                projectId: 1,
                enabled: true,
                choiceSource: "settings",
                choiceAt: past,
            });
    });

    async function prepare() {
        const result = Dto.conversationEmailUpdatePrepareDraftResponse.parse(
            await service.prepareDraft({ userId: owner, request: draft }),
        );
        if (!result.success) throw new Error(JSON.stringify(result));
        return result.review;
    }
    it("snapshots real project owners, sponsors and partners and detects attribution changes", async () => {
        await db.insert(projectExternalOrganizationTable).values([
            {
                projectId: 1,
                displayName: "River Foundation",
                defaultLanguageCode: "en",
                imagePath: "foundation.png",
            },
            {
                projectId: 1,
                displayName: "Neighborhood Network",
                defaultLanguageCode: "en",
            },
        ]);
        await db.insert(projectOrganizationAttributionTable).values([
            { projectId: 1, role: "project_owner", organizationId: 1 },
            { projectId: 1, role: "sponsor", externalOrganizationId: 1 },
            { projectId: 1, role: "partner", externalOrganizationId: 2 },
        ]);
        const review = await prepare();
        expect(review.branding.attributions).toHaveLength(3);
        expect(review.preview.text).toContain("Project Owners\n- Council");
        expect(review.preview.text).toContain("Sponsors\n- River Foundation");
        expect(review.preview.text).toContain(
            "Partners\n- Neighborhood Network",
        );
        expect(review.preview.html).toContain("foundation.png");
        await db
            .update(projectExternalOrganizationTable)
            .set({ displayName: "New sponsor name" })
            .where(eq(projectExternalOrganizationTable.id, 1));
        const result = await service.sendTest({
            userId: owner,
            request: { updateId: review.updateId, requestId: randomUUID() },
        });
        expect(result.success).toBe(false);
    });
    async function acceptedTest(updateId: string) {
        const requestId = randomUUID();
        const result = await service.sendTest({
            userId: owner,
            request: { updateId, requestId },
        });
        expect(result).toMatchObject({
            success: true,
            testAttemptId: requestId,
        });
        await db
            .update(conversationEmailUpdateTestAttemptTable)
            .set({
                status: "provider_accepted",
                authorizedAt: new Date(),
                finishedAt: new Date(),
                providerMessageId: randomUUID(),
            })
            .where(
                eq(conversationEmailUpdateTestAttemptTable.publicId, requestId),
            );
        return {
            updateId,
            testAttemptId: requestId,
            displayedParticipantEstimate: 1,
            contentPolicyAcknowledged: true as const,
        };
    }

    async function waitForBlockedTransaction(blockerPid: number) {
        // The blocker PID makes interleavings deterministic, independent of query planning.
        await expect
            .poll(async () => {
                const [row] = await db
                    .select({
                        waiting: sql<boolean>`EXISTS (
                    SELECT 1 FROM pg_stat_activity
                    WHERE datname = current_database()
                        AND ${blockerPid} = ANY(pg_blocking_pids(pid))
                )`,
                    })
                    .from(userTable)
                    .limit(1);
                return row.waiting;
            })
            .toBe(true);
    }

    describe("read-only dev comparisons", () => {
        async function compare(
            request: ConversationEmailUpdateDevComparisonRequest = {
                ...draft,
                language: "en",
            },
        ) {
            const result =
                Dto.conversationEmailUpdateDevComparisonResponse.parse(
                    await service.compareDev({ userId: owner, request }),
                );
            if (!result.success) throw new Error(JSON.stringify(result));
            return result;
        }

        async function tableCounts() {
            const tables = await db
                .select({ name: sql<string>`tablename` })
                .from(sql`pg_tables`)
                .where(sql`schemaname = 'public'`);
            return await Promise.all(
                tables.map(async ({ name }) => ({
                    name,
                    rows: await db
                        .select({ count: count() })
                        .from(sql`${sql.identifier(name)}`),
                })),
            );
        }

        async function addConversation() {
            await db.insert(polisConversationConfigTable).values({});
            await db.insert(conversationTable).values({
                projectId: 1,
                slugId: "convo002",
                polisConfigId: 2,
            });
            await db.insert(conversationContentTable).values({
                conversationId: 2,
                title: "Another real conversation",
            });
            await db
                .update(conversationTable)
                .set({ currentContentId: 2 })
                .where(eq(conversationTable.id, 2));
        }

        it("renders real metadata and three production variants without writes, locks or audience queries", async () => {
            const before = await tableCounts();
            queries.length = 0;
            const result = await compare();
            const comparisonQueries = [...queries];
            expect(await tableCounts()).toEqual(before);
            expect(comparisonQueries.join("\n")).toContain("read only");
            expect(comparisonQueries.join("\n")).toContain("repeatable read");
            expect(comparisonQueries.join("\n")).not.toMatch(
                /\b(insert into|update |delete from|for update|for no key update|for share|for key share)\b/i,
            );
            expect(comparisonQueries.join("\n")).not.toMatch(
                /\b(from|join) "(email|opinion|vote|maxdiff_result|conversation_email_update|conversation_email_update_recipient|conversation_email_update_test_attempt|conversation_email_update_delivery|conversation_email_update_user_\w+)"/i,
            );
            expect(result.metadata).toEqual({
                senderName: "River District",
                replyToName: "Alex",
                replyToEmail: "contact@example.com",
                branding: {
                    name: "River District",
                    scopeKind: "project",
                    projectUrl: "https://agora.example.com/project/river/",
                    palette: "blue",
                    bannerImageUrl: "https://images.example.com/river.png",
                },
                language: "en",
                unsubscribeScope: "project",
                sendingEnabled: true,
            });
            expect(result.previews.ownerCopy.subject).toBe(
                "[Admin Copy] Our next steps",
            );
            expect(result.previews.test.subject).toBe("[TEST] Our next steps");
            expect(result.previews.participant.subject).toBe(draft.subject);
            for (const preview of Object.values(result.previews)) {
                expect(preview.text).toContain(
                    "A shared future: https://agora.example.com/project/river/conversation/convo001/",
                );
                expect(preview.html).toContain(
                    "https://images.example.com/river.png",
                );
                expect(preview.html).toContain("Content-Security-Policy");
                expect(preview.html).not.toMatch(/href=|<script|<form/);
                expect(preview.text).not.toMatch(
                    /owner@example.com|participant@example.com/,
                );
            }
            expect(result.previews.participant.text).toContain(
                "Manage preferences",
            );
            expect(result.previews.ownerCopy.text).toContain(
                "Report this update",
            );
            expect(result.previews.ownerCopy.text).not.toMatch(
                /Unsubscribe|Manage preferences|You opted in/,
            );
            expect(result.previews.test.text).not.toMatch(
                /Unsubscribe|Manage preferences|Report this update/,
            );
        });

        it("only limits the participant simulation and localizes the admin copy", async () => {
            await addConversation();
            const result = await compare({
                ...draft,
                selection: {
                    kind: "project",
                    projectSlug: "river",
                    conversationSlugIds: ["convo001", "convo002"],
                },
                participantConversationSlugIds: ["convo002"],
                language: "fr",
            });
            expect(result.metadata.language).toBe("fr");
            expect(result.previews.ownerCopy.subject).toBe(
                "[Copie admin] Our next steps",
            );
            expect(result.previews.ownerCopy.text).not.toMatch(
                /Se d\u00e9sabonner|G\u00e9rer les pr\u00e9f\u00e9rences/,
            );
            expect(result.previews.participant.text).toContain("convo002/");
            expect(result.previews.participant.text).not.toContain("convo001/");
            for (const preview of [
                result.previews.ownerCopy,
                result.previews.test,
            ]) {
                expect(preview.text).toContain("convo001/");
                expect(preview.text).toContain("convo002/");
            }
        });

        it("rejects foreign and authorized-but-unselected participant conversations", async () => {
            await addConversation();
            for (const slug of ["foreign1", "convo002"]) {
                expect(
                    await service.compareDev({
                        userId: owner,
                        request: {
                            ...draft,
                            language: "en",
                            participantConversationSlugIds: [slug],
                        },
                    }),
                ).toEqual({
                    success: false,
                    reason: "conversation_not_in_scope",
                });
            }
            expect(
                await service.compareDev({
                    userId: owner,
                    request: {
                        ...draft,
                        language: "en",
                        selection: {
                            kind: "project",
                            projectSlug: "river",
                            conversationSlugIds: ["foreign1"],
                        },
                    },
                }),
            ).toEqual({ success: false, reason: "conversation_not_in_scope" });
        });

        it("uses selected override scope even when another project conversation is disabled", async () => {
            await addConversation();
            await db
                .update(projectTable)
                .set({ conversationEmailUpdateDefaultEnabled: false });
            await db
                .update(conversationTable)
                .set({ conversationEmailUpdateEnabledOverride: true })
                .where(eq(conversationTable.slugId, "convo002"));
            const result = await compare({
                ...draft,
                language: "en",
                selection: {
                    kind: "project",
                    projectSlug: "river",
                    conversationSlugIds: ["convo002"],
                },
            });
            expect(result.metadata.unsubscribeScope).toBe("conversation");
        });

        it("allows global-off rendering without a verified test address or eligible audience", async () => {
            await db.update(emailTable).set({ isDeleted: true });
            await db
                .update(conversationEmailUpdateUserProjectPreferenceTable)
                .set({ enabled: false });
            service = createConversationEmailUpdateService({
                db,
                sendingEnabled: false,
                baseImageServiceUrl: "https://images.example.com/",
                siteBaseUrl: "https://agora.example.com",
            });
            try {
                expect((await compare()).metadata.sendingEnabled).toBe(false);
                expect(
                    await service.prepareDraft({
                        userId: owner,
                        request: draft,
                    }),
                ).toEqual({
                    success: false,
                    error: { reason: "sending_disabled" },
                });
                await db
                    .update(conversationTable)
                    .set({ conversationEmailUpdateEnabledOverride: false });
                expect(
                    await service.compareDev({
                        userId: owner,
                        request: { ...draft, language: "en" },
                    }),
                ).toEqual({
                    success: false,
                    reason: "configuration_disabled",
                });
            } finally {
                service = createConversationEmailUpdateService({
                    db,
                    sendingEnabled: true,
                    baseImageServiceUrl: "https://images.example.com/",
                    siteBaseUrl: "https://agora.example.com",
                });
            }
        });

        it.each([
            "capability",
            "entitlement",
            "expired",
            "future",
            "membership",
            "user",
            "project",
        ])(
            "returns scope_not_found for inactive %s authorization",
            async (kind) => {
                if (kind === "capability")
                    await db
                        .update(organizationMembershipAllProjectCapabilityTable)
                        .set({ deletedAt: new Date(), revokedByUserId: owner });
                if (kind === "entitlement")
                    await db
                        .update(premiumFeatureEntitlementTable)
                        .set({ revokedAt: new Date() });
                if (kind === "expired")
                    await db
                        .update(premiumFeatureEntitlementTable)
                        .set({ expiresAt: past });
                if (kind === "future")
                    await db
                        .update(premiumFeatureEntitlementTable)
                        .set({ startsAt: new Date("2100-01-01") });
                if (kind === "membership")
                    await db
                        .update(organizationMembershipTable)
                        .set({ deletedAt: new Date() });
                if (kind === "user")
                    await db
                        .update(userTable)
                        .set({ isDeleted: true })
                        .where(eq(userTable.id, owner));
                if (kind === "project")
                    await db
                        .update(projectTable)
                        .set({ deletedAt: new Date() });
                expect(
                    await service.compareDev({
                        userId: owner,
                        request: { ...draft, language: "en" },
                    }),
                ).toEqual({ success: false, reason: "scope_not_found" });
            },
        );

        it("does not disclose inaccessible or missing scopes", async () => {
            expect(
                await service.compareDev({
                    userId: participant,
                    request: { ...draft, language: "en" },
                }),
            ).toEqual({ success: false, reason: "scope_not_found" });
            expect(
                await service.compareDev({
                    userId: owner,
                    request: {
                        ...draft,
                        language: "en",
                        selection: {
                            kind: "project",
                            projectSlug: "missing",
                            conversationSlugIds: ["convo001"],
                        },
                    },
                }),
            ).toEqual({ success: false, reason: "scope_not_found" });
        });

        it("requires the real participant contact email", async () => {
            await db.update(projectContactTable).set({
                email: null,
                websiteUrl: "https://council.example.com",
            });
            expect(
                await service.compareDev({
                    userId: owner,
                    request: { ...draft, language: "en" },
                }),
            ).toEqual({
                success: false,
                reason: "missing_participant_contact_email",
            });
        });

        it.each([
            "\nOur next steps",
            "Our next steps\r",
            "\tOur next steps",
            "Our\u0000steps",
            "\u2028Our next steps",
            " ",
        ])("validates the raw subject %j before rendering", async (subject) => {
            queries.length = 0;
            expect(
                await service.compareDev({
                    userId: owner,
                    request: { ...draft, language: "en", subject },
                }),
            ).toEqual({
                success: false,
                reason: "content_invalid",
            });
            expect(queries).toEqual([]);
        });

        it("rejects normalized-empty content without any database access", async () => {
            queries.length = 0;
            expect(
                await service.compareDev({
                    userId: owner,
                    request: {
                        ...draft,
                        language: "en",
                        bodyHtml: "<p><br></p>",
                    },
                }),
            ).toEqual({
                success: false,
                reason: "content_invalid",
            });
            expect(queries).toEqual([]);
        });

        it.each(["organization", "personal"])(
            "resolves real No Project %s branding and URLs",
            async (kind) => {
                await db.update(projectTable).set({
                    autoProvisionedForOrganizationId: 1,
                    directoryVisibility: "unlisted",
                });
                await db.update(organizationTable).set({
                    imagePath: "council.png",
                    ...(kind === "personal"
                        ? {
                              autoProvisionedForUserId: owner,
                              directoryVisibility: "unlisted" as const,
                          }
                        : {}),
                });
                const result = await compare({
                    ...draft,
                    language: "en",
                    selection: {
                        kind: "no_project",
                        conversationSlugId: "convo001",
                    },
                });
                expect(result.metadata.senderName).toBe(
                    kind === "personal" ? "facilitator" : "Council",
                );
                expect(result.metadata.branding.imageUrl).toBe(
                    kind === "personal"
                        ? undefined
                        : "https://images.example.com/council.png",
                );
                expect(result.metadata.branding.bannerImageUrl).toBeUndefined();
                expect(result.metadata.unsubscribeScope).toBe("conversation");
                expect(result.previews.participant.text).toContain(
                    "https://agora.example.com/conversation/convo001/",
                );
                expect(result.previews.participant.text).not.toContain(
                    "/project/",
                );
            },
        );

        it("uses the writer rather than a stale replica", async () => {
            const replica = drizzle.mock();
            const replicaSelect = vi.spyOn(replica, "select");
            const writerService = createConversationEmailUpdateService({
                db: withReplicas(db, [replica]),
                sendingEnabled: true,
                baseImageServiceUrl: "https://images.example.com/",
                siteBaseUrl: "https://agora.example.com",
            });
            expect(
                await writerService.compareDev({
                    userId: owner,
                    request: { ...draft, language: "en" },
                }),
            ).toMatchObject({ success: true });
            expect(replicaSelect).not.toHaveBeenCalled();
        });
    });

    it("prepares snapshots without a test, delivery, active links or tokens", async () => {
        const review = await prepare();
        expect(review).toMatchObject({
            senderName: "River District",
            replyToName: "Alex",
            replyToEmail: "contact@example.com",
            testDestinationEmail: "owner@example.com",
            estimatedEligibleRecipientCount: 1,
            requiredOwnerCopyCount: 1,
            unsubscribeScope: "project",
            branding: {
                bannerImageUrl: "https://images.example.com/river.png",
            },
        });
        expect(review.preview.html).toContain("Content-Security-Policy");
        expect(review.preview.html).not.toMatch(
            /href=|preview\.invalid|<script/,
        );
        expect(review.preview.text).not.toContain("preview.invalid");
        expect(
            await db.select().from(conversationEmailUpdateTestAttemptTable),
        ).toHaveLength(0);
        expect(
            await db.select().from(conversationEmailUpdateDeliveryTable),
        ).toHaveLength(0);
        const [update] = await db.select().from(conversationEmailUpdateTable);
        expect(update).toMatchObject({
            reviewTestEmailCredentialId: 1,
            reviewTestEmailSnapshot: review.testDestinationEmail,
        });
        expect(review).not.toHaveProperty("reviewTestEmailCredentialId");
        expect(update.reviewExpiresAt?.getTime()).toBe(
            update.createdAt.getTime() + 86_400_000,
        );
        const [snapshot] = await db
            .select()
            .from(conversationEmailUpdateConversationTable);
        expect(snapshot.conversationUrlSnapshot).toBe(
            "https://agora.example.com/project/river/conversation/convo001/",
        );
    });

    it("uses the sender's saved language without invalidating a review after a language change", async () => {
        await db.insert(userDisplayLanguageTable).values([
            { userId: owner, languageCode: "fr" },
            { userId: participant, languageCode: "ja" },
        ]);
        const review = await prepare();
        expect(review.language).toBe("fr");
        expect(review.preview.subject).toBe(draft.subject);
        expect(review.preview.text).toContain("Se désabonner");
        expect(
            parseHTML(review.preview.html).document.documentElement.lang,
        ).toBe("fr");
        const before = await db.select().from(conversationEmailUpdateTable);

        await db
            .update(userDisplayLanguageTable)
            .set({ languageCode: "ar" })
            .where(eq(userDisplayLanguageTable.userId, owner));
        const request = await acceptedTest(review.updateId);
        expect(await db.select().from(conversationEmailUpdateTable)).toEqual(
            before,
        );

        const refreshed = await prepare();
        expect(refreshed.updateId).not.toBe(review.updateId);
        expect(refreshed.language).toBe("ar");
        const { document } = parseHTML(refreshed.preview.html);
        expect(document.documentElement.lang).toBe("ar");
        expect(document.documentElement.dir).toBe("rtl");
        expect(refreshed.preview.text).toContain(
            "Thank you for participating.",
        );
        expect(await service.send({ userId: owner, request })).toMatchObject({
            success: true,
        });
    });

    it("falls back to English when the sender has no saved display language", async () => {
        await db.insert(userDisplayLanguageTable).values({
            userId: participant,
            languageCode: "fr",
        });
        const review = await prepare();
        expect(review.language).toBe("en");
        expect(review.preview.subject).toBe(draft.subject);
        expect(review.preview.text).toContain("Unsubscribe");
        expect(
            parseHTML(review.preview.html).document.documentElement.lang,
        ).toBe("en");
    });

    it("creates an immutable test and coalesces simultaneous request retries", async () => {
        const review = await prepare();
        const before = await db.select().from(conversationEmailUpdateTable);
        const request = { updateId: review.updateId, requestId: randomUUID() };
        const results = await Promise.all([
            service.sendTest({ userId: owner, request }),
            service.sendTest({ userId: owner, request }),
        ]);
        expect(results[0]).toEqual(results[1]);
        expect(results[0]).toMatchObject({
            success: true,
            testAttemptId: request.requestId,
        });
        expect(
            await db.select().from(conversationEmailUpdateTestAttemptTable),
        ).toMatchObject([
            {
                destinationEmailCredentialId: 1,
                destinationEmailSnapshot: review.testDestinationEmail,
                status: "pending",
            },
        ]);
        expect(await db.select().from(conversationEmailUpdateTable)).toEqual(
            before,
        );
        await db
            .update(conversationEmailUpdateTestAttemptTable)
            .set({
                status: "provider_accepted",
                authorizedAt: new Date(),
                finishedAt: new Date(),
                providerMessageId: "accepted",
            })
            .where(
                eq(
                    conversationEmailUpdateTestAttemptTable.publicId,
                    request.requestId,
                ),
            );
        expect(await service.sendTest({ userId: owner, request })).toEqual(
            results[0],
        );
        expect(
            await service.getTestStatus({
                userId: owner,
                request: { testAttemptId: request.requestId },
            }),
        ).toMatchObject({
            success: true,
            status: { state: "provider_accepted" },
        });
    });

    it("reprepares identical content as a new review requiring its own test", async () => {
        const first = await prepare();
        const request = await acceptedTest(first.updateId);
        const second = await prepare();
        expect(second.updateId).not.toBe(first.updateId);
        expect(
            await service.send({
                userId: owner,
                request: { ...request, updateId: second.updateId },
            }),
        ).toEqual({ success: false, reason: "test_not_found" });
        expect(
            await service.sendTest({
                userId: owner,
                request: {
                    updateId: second.updateId,
                    requestId: request.testAttemptId,
                },
            }),
        ).toEqual({ success: false, error: { reason: "request_id_conflict" } });
    });

    it("does not let another user test, send, cancel, poll or preview a review", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        expect(
            await service.sendTest({
                userId: participant,
                request: { updateId: review.updateId, requestId: randomUUID() },
            }),
        ).toEqual({ success: false, error: { reason: "review_not_found" } });
        expect(await service.send({ userId: participant, request })).toEqual({
            success: false,
            reason: "review_not_found",
        });
        expect(
            await service.cancelDraft({ userId: participant, request }),
        ).toEqual({ success: false, reason: "review_not_found" });
        expect(
            await service.getTestStatus({ userId: participant, request }),
        ).toEqual({ success: false, reason: "test_not_found" });
        expect(
            await service.previewHistory({
                userId: participant,
                request: { updateId: review.updateId, language: "en" },
            }),
        ).toEqual({ success: false, reason: "update_not_found" });
    });

    it("allows sender cancellation after capability revocation, idempotently", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        await db
            .update(organizationMembershipAllProjectCapabilityTable)
            .set({ deletedAt: new Date(), revokedByUserId: owner });
        expect(await service.cancelDraft({ userId: owner, request })).toEqual({
            success: true,
        });
        const [cancelled] = await db
            .select()
            .from(conversationEmailUpdateTable);
        expect(await service.cancelDraft({ userId: owner, request })).toEqual({
            success: true,
        });
        expect(await db.select().from(conversationEmailUpdateTable)).toEqual([
            cancelled,
        ]);
        expect(await service.send({ userId: owner, request })).toEqual({
            success: false,
            reason: "review_cancelled",
        });
        expect(
            await service.sendTest({
                userId: owner,
                request: { updateId: review.updateId, requestId: randomUUID() },
            }),
        ).toEqual({ success: false, error: { reason: "review_cancelled" } });
        expect(await service.getTestStatus({ userId: owner, request })).toEqual(
            { success: false, reason: "review_cancelled" },
        );
    });

    it("rejects expired reviews and old template versions", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        await db.update(conversationEmailUpdateTable).set({
            createdAt: past,
            reviewExpiresAt: new Date(past.getTime() + 86_400_000),
        });
        expect(await service.send({ userId: owner, request })).toEqual({
            success: false,
            reason: "review_expired",
        });
        expect(
            await service.sendTest({
                userId: owner,
                request: { updateId: review.updateId, requestId: randomUUID() },
            }),
        ).toEqual({ success: false, error: { reason: "review_expired" } });
        await db
            .update(conversationEmailUpdateTable)
            .set({ templateVersion: "old-template" });
        expect(await service.send({ userId: owner, request })).toEqual({
            success: false,
            reason: "review_required",
        });
    });

    it.each(["contact", "scope", "branding", "conversation"] as const)(
        "requires a new review when %s changes",
        async (kind) => {
            const review = await prepare();
            const request = await acceptedTest(review.updateId);
            if (kind === "contact")
                await db
                    .update(projectContactTable)
                    .set({ email: "changed@example.com" });
            if (kind === "scope") {
                await db
                    .update(projectTable)
                    .set({ conversationEmailUpdateDefaultEnabled: false });
                await db
                    .update(conversationTable)
                    .set({ conversationEmailUpdateEnabledOverride: true });
            }
            if (kind === "branding")
                await db
                    .update(projectContentTable)
                    .set({ bannerPath: "new.png" });
            if (kind === "conversation")
                await db
                    .update(conversationContentTable)
                    .set({ title: "A different title" });
            expect(await service.send({ userId: owner, request })).toEqual({
                success: false,
                reason: "review_required",
            });
            expect(
                await service.sendTest({
                    userId: owner,
                    request: {
                        updateId: review.updateId,
                        requestId: randomUUID(),
                    },
                }),
            ).toEqual({ success: false, error: { reason: "review_required" } });
        },
    );

    it("serializes concurrent cancellation and final acceptance", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        const [sent, cancelled] = await Promise.all([
            service.send({ userId: owner, request }),
            service.cancelDraft({
                userId: owner,
                request: { updateId: review.updateId },
            }),
        ]);
        expect(Number(sent.success) + Number(cancelled.success)).toBe(1);
        const [update] = await db.select().from(conversationEmailUpdateTable);
        const deliveries = await db
            .select()
            .from(conversationEmailUpdateDeliveryTable);
        if (sent.success) {
            expect(cancelled).toEqual({
                success: false,
                reason: "delivery_already_accepted",
            });
            expect(update.cancelledAt).toBeNull();
            expect(deliveries).toHaveLength(1);
        } else {
            expect(sent).toEqual({
                success: false,
                reason: "review_cancelled",
            });
            expect(update.cancelledAt).not.toBeNull();
            expect(deliveries).toHaveLength(0);
        }
    });

    it("replays final acceptance by update ID and previews stored history after context drift", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        expect(await service.send({ userId: owner, request })).toMatchObject({
            success: true,
        });
        await db.update(projectTable).set({
            title: "Changed project",
            conversationEmailUpdateDefaultEnabled: false,
        });
        await db.update(projectContentTable).set({ bannerPath: "changed.png" });
        expect(
            await service.send({
                userId: owner,
                request: { ...request, testAttemptId: randomUUID() },
            }),
        ).toMatchObject({ success: true });
        expect(
            await db.select().from(conversationEmailUpdateDeliveryTable),
        ).toHaveLength(1);
        const preview = await service.previewHistory({
            userId: owner,
            request: { updateId: review.updateId, language: "en" },
        });
        expect(preview).toEqual({
            success: true,
            reconstructed: false,
            preview: review.preview,
        });
        const translated = await service.previewHistory({
            userId: owner,
            request: { updateId: review.updateId, language: "fr" },
        });
        expect(translated).toMatchObject({
            success: true,
            reconstructed: false,
            preview: { subject: draft.subject },
        });
        await db.update(conversationEmailUpdateTable).set({
            reviewExpiresAt: null,
            templateVersion: null,
            participantPreferenceScopeSnapshot: null,
            brandingSnapshot: null,
            reviewTestEmailCredentialId: null,
            reviewTestEmailSnapshot: null,
        });
        expect(
            await service.previewHistory({
                userId: owner,
                request: { updateId: review.updateId, language: "en" },
            }),
        ).toMatchObject({ success: true, reconstructed: true });
    });

    it("keeps legacy pending rows readable but unable to authorize a new final send", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        await db.update(conversationEmailUpdateTable).set({
            reviewExpiresAt: null,
            templateVersion: null,
            participantPreferenceScopeSnapshot: null,
            brandingSnapshot: null,
            reviewTestEmailCredentialId: null,
            reviewTestEmailSnapshot: null,
        });
        expect(
            await service.getTestStatus({ userId: owner, request }),
        ).toMatchObject({
            success: true,
            status: { state: "provider_accepted" },
        });
        expect(await service.send({ userId: owner, request })).toEqual({
            success: false,
            reason: "review_required",
        });
        expect(
            await service.sendTest({
                userId: owner,
                request: { updateId: review.updateId, requestId: randomUUID() },
            }),
        ).toEqual({ success: false, error: { reason: "review_required" } });
    });

    it("bounds snapshot creation and rejects partial review metadata in PostgreSQL", async () => {
        const review = await prepare();
        await expect(
            db
                .update(conversationEmailUpdateTable)
                .set({ templateVersion: null }),
        ).rejects.toThrow();
        for (let index = 1; index < 10; index++) await prepare();
        expect(
            await service.prepareDraft({ userId: owner, request: draft }),
        ).toMatchObject({
            success: false,
            error: { reason: "review_rate_limited" },
        });
        expect(
            await db.select().from(conversationEmailUpdateTable),
        ).toHaveLength(10);
        expect(
            await service.cancelDraft({
                userId: owner,
                request: { updateId: review.updateId },
            }),
        ).toEqual({ success: true });
        expect(
            await service.prepareDraft({ userId: owner, request: draft }),
        ).toMatchObject({
            success: false,
            error: { reason: "review_rate_limited" },
        });
    });

    it("follow-up: does not authorize a snapshot using time captured before a project lock wait", async () => {
        const now = Date.now();
        await db
            .update(premiumFeatureEntitlementTable)
            .set({ expiresAt: new Date(now + 60_000) });
        let reportLocked: (() => void) | undefined;
        const locked = new Promise<void>((resolve) => {
            reportLocked = resolve;
        });
        let release: (() => void) | undefined;
        const holdLock = new Promise<void>((resolve) => {
            release = resolve;
        });
        const blocker = db.transaction(async (tx) => {
            await tx
                .select({ id: projectTable.id })
                .from(projectTable)
                .where(eq(projectTable.id, 1))
                .for("update");
            reportLocked?.();
            await holdLock;
        });
        await locked;
        vi.useFakeTimers({ toFake: ["Date"] });
        const prepared = service.prepareDraft({
            userId: owner,
            request: draft,
        });
        try {
            // PostgreSQL lock diagnostics make the race deterministic without sleep timing.
            await expect
                .poll(async () => {
                    const [row] = await db
                        .select({
                            waiting: sql<boolean>`EXISTS (
                    SELECT 1 FROM pg_stat_activity
                    WHERE datname = current_database() AND wait_event_type = 'Lock'
                )`,
                        })
                        .from(userTable)
                        .limit(1);
                    return row.waiting;
                })
                .toBe(true);
            vi.setSystemTime(now + 120_000);
            release?.();
            await blocker;
            expect(await prepared).toMatchObject({ success: false });
            expect(
                await db.select().from(conversationEmailUpdateTable),
            ).toHaveLength(0);
        } finally {
            release?.();
            await blocker;
            await prepared;
            vi.useRealTimers();
        }
    });

    it.each(["prepare", "test", "final"] as const)(
        "lock audit: %s does not deadlock with a new unsubscribe preference",
        async (operation) => {
            const review = await prepare();
            const request = await acceptedTest(review.updateId);
            // Generated fixtures omit FKs; restore the production preference checks here.
            await db.execute(sql`
                ALTER TABLE ${conversationEmailUpdateUserProjectPreferenceTable}
                    ADD CONSTRAINT review_preference_project_fk FOREIGN KEY (project_id)
                        REFERENCES ${projectTable} (id),
                    ADD CONSTRAINT review_preference_user_fk FOREIGN KEY (user_id)
                        REFERENCES ${userTable} (id)
            `);
            let outcome:
                | Promise<PromiseSettledResult<{ success: boolean }>[]>
                | undefined;
            try {
                await db.transaction(async (tx) => {
                    const [session] = await tx
                        .select({ pid: sql<number>`pg_backend_pid()` })
                        .from(userTable)
                        .where(eq(userTable.id, owner))
                        .for("update");
                    const pending =
                        operation === "prepare"
                            ? service.prepareDraft({
                                  userId: owner,
                                  request: draft,
                              })
                            : operation === "test"
                              ? service.sendTest({
                                    userId: owner,
                                    request: {
                                        updateId: review.updateId,
                                        requestId: randomUUID(),
                                    },
                                })
                              : service.send({ userId: owner, request });
                    outcome = Promise.allSettled([pending]);
                    await waitForBlockedTransaction(session.pid);
                    await tx
                        .insert(
                            conversationEmailUpdateUserProjectPreferenceTable,
                        )
                        .values({
                            userId: owner,
                            projectId: 1,
                            enabled: false,
                            choiceAt: new Date(),
                            choiceSource: "unsubscribe",
                        });
                });
                await expect(outcome).resolves.toMatchObject([
                    { status: "fulfilled", value: { success: true } },
                ]);
            } finally {
                await outcome;
            }
        },
    );

    it.each(["update", "no key update"] as const)(
        "lock audit: review project locks still serialize against %s locks",
        async (lockMode) => {
            await db.transaction(async (tx) => {
                expect(
                    await lockConversationEmailUpdateProject({
                        db: tx,
                        projectId: 1,
                        lockMode: "no key update",
                    }),
                ).toBe(true);
                await expect(
                    db.transaction(async (other) => {
                        await other.execute(
                            sql`SET LOCAL lock_timeout = '100ms'`,
                        );
                        return await lockConversationEmailUpdateProject({
                            db: other,
                            projectId: 1,
                            lockMode,
                        });
                    }),
                ).rejects.toMatchObject({ cause: { code: "55P03" } });
            });
        },
    );

    it.each(["owner", "entitlement"] as const)(
        "lock audit: final send rejects entitlement expiry while waiting for %s locks",
        async (lockedResource) => {
            const review = await prepare();
            const request = await acceptedTest(review.updateId);
            const now = Date.now();
            await db
                .update(premiumFeatureEntitlementTable)
                .set({ expiresAt: new Date(now + 60_000) });
            let outcome:
                | Promise<PromiseSettledResult<{ success: boolean }>[]>
                | undefined;
            vi.useFakeTimers({ toFake: ["Date"] });
            try {
                await db.transaction(async (tx) => {
                    if (lockedResource === "owner") {
                        await tx
                            .select({ id: organizationTable.id })
                            .from(organizationTable)
                            .where(eq(organizationTable.id, 1))
                            .for("update");
                    } else {
                        await tx
                            .select({ id: premiumFeatureEntitlementTable.id })
                            .from(premiumFeatureEntitlementTable)
                            .where(eq(premiumFeatureEntitlementTable.id, 1))
                            .for("update");
                    }
                    const [session] = await tx
                        .select({ pid: sql<number>`pg_backend_pid()` })
                        .from(userTable)
                        .limit(1);
                    outcome = Promise.allSettled([
                        service.send({ userId: owner, request }),
                    ]);
                    await waitForBlockedTransaction(session.pid);
                    vi.setSystemTime(now + 120_000);
                });
                await expect(outcome).resolves.toMatchObject([
                    {
                        status: "fulfilled",
                        value: { success: false, reason: "sending_disabled" },
                    },
                ]);
                expect(
                    await db
                        .select()
                        .from(conversationEmailUpdateDeliveryTable),
                ).toHaveLength(0);
            } finally {
                await outcome;
                vi.useRealTimers();
            }
        },
    );

    it("follow-up: rejects malformed stored branding without throwing", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        await db.update(conversationEmailUpdateTable).set({
            brandingSnapshot: {
                name: "River District",
                palette: "blue",
                imageUrl: "not a URL",
            },
        });
        expect(await service.send({ userId: owner, request })).toEqual({
            success: false,
            reason: "review_required",
        });
        expect(
            await service.sendTest({
                userId: owner,
                request: { updateId: review.updateId, requestId: randomUUID() },
            }),
        ).toEqual({ success: false, error: { reason: "review_required" } });
    });

    it.each(["address", "credential"] as const)(
        "frozen destination: refuses the first test after the primary %s changes",
        async (changed) => {
            const review = await prepare();
            const before = await db.select().from(conversationEmailUpdateTable);
            if (changed === "address") {
                await db
                    .update(emailTable)
                    .set({ email: "new-owner@example.com" })
                    .where(eq(emailTable.userId, owner));
            } else {
                await db
                    .update(emailTable)
                    .set({ isDeleted: true })
                    .where(eq(emailTable.userId, owner));
                await db.insert(emailTable).values({
                    userId: owner,
                    email: "owner@example.com",
                    type: "primary",
                });
            }
            expect(
                await service.sendTest({
                    userId: owner,
                    request: {
                        updateId: review.updateId,
                        requestId: randomUUID(),
                    },
                }),
            ).toEqual({ success: false, error: { reason: "review_required" } });
            expect(
                await db.select().from(conversationEmailUpdateTestAttemptTable),
            ).toHaveLength(0);
            expect(
                await db.select().from(conversationEmailUpdateDeliveryTable),
            ).toHaveLength(0);
            expect(
                await db.select().from(conversationEmailUpdateTable),
            ).toEqual(before);
            const refreshed = await prepare();
            expect(refreshed.testDestinationEmail).toBe(
                changed === "address"
                    ? "new-owner@example.com"
                    : "owner@example.com",
            );
            await acceptedTest(refreshed.updateId);
        },
    );

    it.each(["pending", "provider_accepted"] as const)(
        "frozen destination: replays a %s test request after a primary change without requeueing",
        async (status) => {
            const review = await prepare();
            const request = {
                updateId: review.updateId,
                requestId: randomUUID(),
            };
            const first = await service.sendTest({ userId: owner, request });
            expect(first).toMatchObject({ success: true });
            if (status === "provider_accepted") {
                await db.update(conversationEmailUpdateTestAttemptTable).set({
                    status,
                    authorizedAt: new Date(),
                    finishedAt: new Date(),
                    providerMessageId: randomUUID(),
                });
            }
            const attempts = await db
                .select()
                .from(conversationEmailUpdateTestAttemptTable);
            await db
                .update(emailTable)
                .set({ email: "new-owner@example.com" })
                .where(eq(emailTable.userId, owner));
            expect(await service.sendTest({ userId: owner, request })).toEqual(
                first,
            );
            expect(
                await service.sendTest({
                    userId: owner,
                    request: { ...request, requestId: randomUUID() },
                }),
            ).toEqual({ success: false, error: { reason: "review_required" } });
            expect(
                await db.select().from(conversationEmailUpdateTestAttemptTable),
            ).toEqual(attempts);
        },
    );

    it.each(["cancelled", "expired"] as const)(
        "frozen destination: does not replay test requests for %s reviews",
        async (state) => {
            const review = await prepare();
            const request = {
                updateId: review.updateId,
                requestId: randomUUID(),
            };
            expect(
                await service.sendTest({ userId: owner, request }),
            ).toMatchObject({ success: true });
            if (state === "cancelled") {
                expect(
                    await service.cancelDraft({ userId: owner, request }),
                ).toEqual({ success: true });
            } else {
                await db.update(conversationEmailUpdateTable).set({
                    createdAt: past,
                    reviewExpiresAt: new Date(past.getTime() + 86_400_000),
                });
            }
            expect(await service.sendTest({ userId: owner, request })).toEqual({
                success: false,
                error: {
                    reason:
                        state === "cancelled"
                            ? "review_cancelled"
                            : "review_expired",
                },
            });
            expect(
                await db.select().from(conversationEmailUpdateTestAttemptTable),
            ).toHaveLength(1);
        },
    );

    it.each([
        {
            name: "missing credential",
            fields: { reviewTestEmailCredentialId: null },
        },
        { name: "missing address", fields: { reviewTestEmailSnapshot: null } },
        {
            name: "missing pair",
            fields: {
                reviewTestEmailCredentialId: null,
                reviewTestEmailSnapshot: null,
            },
        },
        {
            name: "pair without review",
            fields: {
                reviewExpiresAt: null,
                templateVersion: null,
                brandingSnapshot: null,
                participantPreferenceScopeSnapshot: null,
            },
        },
    ])(
        "frozen destination: PostgreSQL rejects $name metadata",
        async ({ fields }) => {
            await prepare();
            await expect(
                db.update(conversationEmailUpdateTable).set(fields),
            ).rejects.toMatchObject({
                cause: {
                    code: "23514",
                    constraint_name:
                        "conversation_email_update_review_fields_check",
                },
            });
        },
    );

    it.each([
        "Owner@example.com",
        " owner@example.com",
        "owner@example.com ",
        "",
        "   ",
    ])(
        "frozen destination: PostgreSQL rejects noncanonical snapshot %j",
        async (reviewTestEmailSnapshot) => {
            await prepare();
            await expect(
                db
                    .update(conversationEmailUpdateTable)
                    .set({ reviewTestEmailSnapshot }),
            ).rejects.toMatchObject({
                cause: {
                    code: "23514",
                    constraint_name:
                        "conversation_email_update_review_test_email_canonical_check",
                },
            });
        },
    );

    it("frozen destination: the canonical schema binds the credential to the review creator", () => {
        const key = getTableConfig(
            conversationEmailUpdateTable,
        ).foreignKeys.find(
            (key) =>
                key.getName() ===
                "email_update_review_test_destination_owner_fk",
        );
        expect(key?.reference().columns.map((column) => column.name)).toEqual([
            "created_by_user_id",
            "review_test_email_credential_id",
        ]);
        expect(
            key?.reference().foreignColumns.map((column) => column.name),
        ).toEqual(["user_id", "id"]);
        expect(key?.reference().foreignTable).toBe(emailTable);
    });

    it("follow-up: requires a fresh review and accepted test after the primary email changes", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        await db
            .update(emailTable)
            .set({ email: "new-owner@example.com" })
            .where(eq(emailTable.userId, owner));
        expect(await service.send({ userId: owner, request })).toEqual({
            success: false,
            reason: "test_not_accepted",
        });
        expect(
            await db.select().from(conversationEmailUpdateDeliveryTable),
        ).toHaveLength(0);
        const refreshed = await prepare();
        const retested = await acceptedTest(refreshed.updateId);
        expect(
            await service.send({ userId: owner, request: retested }),
        ).toMatchObject({ success: true });
    });

    it("follow-up: rejects a different primary credential even with the same destination", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        await db
            .update(emailTable)
            .set({ type: "backup", email: "old-owner@example.com" })
            .where(eq(emailTable.userId, owner));
        await db.insert(emailTable).values({
            userId: owner,
            email: "owner@example.com",
            type: "primary",
        });
        expect(await service.send({ userId: owner, request })).toEqual({
            success: false,
            reason: "test_not_accepted",
        });
    });

    it("follow-up: rejects deleted creators despite a previously authenticated user ID", async () => {
        const review = await prepare();
        await db
            .update(userTable)
            .set({ isDeleted: true })
            .where(eq(userTable.id, owner));
        expect(
            await service.cancelDraft({
                userId: owner,
                request: { updateId: review.updateId },
            }),
        ).toEqual({ success: false, reason: "review_not_found" });
        expect(
            await service.prepareDraft({ userId: owner, request: draft }),
        ).toMatchObject({ success: false });
        expect(
            await service.sendTest({
                userId: owner,
                request: { updateId: review.updateId, requestId: randomUUID() },
            }),
        ).toEqual({ success: false, error: { reason: "review_not_found" } });
    });

    it("follow-up: checks history preview authorization on the primary after revocation", async () => {
        const review = await prepare();
        const request = await acceptedTest(review.updateId);
        expect(await service.send({ userId: owner, request })).toMatchObject({
            success: true,
        });
        const primaryOnlyService = createConversationEmailUpdateService({
            db: withReplicas(db, [db], () => {
                throw new Error("Stale replica must not authorize a preview");
            }),
            sendingEnabled: true,
            baseImageServiceUrl: "https://images.example.com/",
            siteBaseUrl: "https://agora.example.com",
        });
        expect(
            await primaryOnlyService.previewHistory({
                userId: owner,
                request: { updateId: review.updateId, language: "en" },
            }),
        ).toMatchObject({ success: true });
        await db
            .update(organizationMembershipAllProjectCapabilityTable)
            .set({ deletedAt: new Date(), revokedByUserId: owner });
        expect(
            await primaryOnlyService.previewHistory({
                userId: owner,
                request: { updateId: review.updateId, language: "en" },
            }),
        ).toEqual({ success: false, reason: "update_not_found" });
    });

    it.each(["capability", "entitlement", "url"] as const)(
        "follow-up: rejects stale %s review authorization for new tests and sends",
        async (kind) => {
            const review = await prepare();
            const request = await acceptedTest(review.updateId);
            if (kind === "capability")
                await db
                    .update(organizationMembershipAllProjectCapabilityTable)
                    .set({ deletedAt: new Date(), revokedByUserId: owner });
            if (kind === "entitlement")
                await db
                    .update(premiumFeatureEntitlementTable)
                    .set({ revokedAt: new Date() });
            if (kind === "url")
                await db
                    .update(conversationEmailUpdateConversationTable)
                    .set({ conversationUrlSnapshot: null });
            expect(await service.send({ userId: owner, request })).toEqual({
                success: false,
                reason: "review_required",
            });
            expect(
                await service.sendTest({
                    userId: owner,
                    request: {
                        updateId: review.updateId,
                        requestId: randomUUID(),
                    },
                }),
            ).toEqual({ success: false, error: { reason: "review_required" } });
        },
    );

    it.each([
        "not a URL",
        "https://[invalid",
        "javascript:alert(1)",
        "https://tracker.example.com/banner.png",
        "https://images.example.com.evil.example/banner.png",
        "https://user:password@images.example.com/banner.png",
        "http://images.example.com/banner.png",
        "https://images.example.com:8443/banner.png",
    ])(
        "follow-up: excludes untrusted image %s from review snapshots",
        async (bannerPath) => {
            await db
                .update(projectContentTable)
                .set({ bannerPath, bannerIsFullPath: true });
            const review = await prepare();
            expect(review.branding.bannerImageUrl).toBeUndefined();
            const [update] = await db
                .select()
                .from(conversationEmailUpdateTable);
            expect(update.brandingSnapshot?.bannerImageUrl).toBeUndefined();
        },
    );

    it("follow-up: enforces the test rate limit across reviews under concurrency without charging retries", async () => {
        const first = await prepare();
        const second = await prepare();
        const requests = Array.from({ length: 11 }, (_, index) => ({
            updateId: index % 2 === 0 ? first.updateId : second.updateId,
            requestId: randomUUID(),
        }));
        const results = await Promise.all(
            requests.map((request) =>
                service.sendTest({ userId: owner, request }),
            ),
        );
        expect(results.filter((result) => result.success)).toHaveLength(10);
        expect(results.filter((result) => !result.success)).toMatchObject([
            { success: false, error: { reason: "test_rate_limited" } },
        ]);
        const accepted = results.find((result) => result.success);
        if (accepted === undefined || !accepted.success)
            throw new Error("Expected an accepted test request");
        expect(
            await service.sendTest({
                userId: owner,
                request: {
                    updateId: accepted.updateId,
                    requestId: accepted.testAttemptId,
                },
            }),
        ).toEqual(accepted);
        expect(
            await db.select().from(conversationEmailUpdateTestAttemptTable),
        ).toHaveLength(10);
    });

    it("follow-up: enforces the daily test limit independently of the hourly limit", async () => {
        const review = await prepare();
        const [update] = await db.select().from(conversationEmailUpdateTable);
        const [email] = await db
            .select()
            .from(emailTable)
            .where(eq(emailTable.userId, owner));
        await db.insert(conversationEmailUpdateTestAttemptTable).values(
            Array.from({ length: 30 }, () => ({
                updateId: update.id,
                status: "pending" as const,
                requestedByUserId: owner,
                destinationEmailCredentialId: email.id,
                destinationEmailSnapshot: email.email,
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            })),
        );
        expect(
            await service.sendTest({
                userId: owner,
                request: { updateId: review.updateId, requestId: randomUUID() },
            }),
        ).toMatchObject({
            success: false,
            error: { reason: "test_rate_limited" },
        });
    });

    it("accepts only locked IDs for test requests", () => {
        expect(
            Dto.conversationEmailUpdateSendTestRequest.safeParse(draft).success,
        ).toBe(false);
        expect(
            Dto.conversationEmailUpdateSendTestRequest.safeParse({
                updateId: randomUUID(),
                requestId: randomUUID(),
                subject: "mutated",
            }).success,
        ).toBe(false);
    });
});
