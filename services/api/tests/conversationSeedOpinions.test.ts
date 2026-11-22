import { randomUUID } from "node:crypto";
import { v3 } from "@google-cloud/translate";
import { count, eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import {
    conversationContentTable,
    conversationModerationTable,
    conversationTable,
    opinionContentTable,
    opinionTable,
    opinionGroupSpecTable,
    opinionModerationTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    polisConversationConfigTable,
    projectOrganizationOwnershipTable,
    projectTable,
    rankingConversationConfigTable,
    qvConfigTable,
    rankingItemTable,
    rankingItemContentTable,
    comparisonResponseTable,
    comparisonAnswerTable,
    deviceTable,
    emailTable,
    userTable,
    voteContentTable,
    voteTable,
    premiumFeatureEntitlementTable,
} from "../src/shared-backend/schema.js";
import {
    getConversationForEdit,
    updateConversation,
} from "../src/service/postEdit.js";
import { postNewOpinion } from "../src/service/comment.js";
import { requireConversationCapabilityBySlug } from "../src/service/organizationAuthorization.js";
import { createConversationWriteService } from "../src/service/conversationWrite.js";
import { RealtimeSSEManager } from "../src/service/realtimeSSE.js";
import { withQvItemSetForResponseSave } from "../src/service/qvParticipation.js";
import {
    prepareQvItemUpdate,
    applyQvItemUpdate,
    normalizeQvItemUpdate,
} from "../src/service/qvItems.js";
import * as translations from "../src/service/contentTranslation.js";
import * as contentLanguages from "../src/service/contentLanguageMetadata.js";
import {
    Dto,
    type UpdateConversationRequest,
} from "../src/shared/types/dto.js";
import { validateSeedOpinionAdditions } from "../src/shared/utils/seedOpinions.js";
import { readDbFixtureSql } from "./dbFixture.js";
import type { GoogleCloudCredentials } from "../src/shared-backend/googleCloudAuth.js";
import type { VoteBuffer } from "../src/service/voteBuffer.js";
import { GlideClient } from "@valkey/valkey-glide";
import { VALKEY_QUEUE_KEYS } from "../src/shared-backend/valkeyQueues.js";
import { saveComparisonResponse } from "../src/service/comparison.js";
import { syncComparisonAnswers } from "../src/service/comparisonHistory.js";
import { buildComparisonAppearanceCountQuery } from "../src/service/comparisonQueries.js";
import { castVoteForOpinionSlugId } from "../src/service/voting.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const OWNER = "00000000-0000-4000-8000-000000000001";
const STRANGER = "00000000-0000-4000-8000-000000000002";

function firstRow<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing test fixture row");
    return row;
}

function createBarrier() {
    let release = () => {};
    const promise = new Promise<void>((resolve) => {
        release = resolve;
    });
    return { promise, resolve: () => release() };
}

describe("seed-statement validation", () => {
    it("detects duplicates across formatting, case, and whitespace", () => {
        expect(
            validateSeedOpinionAdditions({
                opinions: [
                    "<p>Already <strong>HERE</strong></p>",
                    "New statement",
                    "<p>new   statement</p>",
                ],
                existingOpinions: ["<p>Already here</p>"],
            }),
        ).toEqual([0, 1, 2].map((index) => ({ index, reason: "duplicate" })));
    });
    it("rejects empty content after sanitization and accepts valid additions", () => {
        expect(
            validateSeedOpinionAdditions({
                opinions: ["<script>hidden</script>"],
                existingOpinions: [],
            }),
        ).toMatchObject([{ index: 0, reason: "plain_text_empty" }]);
        expect(
            validateSeedOpinionAdditions({
                opinions: ["<p>A new <strong>statement</strong></p>"],
                existingOpinions: ["An existing statement"],
            }),
        ).toEqual([]);
    });
    it("requires indexed errors for invalid seed statements", () => {
        expect(
            Dto.updateConversationResponse.parse({
                success: false,
                reason: "invalid_seed_opinion",
                seedOpinionFailure: { index: 0, reason: "duplicate" },
            }),
        ).toMatchObject({ reason: "invalid_seed_opinion" });
        expect(
            Dto.updateConversationResponse.safeParse({
                success: false,
                reason: "invalid_seed_opinion",
            }).success,
        ).toBe(false);
    });
});

describe("conversation seed statements", () => {
    let container: StartedTestContainer;
    let cacheContainer: StartedTestContainer;
    let cache: GlideClient;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let projectId: number;
    let organizationId: number;
    let hasLanguageAccess = false;
    let lockProbeTail = Promise.resolve();
    const googleCloudCredentials: GoogleCloudCredentials = {
        client: new v3.TranslationServiceClient({
            projectId: "language-test",
            universeDomain: "googleapis.com",
            credentials: {
                client_email: "language@example.test",
                private_key: "test-only",
            },
        }),
        config: { projectId: "language-test", location: "global" },
    };

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
            username: "postgres",
            password: "postgres",
            database: "agora_test",
            max: 8,
        });
        db = drizzle({ client });
        cacheContainer = await new GenericContainer("redis:7-alpine")
            .withExposedPorts(6379)
            .start();
        cache = await GlideClient.createClient({
            addresses: [
                {
                    host: cacheContainer.getHost(),
                    port: cacheContainer.getMappedPort(6379),
                },
            ],
        });
        await db.execute(
            sql.raw(readDbFixtureSql("conversation-seed-opinions.sql")),
        );
        await db.insert(userTable).values([
            { id: OWNER, username: "seed-editor" },
            { id: STRANGER, username: "stranger" },
        ]);
        await db.insert(deviceTable).values({
            didWrite: "did:key:comparison-participant",
            userId: STRANGER,
            userAgent: "Comparison tests",
            sessionExpiry: new Date("2100-01-01"),
        });
        await db.insert(emailTable).values({
            email: "comparison-participant@example.test",
            userId: STRANGER,
            type: "primary",
        });
        await db.insert(opinionGroupSpecTable).values({
            analysisSpecId: 1,
            key: "test",
            version: 1,
            reducer: "pca",
            clusterer: "kmeans",
            selectionPolicy: "silhouette_size_balance",
            minClusterableParticipants: 7,
            minVotesPerParticipant: 3,
            maxGroupCount: 6,
        });
        const organization = firstRow(
            await db
                .insert(organizationTable)
                .values({
                    slug: "seed-organization",
                    displayName: "Seed organization",
                    defaultLanguageCode: "en",
                    isFullImagePath: false,
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const membership = firstRow(
            await db
                .insert(organizationMembershipTable)
                .values({
                    organizationId: organization.id,
                    userId: OWNER,
                    role: "admin",
                })
                .returning(),
        );
        organizationId = organization.id;
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_edit",
                    grantedByUserId: OWNER,
                },
                {
                    organizationMembershipId: membership.id,
                    capability: "conversation_create",
                    grantedByUserId: OWNER,
                },
            ]);
        const project = firstRow(
            await db
                .insert(projectTable)
                .values({
                    slug: "seed-project",
                    title: "Seed project",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        projectId = project.id;
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId, organizationId: organization.id });
    }, 120_000);

    afterAll(async () => {
        await googleCloudCredentials.client.close();
        await client?.end({ timeout: 5 });
        cache?.close();
        await cacheContainer?.stop();
        await container?.stop();
    }, 120_000);

    async function createConversation({
        ranking = false,
        sourceManaged = false,
        closed = false,
        absentBody = false,
        qv = false,
    }: {
        ranking?: boolean;
        sourceManaged?: boolean;
        closed?: boolean;
        absentBody?: boolean;
        qv?: boolean;
    } = {}) {
        const config = qv
            ? firstRow(await db.insert(qvConfigTable).values({}).returning())
            : ranking
              ? firstRow(
                    await db
                        .insert(rankingConversationConfigTable)
                        .values({
                            rankingMode: "bws",
                            externalSourceConfig: sourceManaged
                                ? {
                                      sourceType: "github_issue",
                                      repository: "test/repository",
                                      label: "priority",
                                  }
                                : null,
                        })
                        .returning(),
                )
              : firstRow(
                    await db
                        .insert(polisConversationConfigTable)
                        .values({})
                        .returning(),
                );
        const conversation = firstRow(
            await db
                .insert(conversationTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    projectId,
                    conversationType: ranking || qv ? "prioritizing" : "polis",
                    prioritizationType: qv
                        ? "qv"
                        : ranking
                          ? "comparisons"
                          : undefined,
                    creditVotingConfigId: qv ? config.id : undefined,
                    polisConfigId: ranking || qv ? undefined : config.id,
                    rankingConfigId: ranking ? config.id : undefined,
                    isClosed: closed,
                })
                .returning(),
        );
        const content = firstRow(
            await db
                .insert(conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "Original title",
                    body: absentBody ? undefined : "<p>Original body</p>",
                    bodyPlainText: absentBody ? "" : "Original body",
                })
                .returning(),
        );
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, conversation.id));
        const request = Dto.updateConversationRequest.parse({
            conversationSlugId: conversation.slugId,
            conversationTitle: content.title,
            conversationBody: content.body ?? undefined,
            isIndexed: conversation.isIndexed,
            participationMode: conversation.participationMode,
            multilingualSetting: {
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            },
            conversationTypeConfig: qv
                ? {
                      conversationType: "prioritizing",
                      prioritizationType: "qv",
                      creditPricing: "quadratic",
                      allowOpposition: true,
                  }
                : ranking
                  ? {
                        conversationType: "prioritizing",
                        prioritizationType: "comparisons",
                        comparisonMethod: "bws",
                    }
                  : { conversationType: "polis", votingPresentation: "list" },
        });
        return { conversation, content, config, request };
    }

    async function qvFixture() {
        const fixture = await createConversation({ qv: true });
        const result = await save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: 0,
                changes: [
                    {
                        action: "add",
                        content: {
                            title: "First proposal",
                            description: "<p>Detailed first proposal</p>",
                        },
                    },
                    { action: "add", content: { title: "Second proposal" } },
                ],
            },
        });
        if (!result.success || result.qvStatements === undefined)
            throw new Error("Missing QV fixture statements");
        return { ...fixture, statements: result.qvStatements };
    }

    it.each(["polis", "bws", "pairwise", "qv"] as const)(
        "rejects every published conversion from %s atomically, with or without an expected config",
        async (method) => {
            const fixture = await createConversation({
                ranking: method === "bws" || method === "pairwise",
                qv: method === "qv",
            });
            const configs = [
                { conversationType: "polis", votingPresentation: "list" },
                {
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                    comparisonMethod: "bws",
                },
                {
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                    comparisonMethod: "pairwise",
                },
                {
                    conversationType: "prioritizing",
                    prioritizationType: "qv",
                    creditPricing: "quadratic",
                    allowOpposition: true,
                },
            ] satisfies UpdateConversationRequest["conversationTypeConfig"][];
            const current = configs.find((config) =>
                config.conversationType === "polis"
                    ? method === "polis"
                    : config.prioritizationType === "qv"
                      ? method === "qv"
                      : config.comparisonMethod === method,
            );
            if (current === undefined)
                throw new Error("Missing method fixture");
            if (method === "pairwise")
                await db
                    .update(rankingConversationConfigTable)
                    .set({ rankingMode: "pairwise" })
                    .where(
                        eq(
                            rankingConversationConfigTable.id,
                            fixture.config.id,
                        ),
                    );
            const before = firstRow(
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, fixture.conversation.id)),
            );
            const [contentCount] = await db
                .select({ value: count() })
                .from(conversationContentTable)
                .where(
                    eq(
                        conversationContentTable.conversationId,
                        fixture.conversation.id,
                    ),
                );
            for (const target of configs) {
                if (target === current) continue;
                for (const acknowledged of [false, true]) {
                    expect(
                        await save({
                            ...fixture.request,
                            conversationTitle: "Must not be saved",
                            expectedConversationTypeConfig: acknowledged
                                ? current
                                : undefined,
                            conversationTypeConfig: target,
                        }),
                    ).toMatchObject({
                        success: false,
                        reason: "conversation_type_fixed",
                    });
                }
            }
            expect(
                firstRow(
                    await db
                        .select()
                        .from(conversationTable)
                        .where(
                            eq(conversationTable.id, fixture.conversation.id),
                        ),
                ),
            ).toEqual(before);
            expect(
                firstRow(
                    await db
                        .select({ value: count() })
                        .from(conversationContentTable)
                        .where(
                            eq(
                                conversationContentTable.conversationId,
                                fixture.conversation.id,
                            ),
                        ),
                ),
            ).toEqual(contentCount);
            expect(
                await save({
                    ...fixture.request,
                    conversationTypeConfig: current,
                }),
            ).toMatchObject({ success: true });
        },
    );

    it("creates and announces a QV activity without scheduling disabled translations", async () => {
        const request = Dto.createNewConversationRequest.parse({
            conversationTitle: "A QV priority list",
            projectSlug: "seed-project",
            postAsOrganization: "seed-organization",
            isIndexed: true,
            participationMode: "guest",
            multilingualSetting: {
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            },
            conversationType: "prioritizing",
            prioritizationType: "qv",
            creditPricing: "quadratic",
            allowOpposition: false,
            seedStatements: [
                { title: "First", description: "<p>First description</p>" },
                { title: "Second" },
            ],
        });
        const realtimeSSEManager = new RealtimeSSEManager();
        const broadcast = vi.spyOn(realtimeSSEManager, "broadcastToAllExcept");
        const enqueueTranslationWork = vi
            .fn<(workIds: number[]) => Promise<void>>()
            .mockResolvedValue(undefined);
        const service = createConversationWriteService({
            db,
            googleCloudCredentials: undefined,
            valkeyRef: { current: undefined },
            realtimeSSEManager,
            voteBuffer: undefined,
            assertComparisonGitHubAllowed: () => {},
            enqueueTranslationWork,
        });
        const result = await service.create({
            request,
            userId: OWNER,
            displayLanguage: "en",
        });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result).not.toHaveProperty("eagerContentTranslationWorkIds");
        expect(enqueueTranslationWork).not.toHaveBeenCalled();
        expect(broadcast).toHaveBeenCalledWith(
            expect.objectContaining({
                event: "new_conversation",
                excludeUserId: OWNER,
            }),
        );
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: result.conversationSlugId,
        });
        expect(editable).toMatchObject({
            success: true,
            conversationTypeConfig: {
                conversationType: "prioritizing",
                prioritizationType: "qv",
                creditPricing: "quadratic",
                allowOpposition: false,
            },
            qvStatements: {
                revision: 0,
                editing: { allowed: true },
                items: [
                    { title: "First", description: "<p>First description</p>" },
                    { title: "Second" },
                ],
            },
        });
        const [stored] = await db
            .select({ creditBudget: qvConfigTable.creditBudget })
            .from(qvConfigTable)
            .innerJoin(
                conversationTable,
                eq(conversationTable.creditVotingConfigId, qvConfigTable.id),
            )
            .where(eq(conversationTable.slugId, result.conversationSlugId));
        expect(stored?.creditBudget).toBe(100);
    });

    it("edits QV content versions, preserves descriptions, reorders and soft-deletes before participation", async () => {
        const fixture = await qvFixture();
        const first = firstRow(fixture.statements.items);
        const second = firstRow(fixture.statements.items.slice(1));
        const edit = await save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: fixture.statements.revision,
                changes: [
                    {
                        action: "edit",
                        slugId: first.slugId,
                        sourceVersion: first.sourceVersion,
                        content: {
                            title: "Updated first",
                            description: first.description,
                        },
                    },
                ],
                order: [second.slugId, first.slugId],
            },
        });
        expect(edit).toMatchObject({
            success: true,
            qvStatements: {
                items: [
                    { slugId: second.slugId },
                    {
                        slugId: first.slugId,
                        title: "Updated first",
                        description: "<p>Detailed first proposal</p>",
                    },
                ],
            },
        });
        if (!edit.success || edit.qvStatements === undefined)
            throw new Error("QV edit failed");
        expect(edit.qvStatements.items.at(1)?.sourceVersion).not.toBe(
            first.sourceVersion,
        );
        const deletion = await save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: edit.qvStatements.revision,
                changes: [
                    {
                        action: "delete",
                        slugId: second.slugId,
                        sourceVersion: second.sourceVersion,
                    },
                ],
            },
        });
        expect(deletion).toMatchObject({
            success: true,
            qvStatements: { items: [{ slugId: first.slugId }] },
        });
        const deletedItem = firstRow(
            await db
                .select({
                    contentId: rankingItemTable.currentContentId,
                    deletedAt: rankingItemTable.deletedAt,
                })
                .from(rankingItemTable)
                .where(eq(rankingItemTable.slugId, second.slugId)),
        );
        expect(deletedItem.contentId).toBeNull();
        expect(deletedItem.deletedAt).toBeInstanceOf(Date);
        expect(
            (
                await db
                    .select()
                    .from(rankingItemContentTable)
                    .innerJoin(
                        rankingItemTable,
                        eq(
                            rankingItemTable.id,
                            rankingItemContentTable.rankingItemId,
                        ),
                    )
                    .where(eq(rankingItemTable.slugId, second.slugId))
            ).length,
        ).toBeGreaterThan(0);
    });

    it("locks the whole QV statement list on the first saved response", async () => {
        const fixture = await qvFixture();
        await db.transaction(
            async (tx) =>
                await withQvItemSetForResponseSave({
                    tx,
                    conversationId: fixture.conversation.id,
                    expectedRevision: fixture.statements.revision,
                    persist: async () => "accepted response",
                }),
        );
        const second = firstRow(fixture.statements.items.slice(1));
        const result = await save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: fixture.statements.revision,
                changes: [
                    {
                        action: "delete",
                        slugId: second.slugId,
                        sourceVersion: second.sourceVersion,
                    },
                ],
            },
        });
        expect(result).toMatchObject({
            success: false,
            reason: "qv_statement_change_rejected",
            changeFailure: "participation_started",
        });
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(editable).toMatchObject({
            success: true,
            qvStatements: {
                editing: { allowed: false, reason: "participation_started" },
            },
        });
    });

    it("reads an empty internally staged QV statement set without inventing an item", async () => {
        const fixture = await createConversation({ qv: true });
        expect(
            await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            }),
        ).toMatchObject({
            success: true,
            qvStatements: { revision: 0, items: [] },
        });
    });

    it("does not change QV content versions or the set revision on a no-op save", async () => {
        const fixture = await qvFixture();
        const first = firstRow(fixture.statements.items);
        const result = await save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: fixture.statements.revision,
                changes: [
                    {
                        action: "edit",
                        slugId: first.slugId,
                        sourceVersion: first.sourceVersion,
                        content: {
                            title: first.title,
                            description: first.description,
                        },
                    },
                ],
                order: fixture.statements.items.map((item) => item.slugId),
            },
        });
        expect(result).toMatchObject({
            success: true,
            qvStatements: fixture.statements,
        });
    });

    it("keeps QV ordering and counts consistent when deleting, adding and reordering together", async () => {
        const fixture = await qvFixture();
        const first = firstRow(fixture.statements.items);
        const second = firstRow(fixture.statements.items.slice(1));
        const result = await save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: fixture.statements.revision,
                changes: [
                    {
                        action: "delete",
                        slugId: first.slugId,
                        sourceVersion: first.sourceVersion,
                    },
                    {
                        action: "add",
                        content: {
                            title: "Appended proposal",
                            description: "<p>Append description</p>",
                        },
                    },
                ],
                order: [second.slugId],
            },
        });
        expect(result).toMatchObject({
            success: true,
            qvStatements: {
                revision: fixture.statements.revision + 1,
                items: [
                    { slugId: second.slugId },
                    {
                        title: "Appended proposal",
                        description: "<p>Append description</p>",
                    },
                ],
            },
        });
        expect(
            firstRow(
                await db
                    .select()
                    .from(qvConfigTable)
                    .where(eq(qvConfigTable.id, fixture.config.id)),
            ).itemCount,
        ).toBe(2);
        const positions = await db
            .select({ position: rankingItemTable.position })
            .from(rankingItemTable)
            .where(
                eq(rankingItemTable.conversationId, fixture.conversation.id),
            );
        expect(positions.filter(({ position }) => position === 1)).toHaveLength(
            1,
        );
    });

    it("rejects foreign QV item identities without partially saving conversation edits", async () => {
        const fixture = await qvFixture();
        const other = await qvFixture();
        const foreign = firstRow(other.statements.items);
        expect(
            await save({
                ...fixture.request,
                conversationTitle: "Must not be saved",
                qvStatementUpdate: {
                    expectedRevision: fixture.statements.revision,
                    changes: [
                        {
                            action: "delete",
                            slugId: foreign.slugId,
                            sourceVersion: foreign.sourceVersion,
                        },
                    ],
                },
            }),
        ).toMatchObject({
            success: false,
            reason: "qv_statement_change_rejected",
            changeFailure: "not_found",
        });
        expect(
            await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            }),
        ).toMatchObject({
            success: true,
            conversationTitle: fixture.content.title,
            qvStatements: fixture.statements,
        });
    });

    it("rejects unauthorized QV statement maintenance", async () => {
        const fixture = await qvFixture();
        await expect(
            requireConversationCapabilityBySlug({
                db,
                userId: STRANGER,
                conversationSlugId: fixture.conversation.slugId,
                capability: "conversation_edit",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(
            await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            }),
        ).toMatchObject({ success: true, qvStatements: fixture.statements });
    });

    it("rejects published QV settings changes and legacy seed mutation bypasses", async () => {
        const fixture = await qvFixture();
        expect(
            await save({
                ...fixture.request,
                conversationTypeConfig: {
                    conversationType: "prioritizing",
                    prioritizationType: "qv",
                    creditPricing: "quadratic",
                    allowOpposition: false,
                },
            }),
        ).toMatchObject({
            success: false,
            reason: "conversation_type_fixed",
        });
        expect(
            await save({
                ...fixture.request,
                newSeedOpinionList: ["Bypass structured statement maintenance"],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinions_not_allowed",
        });
    });

    it.each([
        "stale_source",
        "duplicate_changes",
        "duplicate_order",
        "delete_everything",
    ] as const)("rejects invalid QV updates atomically: %s", async (kind) => {
        const fixture = await qvFixture();
        const first = firstRow(fixture.statements.items);
        const deletion = {
            action: "delete",
            slugId: first.slugId,
            sourceVersion: first.sourceVersion,
        } as const;
        const changes =
            kind === "stale_source"
                ? [{ ...deletion, sourceVersion: randomUUID() }]
                : kind === "duplicate_changes"
                  ? [deletion, deletion]
                  : kind === "delete_everything"
                    ? fixture.statements.items.map(
                          (item) =>
                              ({
                                  action: "delete",
                                  slugId: item.slugId,
                                  sourceVersion: item.sourceVersion,
                              }) as const,
                      )
                    : [];
        expect(
            await save({
                ...fixture.request,
                conversationTitle: "Must not be saved",
                qvStatementUpdate: {
                    expectedRevision: fixture.statements.revision,
                    changes,
                    order:
                        kind === "duplicate_order"
                            ? [first.slugId, first.slugId]
                            : undefined,
                },
            }),
        ).toMatchObject({
            success: false,
            reason: "qv_statement_change_rejected",
            changeFailure:
                kind === "stale_source"
                    ? "version_conflict"
                    : "invalid_changes",
        });
        expect(
            await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            }),
        ).toMatchObject({
            success: true,
            conversationTitle: fixture.content.title,
            qvStatements: fixture.statements,
        });
    });

    it("rejects closed QV writes without calling persistence or changing statements", async () => {
        const fixture = await qvFixture();
        await db
            .update(conversationTable)
            .set({ isClosed: true })
            .where(eq(conversationTable.id, fixture.conversation.id));
        const persist = vi.fn(async () => "Should not run");
        expect(
            await db.transaction(
                async (tx) =>
                    await withQvItemSetForResponseSave({
                        tx,
                        conversationId: fixture.conversation.id,
                        expectedRevision: fixture.statements.revision,
                        persist,
                    }),
            ),
        ).toEqual({ success: false, reason: "closed" });
        expect(persist).not.toHaveBeenCalled();
        expect(
            await save({
                ...fixture.request,
                qvStatementUpdate: {
                    expectedRevision: fixture.statements.revision,
                    changes: [],
                    order: [...fixture.statements.items]
                        .reverse()
                        .map((item) => item.slugId),
                },
            }),
        ).toMatchObject({
            success: false,
            reason: "qv_statement_change_rejected",
            changeFailure: "closed",
        });
    });

    it("rejects markup-only QV titles before writing and sanitizes descriptions", async () => {
        const fixture = await qvFixture();
        const first = firstRow(fixture.statements.items);
        await expect(
            save({
                ...fixture.request,
                conversationTitle: "Must not be saved",
                qvStatementUpdate: {
                    expectedRevision: fixture.statements.revision,
                    changes: [
                        {
                            action: "edit",
                            slugId: first.slugId,
                            sourceVersion: first.sourceVersion,
                            content: { title: "<p><br></p>" },
                        },
                    ],
                },
            }),
        ).rejects.toThrow("plain_text_empty");
        const result = await save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: fixture.statements.revision,
                changes: [
                    {
                        action: "edit",
                        slugId: first.slugId,
                        sourceVersion: first.sourceVersion,
                        content: {
                            title: "Safe title",
                            description:
                                '<p onclick="alert(1)">Safe text</p><script>alert(2)</script>',
                        },
                    },
                ],
            },
        });
        expect(result).toMatchObject({
            success: true,
            qvStatements: {
                items: [
                    { title: "Safe title", description: "<p>Safe text</p>" },
                    {},
                ],
            },
        });
    });

    it("prepares external detection for QV edits before acquiring write locks", async () => {
        const fixture = await qvFixture();
        const first = firstRow(fixture.statements.items);
        await grantLanguageAccess();
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async (input) => {
                if (input.useGoogleLanguageDetection) {
                    expect(input.googleCloudCredentials).toBe(
                        googleCloudCredentials,
                    );
                    await assertSaveRowsAreUnlocked({
                        conversationId: fixture.conversation.id,
                        seedSlugId: first.slugId,
                        ranking: true,
                    });
                }
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: input.useGoogleLanguageDetection
                        ? "google_translate"
                        : "lingua",
                    sourceLanguageConfidence: 1,
                };
            });
        const eagerWork = vi
            .spyOn(
                translations,
                "createEagerContentTranslationWorkForKnownConversation",
            )
            .mockResolvedValue([]);
        try {
            expect(
                await updateConversation({
                    db,
                    userId: OWNER,
                    googleCloudCredentials,
                    data: {
                        ...fixture.request,
                        multilingualSetting: {
                            additionalLanguageCodes: ["fr"],
                            dynamicTranslationEnabled: true,
                        },
                        qvStatementUpdate: {
                            expectedRevision: fixture.statements.revision,
                            changes: [
                                {
                                    action: "edit",
                                    slugId: first.slugId,
                                    sourceVersion: first.sourceVersion,
                                    content: {
                                        title: "Updated translated proposal",
                                        description:
                                            "<p>Translate this description</p>",
                                    },
                                },
                            ],
                        },
                    },
                }),
            ).toMatchObject({ success: true });
            const current = firstRow(
                await db
                    .select({
                        provider:
                            rankingItemContentTable.sourceLanguageProvider,
                    })
                    .from(rankingItemContentTable)
                    .innerJoin(
                        rankingItemTable,
                        eq(
                            rankingItemTable.currentContentId,
                            rankingItemContentTable.id,
                        ),
                    )
                    .where(eq(rankingItemTable.slugId, first.slugId)),
            );
            expect(current.provider).toBe("google_translate");
            expect(
                detector.mock.calls.some(
                    ([input]) =>
                        input.useGoogleLanguageDetection &&
                        input.text.includes("Updated translated proposal"),
                ),
            ).toBe(true);
        } finally {
            detector.mockRestore();
            eagerWork.mockRestore();
        }
    });

    it("does not lock QV statements on rejected or rolled-back participant writes", async () => {
        const fixture = await qvFixture();
        const persist = vi.fn(async () => "accepted");
        const stale = await db.transaction(
            async (tx) =>
                await withQvItemSetForResponseSave({
                    tx,
                    conversationId: fixture.conversation.id,
                    expectedRevision: 0,
                    persist,
                }),
        );
        expect(stale).toMatchObject({
            success: false,
            reason: "version_conflict",
        });
        expect(persist).not.toHaveBeenCalled();
        await expect(
            db.transaction(async (tx) => {
                await withQvItemSetForResponseSave({
                    tx,
                    conversationId: fixture.conversation.id,
                    expectedRevision: fixture.statements.revision,
                    persist,
                });
                throw new Error("Rollback participant write");
            }),
        ).rejects.toThrow("Rollback participant write");
        expect(
            firstRow(
                await db
                    .select()
                    .from(qvConfigTable)
                    .where(eq(qvConfigTable.id, fixture.config.id)),
            ).statementsLockedAt,
        ).toBeNull();
    });

    it("rejects statement deletion racing the first accepted participant write", async () => {
        const fixture = await qvFixture();
        const held = createBarrier();
        const release = createBarrier();
        const participantWrite = db.transaction(
            async (tx) =>
                await withQvItemSetForResponseSave({
                    tx,
                    conversationId: fixture.conversation.id,
                    expectedRevision: fixture.statements.revision,
                    persist: async () => {
                        held.resolve();
                        await release.promise;
                        return "accepted response";
                    },
                }),
        );
        await held.promise;
        const target = firstRow(fixture.statements.items);
        const deletion = save({
            ...fixture.request,
            qvStatementUpdate: {
                expectedRevision: fixture.statements.revision,
                changes: [
                    {
                        action: "delete",
                        slugId: target.slugId,
                        sourceVersion: target.sourceVersion,
                    },
                ],
            },
        });
        release.resolve();
        expect(await participantWrite).toMatchObject({ success: true });
        expect(await deletion).toMatchObject({
            success: false,
            reason: "qv_statement_change_rejected",
            changeFailure: "participation_started",
        });
    });

    it("rejects a stale first participant write when the statement edit wins the lock", async () => {
        const fixture = await qvFixture();
        const held = createBarrier();
        const release = createBarrier();
        const target = firstRow(fixture.statements.items);
        const edit = db.transaction(async (tx) => {
            await tx
                .select()
                .from(conversationTable)
                .where(eq(conversationTable.id, fixture.conversation.id))
                .for("update");
            const prepared = await prepareQvItemUpdate({
                db: tx,
                conversationId: fixture.conversation.id,
                configId: fixture.config.id,
                isClosed: false,
                lockConfig: true,
                update: await normalizeQvItemUpdate({
                    expectedRevision: fixture.statements.revision,
                    changes: [
                        {
                            action: "edit",
                            slugId: target.slugId,
                            sourceVersion: target.sourceVersion,
                            content: {
                                title: "A changed proposal",
                                description: target.description,
                            },
                        },
                    ],
                }),
            });
            if (!prepared.success) throw new Error("Failed to prepare edit");
            held.resolve();
            await release.promise;
            await applyQvItemUpdate({
                db: tx,
                prepared,
                conversation: {
                    id: fixture.conversation.id,
                    slugId: fixture.conversation.slugId,
                    contentId: fixture.content.id,
                },
                configId: fixture.config.id,
                userId: OWNER,
                now: new Date(),
                resolveLanguageMetadata: async () =>
                    contentLanguages.UNKNOWN_CONTENT_LANGUAGE_METADATA,
                useGoogleLanguageDetection: false,
            });
        });
        await held.promise;
        const persist = vi.fn(async () => "accepted response");
        const participantWrite = db.transaction(
            async (tx) =>
                await withQvItemSetForResponseSave({
                    tx,
                    conversationId: fixture.conversation.id,
                    expectedRevision: fixture.statements.revision,
                    persist,
                }),
        );
        release.resolve();
        await edit;
        expect(await participantWrite).toMatchObject({
            success: false,
            reason: "version_conflict",
        });
        expect(persist).not.toHaveBeenCalled();
        expect(
            firstRow(
                await db
                    .select()
                    .from(qvConfigTable)
                    .where(eq(qvConfigTable.id, fixture.config.id)),
            ).statementsLockedAt,
        ).toBeNull();
    });

    function save(request: UpdateConversationRequest) {
        return updateConversation({
            db,
            userId: OWNER,
            data: request,
            displayContentViewerPreferences: {
                viewerUserId: OWNER,
                displayLanguage: "en",
                spokenLanguages: [],
            },
        });
    }

    function saveAnswers(request: z.input<typeof Dto.comparisonSaveRequest>) {
        return saveComparisonResponse({
            db,
            request: Dto.comparisonSaveRequest.parse(request),
            didWrite: "did:key:comparison-participant",
            userAgent: "Comparison tests",
            now: new Date(),
            currentDisplayLanguage: "en",
            valkey: undefined,
            performance: undefined,
        });
    }

    it("keeps the published comparison method fixed before votes and after Undo", async () => {
        const fixture = await seedFixture({ ranking: true });
        const pairwise = Dto.updateConversationTypeConfig.parse({
            conversationType: "prioritizing",
            prioritizationType: "comparisons",
            comparisonMethod: "pairwise",
        });
        const change = {
            ...fixture.request,
            expectedConversationTypeConfig:
                fixture.request.conversationTypeConfig,
            conversationTypeConfig: pairwise,
        };
        const choice = {
            best: fixture.first.slugId,
            worst: fixture.second.slugId,
            set: [fixture.first.slugId, fixture.second.slugId],
        };
        expect(await save(change)).toMatchObject({
            success: false,
            reason: "conversation_type_fixed",
        });
        await saveAnswers({
            conversationSlugId: fixture.conversation.slugId,
            ranking: null,
            isComplete: false,
            comparisons: [choice],
        });
        expect(await save(change)).toMatchObject({
            success: false,
            reason: "conversation_type_fixed",
        });
        await saveAnswers({
            conversationSlugId: fixture.conversation.slugId,
            ranking: null,
            isComplete: false,
            comparisons: [],
        });
        expect(await save(change)).toMatchObject({
            success: false,
            reason: "conversation_type_fixed",
        });
        await saveAnswers({
            conversationSlugId: fixture.conversation.slugId,
            ranking: null,
            isComplete: false,
            comparisons: [choice],
        });
    });

    it("counts canonical active answers even when the JSON backup differs", async () => {
        const fixture = await seedFixture({ ranking: true });
        const answer = {
            best: fixture.first.slugId,
            worst: fixture.second.slugId,
            set: [fixture.first.slugId, fixture.second.slugId],
        };
        expect(
            await saveAnswers({
                conversationSlugId: fixture.conversation.slugId,
                ranking: null,
                comparisons: [answer],
                isComplete: false,
            }),
        ).toMatchObject({ success: true });
        await db
            .update(comparisonResponseTable)
            .set({ comparisons: [] })
            .where(
                eq(
                    comparisonResponseTable.conversationId,
                    fixture.conversation.id,
                ),
            );
        expect(
            await buildComparisonAppearanceCountQuery({
                db,
                conversationId: fixture.conversation.id,
            }),
        ).toEqual(
            expect.arrayContaining(
                answer.set.map((itemSlugId) => ({
                    itemSlugId,
                    appearanceCount: 1,
                })),
            ),
        );
        await saveAnswers({
            conversationSlugId: fixture.conversation.slugId,
            ranking: null,
            comparisons: [],
            isComplete: false,
        });
        expect(
            await buildComparisonAppearanceCountQuery({
                db,
                conversationId: fixture.conversation.id,
            }),
        ).toEqual([]);
    });

    it("preserves a changed candidate display order in normalized answer history", async () => {
        const fixture = await seedFixture({ ranking: true });
        const answer = {
            best: fixture.first.slugId,
            worst: fixture.second.slugId,
            set: [fixture.first.slugId, fixture.second.slugId],
        };
        const request = {
            conversationSlugId: fixture.conversation.slugId,
            ranking: null,
            comparisons: [answer],
            isComplete: false,
        };
        await saveAnswers(request);
        await saveAnswers({
            ...request,
            comparisons: [{ ...answer, set: [...answer.set].reverse() }],
        });
        const rows = await db
            .select({
                candidateSet: comparisonAnswerTable.candidateSet,
                deletedAt: comparisonAnswerTable.deletedAt,
            })
            .from(comparisonAnswerTable)
            .innerJoin(
                comparisonResponseTable,
                eq(
                    comparisonResponseTable.id,
                    comparisonAnswerTable.comparisonResponseId,
                ),
            )
            .where(
                eq(
                    comparisonResponseTable.conversationId,
                    fixture.conversation.id,
                ),
            )
            .orderBy(comparisonAnswerTable.id);
        expect(rows).toEqual([
            { candidateSet: answer.set, deletedAt: expect.any(Date) },
            { candidateSet: [...answer.set].reverse(), deletedAt: null },
        ]);
    });

    it("rechecks admission when a requirements edit wins the write boundary", async () => {
        const fixture = await seedFixture({ ranking: true });
        const locked = createBarrier();
        const release = createBarrier();
        const editing = db.transaction(async (tx) => {
            await tx
                .update(conversationTable)
                .set({ participationMode: "strong_verification" })
                .where(eq(conversationTable.id, fixture.conversation.id));
            // This edit changes no key, so explicitly match the settings writer's lock.
            await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(eq(conversationTable.id, fixture.conversation.id))
                .for("update");
            locked.resolve();
            await release.promise;
        });
        await locked.promise;
        const voting = saveAnswers({
            conversationSlugId: fixture.conversation.slugId,
            ranking: null,
            isComplete: false,
            comparisons: [
                {
                    best: fixture.first.slugId,
                    worst: fixture.second.slugId,
                    set: [fixture.first.slugId, fixture.second.slugId],
                },
            ],
        });
        try {
            await vi.waitFor(async () => {
                const rows = await client<{ waiting: boolean }[]>`
                    SELECT EXISTS (
                        SELECT 1 FROM pg_stat_activity
                        WHERE datname = current_database() AND pid <> pg_backend_pid()
                          AND wait_event_type = 'Lock' AND query ILIKE '%for share%'
                    ) AS waiting`;
                expect(rows.at(0)?.waiting).toBe(true);
            });
        } finally {
            release.resolve();
        }
        await editing;
        expect(await voting).toMatchObject({
            success: false,
            reason: "strong_verification_required",
        });
        expect(
            await db
                .select()
                .from(comparisonResponseTable)
                .where(
                    eq(
                        comparisonResponseTable.conversationId,
                        fixture.conversation.id,
                    ),
                ),
        ).toEqual([]);
    });

    it("serializes a method edit behind a vote transaction", async () => {
        const fixture = await seedFixture({ ranking: true });
        const locked = createBarrier();
        const release = createBarrier();
        const vote = db.transaction(async (tx) => {
            await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(eq(conversationTable.id, fixture.conversation.id))
                .for("share");
            locked.resolve();
            await release.promise;
            const [result] = await tx
                .insert(comparisonResponseTable)
                .values({
                    participantId: STRANGER,
                    conversationId: fixture.conversation.id,
                    comparisons: [
                        {
                            best: fixture.first.slugId,
                            worst: fixture.second.slugId,
                            set: [fixture.first.slugId, fixture.second.slugId],
                        },
                    ],
                })
                .returning({ id: comparisonResponseTable.id });
            await syncComparisonAnswers({
                tx,
                responseId: result.id,
                now: new Date(),
                comparisons: [
                    {
                        best: fixture.first.slugId,
                        worst: fixture.second.slugId,
                        set: [fixture.first.slugId, fixture.second.slugId],
                    },
                ],
            });
        });
        await locked.promise;
        const edit = save({
            ...fixture.request,
            expectedConversationTypeConfig:
                fixture.request.conversationTypeConfig,
            conversationTypeConfig: {
                conversationType: "prioritizing",
                prioritizationType: "comparisons",
                comparisonMethod: "pairwise",
            },
        });
        release.resolve();
        await vote;
        expect(await edit).toMatchObject({
            success: false,
            reason: "conversation_type_fixed",
        });
    });

    it("allows published Polis presentation settings and rejects stale settings atomically", async () => {
        const fixture = await seedFixture();
        const changed = await save({
            ...fixture.request,
            expectedConversationTypeConfig:
                fixture.request.conversationTypeConfig,
            conversationTypeConfig: {
                conversationType: "polis",
                votingPresentation: "one_at_a_time",
            },
        });
        expect(changed).toMatchObject({
            success: true,
            conversationTypeConfig: {
                conversationType: "polis",
                votingPresentation: "one_at_a_time",
            },
        });
        expect(
            await save({
                ...fixture.request,
                conversationTitle: "Must not be saved",
                expectedConversationTypeConfig:
                    fixture.request.conversationTypeConfig,
            }),
        ).toMatchObject({
            success: false,
            reason: "conversation_type_changed",
        });
        expect(
            await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            }),
        ).toMatchObject({
            success: true,
            conversationTitle: fixture.content.title,
            conversationTypeConfig: {
                conversationType: "polis",
                votingPresentation: "one_at_a_time",
            },
        });
    });

    it("rechecks mutable settings after waiting for a concurrent editor", async () => {
        const fixture = await createConversation();
        const locked = createBarrier();
        const release = createBarrier();
        const editing = db.transaction(async (tx) => {
            await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(eq(conversationTable.id, fixture.conversation.id))
                .for("update");
            await tx
                .update(polisConversationConfigTable)
                .set({ votingPresentation: "one_at_a_time" })
                .where(eq(polisConversationConfigTable.id, fixture.config.id));
            locked.resolve();
            await release.promise;
        });
        await locked.promise;
        const saving = save({
            ...fixture.request,
            conversationTitle: "Must not be saved",
            expectedConversationTypeConfig:
                fixture.request.conversationTypeConfig,
        });
        try {
            await vi.waitFor(async () => {
                const rows = await client<{ waiting: boolean }[]>`
                    SELECT EXISTS (
                        SELECT 1 FROM pg_stat_activity
                        WHERE datname = current_database() AND pid <> pg_backend_pid()
                          AND wait_event_type = 'Lock'
                    ) AS waiting`;
                expect(rows.at(0)?.waiting).toBe(true);
            });
        } finally {
            release.resolve();
        }
        await editing;
        expect(await saving).toMatchObject({
            success: false,
            reason: "conversation_type_changed",
        });
        expect(
            await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            }),
        ).toMatchObject({
            success: true,
            conversationTitle: fixture.content.title,
            conversationTypeConfig: { votingPresentation: "one_at_a_time" },
        });
    });

    it("keeps the published method fixed while closed when no votes exist", async () => {
        const fixture = await createConversation({
            ranking: true,
            closed: true,
        });
        expect(
            await save({
                ...fixture.request,
                expectedConversationTypeConfig:
                    fixture.request.conversationTypeConfig,
                conversationTypeConfig: {
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                    comparisonMethod: "pairwise",
                },
            }),
        ).toMatchObject({ success: false, reason: "conversation_type_fixed" });
        const [stored] = await db
            .select()
            .from(conversationTable)
            .where(eq(conversationTable.id, fixture.conversation.id));
        expect(stored.isClosed).toBe(true);
        expect(
            await saveAnswers({
                conversationSlugId: fixture.conversation.slugId,
                comparisonMethod: "bws",
                ranking: null,
                isComplete: false,
                comparisons: [],
            }),
        ).toMatchObject({ success: false, reason: "conversation_closed" });
    });

    it("rejects published QV conversion without changing structured statements", async () => {
        const fixture = await qvFixture();
        const config = {
            conversationType: "prioritizing",
            prioritizationType: "comparisons",
            comparisonMethod: "pairwise",
        } as const;
        expect(
            await save({
                ...fixture.request,
                expectedConversationTypeConfig:
                    fixture.request.conversationTypeConfig,
                conversationTypeConfig: config,
            }),
        ).toMatchObject({ success: false, reason: "conversation_type_fixed" });
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(editable).toMatchObject({
            success: true,
            conversationTypeConfig: fixture.request.conversationTypeConfig,
            qvStatements: fixture.statements,
        });
        const contents = await db
            .select({ body: rankingItemContentTable.body })
            .from(rankingItemTable)
            .innerJoin(
                rankingItemContentTable,
                eq(
                    rankingItemContentTable.id,
                    rankingItemTable.currentContentId,
                ),
            )
            .where(
                eq(rankingItemTable.conversationId, fixture.conversation.id),
            );
        expect(
            contents.some(
                (item) => item.body === "<p>Detailed first proposal</p>",
            ),
        ).toBe(true);
    });

    it("rejects published QV to Polis conversion and allows unchanged settings", async () => {
        const fixture = await qvFixture();
        const polis = {
            conversationType: "polis",
            votingPresentation: "list",
        } as const;
        expect(
            await save({
                ...fixture.request,
                expectedConversationTypeConfig:
                    fixture.request.conversationTypeConfig,
                conversationTypeConfig: polis,
            }),
        ).toMatchObject({ success: false, reason: "conversation_type_fixed" });
        const result = await updateConversation({
            db,
            userId: OWNER,
            valkey: cache,
            data: {
                ...fixture.request,
                expectedConversationTypeConfig:
                    fixture.request.conversationTypeConfig,
            },
        });
        expect(result).toMatchObject({
            success: true,
            qvStatements: {
                items: [
                    {
                        slugId: fixture.statements.items[0]?.slugId,
                        title: "First proposal",
                        description: "<p>Detailed first proposal</p>",
                    },
                    {
                        slugId: fixture.statements.items[1]?.slugId,
                        title: "Second proposal",
                    },
                ],
            },
        });
    });

    it.each([false, true])(
        "checks Polis admission before accepting into the buffer (strongVerification=%s)",
        async (strongVerification) => {
            const fixture = await seedFixture();
            await db
                .update(conversationTable)
                .set({
                    participationMode: strongVerification
                        ? "strong_verification"
                        : "account_required",
                })
                .where(eq(conversationTable.id, fixture.conversation.id));
            const voteBuffer: VoteBuffer = {
                add: vi.fn(async () => undefined),
                hasBlockingVotes: vi.fn(async () => false),
                flush: vi.fn(async () => {}),
                shutdown: vi.fn(async () => {}),
            };
            const response = await castVoteForOpinionSlugId({
                db,
                voteBuffer,
                opinionSlugId: fixture.first.slugId,
                didWrite: "did:key:comparison-participant",
                votingAction: "agree",
                userAgent: "Comparison tests",
                now: new Date(),
                currentDisplayLanguage: "en",
                sourceVersion: fixture.first.sourceVersion,
            });
            expect(response).toMatchObject(
                strongVerification
                    ? { success: false, reason: "strong_verification_required" }
                    : { success: true },
            );
            expect(voteBuffer.add).toHaveBeenCalledTimes(
                strongVerification ? 0 : 1,
            );
            if (!strongVerification)
                expect(voteBuffer.add).toHaveBeenCalledWith({
                    vote: expect.objectContaining({ userId: STRANGER }),
                });
        },
    );

    it("rejects published conversion without consulting malformed buffered votes", async () => {
        const fixture = await seedFixture();
        const member = `malformed:${fixture.conversation.id}`;
        await cache.hset(
            `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:conversation:${fixture.conversation.id}`,
            { [member]: "1" },
        );
        await cache.hset(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA, {
            [member]: "invalid JSON",
        });
        expect(
            await updateConversation({
                db,
                userId: OWNER,
                valkey: cache,
                data: {
                    ...fixture.request,
                    conversationTypeConfig: {
                        conversationType: "prioritizing",
                        prioritizationType: "comparisons",
                        comparisonMethod: "bws",
                    },
                },
            }),
        ).toMatchObject({ success: false, reason: "conversation_type_fixed" });
    });

    it("keeps the published family fixed after buffered Undo without mutating votes", async () => {
        const fixture = await seedFixture();
        const [opinion] = await db
            .select()
            .from(opinionTable)
            .where(eq(opinionTable.slugId, fixture.first.slugId));
        if (opinion.currentContentId === null)
            throw new Error("Missing statement content");
        const member = `${STRANGER}:${fixture.conversation.voteBufferEpoch}:${String(opinion.id)}`;
        const payload = {
            userId: STRANGER,
            conversationId: fixture.conversation.id,
            opinionId: opinion.id,
            opinionContentId: opinion.currentContentId,
            timestamp: new Date(),
            voteBufferEpoch: fixture.conversation.voteBufferEpoch,
            bufferSequence: 1,
        };
        await cache.hset(
            `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:conversation:${String(fixture.conversation.id)}`,
            { [member]: "1" },
        );
        await cache.hset(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA, {
            [member]: JSON.stringify({ ...payload, vote: "agree" }),
        });
        const [vote] = await db
            .insert(voteTable)
            .values({ authorId: STRANGER, opinionId: opinion.id })
            .returning({ id: voteTable.id });
        const [content] = await db
            .insert(voteContentTable)
            .values({
                voteId: vote.id,
                opinionContentId: opinion.currentContentId,
                vote: "agree",
            })
            .returning({ id: voteContentTable.id });
        await db
            .update(voteTable)
            .set({ currentContentId: content.id })
            .where(eq(voteTable.id, vote.id));
        await cache.hset(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA, {
            [member]: JSON.stringify({
                ...payload,
                vote: "cancel",
                bufferSequence: 2,
            }),
        });
        const target = {
            conversationType: "prioritizing",
            prioritizationType: "comparisons",
            comparisonMethod: "pairwise",
        } as const;
        expect(
            await updateConversation({
                db,
                userId: OWNER,
                valkey: cache,
                data: {
                    ...fixture.request,
                    expectedConversationTypeConfig:
                        fixture.request.conversationTypeConfig,
                    conversationTypeConfig: target,
                },
            }),
        ).toMatchObject({ success: false, reason: "conversation_type_fixed" });
        const [withdrawn] = await db
            .select()
            .from(voteTable)
            .where(eq(voteTable.id, vote.id));
        expect(withdrawn.currentContentId).toBe(content.id);
        expect(withdrawn.withdrawnAt).toBeNull();
        const current = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(current).toMatchObject({
            success: true,
            seedOpinions: [
                { slugId: fixture.first.slugId },
                { slugId: fixture.second.slugId },
            ],
        });
    });

    async function seedFixture({
        ranking = false,
    }: { ranking?: boolean } = {}) {
        const fixture = await createConversation({ ranking });
        const result = await save({
            ...fixture.request,
            newSeedOpinionList: ["First seed", "Second seed"],
        });
        if (!result.success) throw new Error("Failed to create seed fixture");
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        if (!editable.success) throw new Error("Missing editable seed fixture");
        return {
            ...fixture,
            first: firstRow(editable.seedOpinions),
            second: firstRow(editable.seedOpinions.slice(1)),
        };
    }

    async function grantLanguageAccess(): Promise<void> {
        if (hasLanguageAccess) return;
        await db.insert(premiumFeatureEntitlementTable).values({
            organizationId,
            feature: "dynamic_translation",
            startsAt: new Date(Date.now() - 60_000),
        });
        hasLanguageAccess = true;
    }

    async function assertSaveRowsAreUnlocked({
        conversationId,
        seedSlugId,
        ranking,
    }: {
        conversationId: number;
        seedSlugId: string;
        ranking: boolean;
    }): Promise<void> {
        const previous = lockProbeTail;
        let release = () => {};
        lockProbeTail = new Promise<void>((resolve) => {
            release = resolve;
        });
        await previous;
        try {
            await db.transaction(async (tx) => {
                await tx
                    .select({ id: projectTable.id })
                    .from(projectTable)
                    .where(eq(projectTable.id, projectId))
                    .for("no key update", { noWait: true });
                await tx
                    .select({ id: conversationTable.id })
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversationId))
                    .for("no key update", { noWait: true });
                if (ranking)
                    await tx
                        .select({ id: rankingItemTable.id })
                        .from(rankingItemTable)
                        .where(eq(rankingItemTable.slugId, seedSlugId))
                        .for("update", { noWait: true });
                else
                    await tx
                        .select({ id: opinionTable.id })
                        .from(opinionTable)
                        .where(eq(opinionTable.slugId, seedSlugId))
                        .for("update", { noWait: true });
            });
        } finally {
            release();
        }
    }

    it.each([false, true])(
        "prepares external detection before locking the save rows (ranking=%s)",
        async (ranking) => {
            const fixture = await seedFixture({ ranking });
            await grantLanguageAccess();
            const detector = vi
                .spyOn(contentLanguages, "resolveContentLanguageMetadata")
                .mockImplementation(async (input) => {
                    expect(input.googleCloudCredentials).toBe(
                        googleCloudCredentials,
                    );
                    await assertSaveRowsAreUnlocked({
                        conversationId: fixture.conversation.id,
                        seedSlugId: fixture.first.slugId,
                        ranking,
                    });
                    return {
                        sourceLanguageCode: "en",
                        sourceRawLanguageCode: "en",
                        sourceLanguageProvider: "google_translate",
                        sourceLanguageConfidence: 1,
                    };
                });
            const eagerWork = vi
                .spyOn(
                    translations,
                    "createEagerContentTranslationWorkForKnownConversation",
                )
                .mockResolvedValue([]);
            try {
                expect(
                    (
                        await updateConversation({
                            db,
                            userId: OWNER,
                            googleCloudCredentials,
                            data: {
                                ...fixture.request,
                                conversationTitle:
                                    "Changed with external detection",
                                multilingualSetting: {
                                    dynamicTranslationEnabled: true,
                                    additionalLanguageCodes: ["fr"],
                                },
                                newSeedOpinionList: ["New prepared seed"],
                                seedOpinionChanges: [
                                    {
                                        action: "edit",
                                        slugId: fixture.first.slugId,
                                        sourceVersion:
                                            fixture.first.sourceVersion,
                                        content: "Prepared existing edit",
                                    },
                                    {
                                        action: "delete",
                                        slugId: fixture.second.slugId,
                                        sourceVersion:
                                            fixture.second.sourceVersion,
                                    },
                                ],
                            },
                        })
                    ).success,
                ).toBe(true);
                expect(detector).toHaveBeenCalledTimes(3);
            } finally {
                detector.mockRestore();
                eagerWork.mockRestore();
            }
        },
    );

    it("prepares existing-content refreshes outside locks and reuses prepared metadata for additions", async () => {
        const fixture = await seedFixture();
        await grantLanguageAccess();
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async (input) => {
                expect(input.googleCloudCredentials).toBe(
                    googleCloudCredentials,
                );
                await assertSaveRowsAreUnlocked({
                    conversationId: fixture.conversation.id,
                    seedSlugId: fixture.first.slugId,
                    ranking: false,
                });
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "google_translate",
                    sourceLanguageConfidence: 1,
                };
            });
        const eagerWork = vi
            .spyOn(
                translations,
                "createEagerContentTranslationWorkForKnownConversation",
            )
            .mockResolvedValue([]);
        try {
            expect(
                (
                    await updateConversation({
                        db,
                        userId: OWNER,
                        googleCloudCredentials,
                        data: {
                            ...fixture.request,
                            multilingualSetting: {
                                dynamicTranslationEnabled: true,
                                additionalLanguageCodes: ["fr"],
                            },
                            newSeedOpinionList: ["New prepared seed"],
                        },
                    })
                ).success,
            ).toBe(true);
            expect(detector).toHaveBeenCalledTimes(4);
            const content = firstRow(
                await db
                    .select()
                    .from(conversationContentTable)
                    .where(eq(conversationContentTable.id, fixture.content.id)),
            );
            expect(content.sourceLanguageProvider).toBe("google_translate");
        } finally {
            detector.mockRestore();
            eagerWork.mockRestore();
        }
    });

    it("rejects a statement revision changed during external detection before committing the save", async () => {
        const fixture = await seedFixture();
        await grantLanguageAccess();
        let changed = false;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                if (!changed) {
                    changed = true;
                    const opinion = firstRow(
                        await db
                            .select()
                            .from(opinionTable)
                            .where(
                                eq(opinionTable.slugId, fixture.first.slugId),
                            ),
                    );
                    await db.transaction(async (tx) => {
                        const revision = firstRow(
                            await tx
                                .insert(opinionContentTable)
                                .values({
                                    opinionId: opinion.id,
                                    conversationContentId: fixture.content.id,
                                    content: "Concurrent edit",
                                    contentPlainText: "Concurrent edit",
                                    isEdited: true,
                                    editedByUserId: OWNER,
                                })
                                .returning(),
                        );
                        await tx
                            .update(opinionTable)
                            .set({ currentContentId: revision.id })
                            .where(eq(opinionTable.id, opinion.id));
                    });
                }
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "google_translate",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            expect(
                await updateConversation({
                    db,
                    userId: OWNER,
                    googleCloudCredentials,
                    data: {
                        ...fixture.request,
                        conversationTitle: "Must not apply",
                        multilingualSetting: {
                            dynamicTranslationEnabled: true,
                            additionalLanguageCodes: ["fr"],
                        },
                        seedOpinionChanges: [
                            {
                                action: "edit",
                                slugId: fixture.first.slugId,
                                sourceVersion: fixture.first.sourceVersion,
                                content: "Prepared edit",
                            },
                        ],
                    },
                }),
            ).toMatchObject({
                success: false,
                reason: "seed_opinion_change_rejected",
                changeFailure: "version_conflict",
            });
            expect(
                firstRow(
                    await db
                        .select()
                        .from(conversationTable)
                        .where(
                            eq(conversationTable.id, fixture.conversation.id),
                        ),
                ).currentContentId,
            ).toBe(fixture.content.id);
        } finally {
            detector.mockRestore();
        }
    });

    it("rolls back when a concurrent new statement introduces an unprepared provider input", async () => {
        const fixture = await seedFixture();
        await grantLanguageAccess();
        let inserted = false;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                if (!inserted) {
                    inserted = true;
                    await db.transaction(async (tx) => {
                        const opinion = firstRow(
                            await tx
                                .insert(opinionTable)
                                .values({
                                    slugId: "latepaid",
                                    authorId: OWNER,
                                    conversationId: fixture.conversation.id,
                                    isSeed: true,
                                })
                                .returning(),
                        );
                        const content = firstRow(
                            await tx
                                .insert(opinionContentTable)
                                .values({
                                    opinionId: opinion.id,
                                    conversationContentId: fixture.content.id,
                                    content: "Late unprepared statement",
                                    contentPlainText:
                                        "Late unprepared statement",
                                })
                                .returning(),
                        );
                        await tx
                            .update(opinionTable)
                            .set({ currentContentId: content.id })
                            .where(eq(opinionTable.id, opinion.id));
                    });
                }
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "google_translate",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            await expect(
                updateConversation({
                    db,
                    userId: OWNER,
                    googleCloudCredentials,
                    data: {
                        ...fixture.request,
                        multilingualSetting: {
                            dynamicTranslationEnabled: true,
                            additionalLanguageCodes: ["fr"],
                        },
                    },
                }),
            ).rejects.toMatchObject({ statusCode: 409 });
            expect(detector).toHaveBeenCalledTimes(3);
            expect(
                firstRow(
                    await db
                        .select()
                        .from(conversationTable)
                        .where(
                            eq(conversationTable.id, fixture.conversation.id),
                        ),
                ).dynamicTranslationEnabled,
            ).toBe(false);
            expect(
                firstRow(
                    await db
                        .select()
                        .from(conversationContentTable)
                        .where(
                            eq(conversationContentTable.id, fixture.content.id),
                        ),
                ).sourceLanguageProvider,
            ).toBeNull();
        } finally {
            detector.mockRestore();
        }
    });

    it.each([false, true])(
        "atomically edits and soft-deletes existing seeds, preserving history (ranking=%s)",
        async (ranking) => {
            const fixture = await seedFixture({ ranking });
            const saved = await save({
                ...fixture.request,
                conversationTitle: "Updated together",
                seedOpinionChanges: [
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Edited first seed",
                    },
                    {
                        action: "delete",
                        slugId: fixture.second.slugId,
                        sourceVersion: fixture.second.sourceVersion,
                    },
                ],
                newSeedOpinionList: ["Second seed"],
            });
            expect(saved.success).toBe(true);
            if (!ranking)
                expect(
                    saved.success && saved.updatedOpinions?.at(0),
                ).toMatchObject({
                    opinion: "Edited first seed",
                    isEdited: true,
                });
            const edited = await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            });
            expect(
                edited.success &&
                    edited.seedOpinions.map((opinion) => opinion.content),
            ).toEqual(["Edited first seed", "Second seed"]);
            if (ranking) {
                const removed = firstRow(
                    await db
                        .select()
                        .from(rankingItemTable)
                        .where(
                            eq(rankingItemTable.slugId, fixture.second.slugId),
                        ),
                );
                expect(removed.currentContentId).toBeNull();
                expect(
                    await db
                        .select()
                        .from(rankingItemContentTable)
                        .where(
                            eq(
                                rankingItemContentTable.rankingItemId,
                                removed.id,
                            ),
                        ),
                ).toHaveLength(1);
                const config = firstRow(
                    await db
                        .select()
                        .from(rankingConversationConfigTable)
                        .where(
                            eq(
                                rankingConversationConfigTable.id,
                                fixture.config.id,
                            ),
                        ),
                );
                expect(config.itemCount).toBe(2);
                expect(config.totalItemCount).toBe(2);
            } else {
                const removed = firstRow(
                    await db
                        .select()
                        .from(opinionTable)
                        .where(eq(opinionTable.slugId, fixture.second.slugId)),
                );
                expect(removed.currentContentId).toBeNull();
                expect(
                    await db
                        .select()
                        .from(opinionContentTable)
                        .where(eq(opinionContentTable.opinionId, removed.id)),
                ).toHaveLength(1);
                const changed = firstRow(
                    await db
                        .select()
                        .from(opinionTable)
                        .where(eq(opinionTable.slugId, fixture.first.slugId)),
                );
                const versions = await db
                    .select()
                    .from(opinionContentTable)
                    .where(eq(opinionContentTable.opinionId, changed.id));
                expect(versions).toHaveLength(2);
                expect(
                    versions.find(
                        (version) => version.id === changed.currentContentId,
                    ),
                ).toMatchObject({ isEdited: true, editedByUserId: OWNER });
            }
        },
    );

    it("rejects stale, cross-conversation, and duplicate edits before applying details or deletions", async () => {
        const fixture = await seedFixture();
        for (const { sourceVersion, content, reason } of [
            {
                sourceVersion: randomUUID(),
                content: "Changed",
                reason: "seed_opinion_change_rejected",
            },
            {
                sourceVersion: fixture.first.sourceVersion,
                content: fixture.second.content,
                reason: "invalid_seed_opinion",
            },
        ]) {
            expect(
                await save({
                    ...fixture.request,
                    conversationTitle: "Must not apply",
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion,
                            content,
                        },
                    ],
                }),
            ).toMatchObject({ success: false, reason });
        }
        const other = await createConversation();
        expect(
            await save({
                ...other.request,
                seedOpinionChanges: [
                    {
                        action: "delete",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "not_found",
        });
        const unchanged = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(unchanged.success && unchanged.conversationTitle).toBe(
            "Original title",
        );
        expect(unchanged.success && unchanged.seedOpinions).toHaveLength(2);
    });

    it("reports voted seeds as uneditable and rejects changes atomically while allowing soft-deletion", async () => {
        const fixture = await seedFixture();
        const opinion = firstRow(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.slugId, fixture.first.slugId)),
        );
        if (opinion.currentContentId === null)
            throw new Error("Missing seed content");
        const vote = firstRow(
            await db
                .insert(voteTable)
                .values({ authorId: STRANGER, opinionId: opinion.id })
                .returning(),
        );
        const content = firstRow(
            await db
                .insert(voteContentTable)
                .values({
                    voteId: vote.id,
                    opinionContentId: opinion.currentContentId,
                    vote: "agree",
                })
                .returning(),
        );
        await db
            .update(voteTable)
            .set({ currentContentId: content.id })
            .where(eq(voteTable.id, vote.id));
        const edit = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            edit.success &&
                edit.seedOpinions.find(
                    (seed) => seed.slugId === fixture.first.slugId,
                )?.editing.allowed,
        ).toBe(false);
        expect(
            await save({
                ...fixture.request,
                conversationTitle: "Must not apply",
                seedOpinionChanges: [
                    {
                        action: "delete",
                        slugId: fixture.second.slugId,
                        sourceVersion: fixture.second.sourceVersion,
                    },
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Rewritten voted seed",
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "has_votes",
            seedOpinionSlugId: fixture.first.slugId,
        });
        expect(
            firstRow(
                await db
                    .select()
                    .from(opinionTable)
                    .where(eq(opinionTable.slugId, fixture.second.slugId)),
            ).currentContentId,
        ).not.toBeNull();
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "delete",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(voteTable)
                    .where(eq(voteTable.id, vote.id)),
            ).currentContentId,
        ).toBe(content.id);
    });

    it("rolls back existing edits and deletions when later work fails", async () => {
        const fixture = await seedFixture();
        const failure = vi
            .spyOn(
                translations,
                "createEagerContentTranslationWorkForKnownConversation",
            )
            .mockRejectedValueOnce(new Error("translation unavailable"));
        try {
            await expect(
                save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content: "Draft edit",
                        },
                        {
                            action: "delete",
                            slugId: fixture.second.slugId,
                            sourceVersion: fixture.second.sourceVersion,
                        },
                    ],
                }),
            ).rejects.toThrow("translation unavailable");
        } finally {
            failure.mockRestore();
        }
        const unchanged = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            unchanged.success &&
                unchanged.seedOpinions.map((seed) => seed.content),
        ).toEqual(["First seed", "Second seed"]);
    });

    it("rejects an old revision even when the statement text has returned to its original value", async () => {
        const fixture = await seedFixture();
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content: "Temporary edit",
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        const changed = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        if (!changed.success) throw new Error("Missing changed fixture");
        const temporary = firstRow(changed.seedOpinions);
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: temporary.slugId,
                            sourceVersion: temporary.sourceVersion,
                            content: fixture.first.content,
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        expect(
            await save({
                ...fixture.request,
                seedOpinionChanges: [
                    {
                        action: "delete",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "version_conflict",
        });
    });

    it("rejects a family conversion that would publish a hidden statement", async () => {
        const fixture = await seedFixture();
        const opinion = firstRow(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.slugId, fixture.first.slugId)),
        );
        await db.insert(opinionModerationTable).values({
            opinionId: opinion.id,
            authorId: OWNER,
            moderationAction: "hide",
            moderationReason: "spam",
        });
        const target = {
            conversationType: "prioritizing",
            prioritizationType: "comparisons",
            comparisonMethod: "pairwise",
        } as const;
        expect(
            await updateConversation({
                db,
                userId: OWNER,
                valkey: cache,
                data: {
                    ...fixture.request,
                    expectedConversationTypeConfig:
                        fixture.request.conversationTypeConfig,
                    conversationTypeConfig: target,
                },
            }),
        ).toMatchObject({
            success: false,
            reason: "conversation_type_fixed",
        });
        const stored = firstRow(
            await db
                .select()
                .from(conversationTable)
                .where(eq(conversationTable.id, fixture.conversation.id)),
        );
        expect(stored.conversationType).toBe("polis");
        expect(
            await db
                .select()
                .from(rankingItemTable)
                .where(
                    eq(
                        rankingItemTable.conversationId,
                        fixture.conversation.id,
                    ),
                ),
        ).toEqual([]);
    });

    it("reports hidden statements as restricted and rejects their edits", async () => {
        const fixture = await seedFixture();
        const opinion = firstRow(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.slugId, fixture.first.slugId)),
        );
        await db.insert(opinionModerationTable).values({
            opinionId: opinion.id,
            authorId: OWNER,
            moderationAction: "hide",
            moderationReason: "spam",
        });
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            editable.success &&
                editable.seedOpinions.find(
                    (seed) => seed.slugId === fixture.first.slugId,
                )?.editing,
        ).toEqual({ allowed: false, reason: "not_allowed" });
        expect(
            await save({
                ...fixture.request,
                seedOpinionChanges: [
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Hidden edit",
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "not_allowed",
        });
    });

    it("does not add a database round trip per statement when loading edit permissions", async () => {
        const fixture = await seedFixture();
        const queryLogger = vi.fn();
        const measuredDb = drizzle({
            client,
            logger: { logQuery: queryLogger },
        });
        await getConversationForEdit({
            db: measuredDb,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        const twoStatementQueries = queryLogger.mock.calls.length;
        expect(
            (
                await save({
                    ...fixture.request,
                    newSeedOpinionList: ["Third", "Fourth", "Fifth", "Sixth"],
                })
            ).success,
        ).toBe(true);
        queryLogger.mockClear();
        await getConversationForEdit({
            db: measuredDb,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(queryLogger.mock.calls).toHaveLength(twoStatementQueries);
    });

    it("requires explicit edit permissions and bounds change batches at the API boundary", () => {
        expect(
            Dto.editableConversationSeedOpinion.safeParse({
                slugId: "seedtest",
                content: "Text",
                sourceVersion: randomUUID(),
            }).success,
        ).toBe(false);
        expect(
            Dto.updateConversationRequest.shape.seedOpinionChanges.safeParse(
                Array.from({ length: 51 }, () => ({
                    action: "delete",
                    slugId: "seedtest",
                    sourceVersion: randomUUID(),
                })),
            ).success,
        ).toBe(false);
    });

    it("sanitizes edits through the normal statement rich-text boundary", async () => {
        const fixture = await seedFixture();
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content:
                                '<p>Safe text<script>alert(1)</script><img src="x" onerror="alert(1)"></p>',
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        const edited = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(edited.success && firstRow(edited.seedOpinions).content).toBe(
            "<p>Safe text</p>",
        );
    });

    it("bounds language-provider concurrency for existing statement edits", async () => {
        const fixture = await seedFixture();
        expect(
            (
                await save({
                    ...fixture.request,
                    newSeedOpinionList: [
                        "Third",
                        "Fourth",
                        "Fifth",
                        "Sixth",
                        "Seventh",
                    ],
                })
            ).success,
        ).toBe(true);
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        if (!editable.success) throw new Error("Missing editable fixture");
        let active = 0;
        let maximumActive = 0;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                active += 1;
                maximumActive = Math.max(maximumActive, active);
                await new Promise((resolve) => setTimeout(resolve, 5));
                active -= 1;
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "lingua",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            expect(
                (
                    await save({
                        ...fixture.request,
                        seedOpinionChanges: editable.seedOpinions.map(
                            (opinion) => ({
                                action: "edit",
                                slugId: opinion.slugId,
                                sourceVersion: opinion.sourceVersion,
                                content: `${opinion.content} edited`,
                            }),
                        ),
                    })
                ).success,
            ).toBe(true);
            expect(detector).toHaveBeenCalledTimes(7);
            expect(maximumActive).toBeGreaterThan(1);
            expect(maximumActive).toBeLessThanOrEqual(5);
        } finally {
            detector.mockRestore();
        }
    });

    it("rejects the entire save when a buffered vote exists before staging an edit", async () => {
        const fixture = await seedFixture();
        const hasBlockingVotes = vi.fn().mockResolvedValueOnce(true);
        expect(
            await updateConversation({
                db,
                userId: OWNER,
                voteBuffer: {
                    hasBlockingVotes,
                    add: vi.fn(),
                    flush: vi.fn(),
                    shutdown: vi.fn(),
                },
                data: {
                    ...fixture.request,
                    conversationTitle: "Must not apply",
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content: "Changed while voting",
                        },
                        {
                            action: "delete",
                            slugId: fixture.second.slugId,
                            sourceVersion: fixture.second.sourceVersion,
                        },
                    ],
                },
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "has_votes",
        });
        const unchanged = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(unchanged.success && unchanged.conversationTitle).toBe(
            "Original title",
        );
        expect(
            unchanged.success &&
                unchanged.seedOpinions.map((seed) => seed.content),
        ).toEqual(["First seed", "Second seed"]);
    });

    it("blocks ranked edits for valid votes but allows them after the voter deletes their account", async () => {
        const fixture = await seedFixture({ ranking: true });
        const result = firstRow(
            await db
                .insert(comparisonResponseTable)
                .values({
                    participantId: STRANGER,
                    conversationId: fixture.conversation.id,
                    comparisons: [],
                })
                .returning(),
        );
        await db.insert(comparisonAnswerTable).values({
            comparisonResponseId: result.id,
            position: 0,
            bestSlugId: fixture.first.slugId,
            worstSlugId: fixture.second.slugId,
            candidateSet: [fixture.first.slugId, fixture.second.slugId],
        });
        const edit = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            edit.success &&
                edit.seedOpinions.every((seed) => !seed.editing.allowed),
        ).toBe(true);
        expect(
            await save({
                ...fixture.request,
                seedOpinionChanges: [
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Rewritten ranked seed",
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "has_votes",
        });
        await db
            .update(userTable)
            .set({ isDeleted: true })
            .where(eq(userTable.id, STRANGER));
        try {
            const afterDeletion = await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            });
            expect(
                afterDeletion.success &&
                    afterDeletion.seedOpinions.every(
                        (seed) => seed.editing.allowed,
                    ),
            ).toBe(true);
            expect(
                (
                    await save({
                        ...fixture.request,
                        seedOpinionChanges: [
                            {
                                action: "edit",
                                slugId: fixture.first.slugId,
                                sourceVersion: fixture.first.sourceVersion,
                                content: "Rewritten ranked seed",
                            },
                        ],
                    })
                ).success,
            ).toBe(true);
        } finally {
            await db
                .update(userTable)
                .set({ isDeleted: false })
                .where(eq(userTable.id, STRANGER));
        }
    });

    it("keeps the content version unchanged when adding seeds to a conversation without a body", async () => {
        const { request, conversation, content } = await createConversation({
            absentBody: true,
        });
        expect(
            (await save({ ...request, newSeedOpinionList: ["A new seed"] }))
                .success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversation.id)),
            ).currentContentId,
        ).toBe(content.id);
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(conversationContentTable)
                    .where(
                        eq(
                            conversationContentTable.conversationId,
                            conversation.id,
                        ),
                    ),
            ).count,
        ).toBe(1);
    });

    it("resolves each seed language once with bounded provider concurrency", async () => {
        const { request } = await createConversation();
        let active = 0;
        let maximumActive = 0;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                active += 1;
                maximumActive = Math.max(active, maximumActive);
                await new Promise((resolve) => setTimeout(resolve, 5));
                active -= 1;
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "lingua",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            expect(
                (
                    await save({
                        ...request,
                        newSeedOpinionList: Array.from(
                            { length: 7 },
                            (_, index) => `Seed ${index}`,
                        ),
                    })
                ).success,
            ).toBe(true);
            expect(detector).toHaveBeenCalledTimes(7);
            expect(maximumActive).toBeGreaterThan(1);
            expect(maximumActive).toBeLessThanOrEqual(5);
        } finally {
            detector.mockRestore();
        }
    });

    it("uses the same content-edit entitlement policy for displaying and adding seed statements", async () => {
        const { request, conversation } = await createConversation();
        await db
            .update(conversationTable)
            .set({ requiresEventTicket: "devconnect-2025" })
            .where(eq(conversationTable.id, conversation.id));
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: conversation.slugId,
        });
        expect(editable.success && editable.canAddSeedOpinions).toBe(true);
        expect(
            (
                await save({
                    ...request,
                    newSeedOpinionList: ["Facilitator seed"],
                })
            ).success,
        ).toBe(true);
    });

    it("saves details without requiring new statements and rejects empty additions atomically", async () => {
        const { request, conversation } = await createConversation();
        expect(
            (await save({ ...request, conversationTitle: "Details only" }))
                .success,
        ).toBe(true);
        expect(
            await save({
                ...request,
                conversationTitle: "Invalid update",
                newSeedOpinionList: ["<p></p>"],
            }),
        ).toMatchObject({
            success: false,
            reason: "invalid_seed_opinion",
            seedOpinionFailure: { index: 0, reason: "plain_text_empty" },
        });
        const current = firstRow(
            await db
                .select({ title: conversationContentTable.title })
                .from(conversationTable)
                .innerJoin(
                    conversationContentTable,
                    eq(
                        conversationContentTable.id,
                        conversationTable.currentContentId,
                    ),
                )
                .where(eq(conversationTable.id, conversation.id)),
        );
        expect(current.title).toBe("Details only");
        expect(
            Dto.updateConversationRequest.safeParse({
                ...request,
                seedOpinions: [{ slugId: "oldseed1", content: "Changed" }],
            }).success,
        ).toBe(false);
    });

    it("returns the committed statement when its automatic agreement cannot be queued", async () => {
        const original = await createConversation();
        const voteBuffer: VoteBuffer = {
            add: vi.fn(async () => {
                throw new Error("Cache unavailable");
            }),
            hasBlockingVotes: vi.fn(async () => false),
            flush: vi.fn(async () => {}),
            shutdown: vi.fn(async () => {}),
        };
        const result = await postNewOpinion({
            db,
            normalizedContent: {
                html: "<p>Committed statement</p>",
                plainText: "Committed statement",
            },
            conversationSlugId: original.conversation.slugId,
            now: new Date(),
            isSeed: false,
            voteBuffer,
            conversationMetadata: {
                conversationId: original.conversation.id,
                conversationContentId: original.content.id,
                conversationAuthorId: OWNER,
            },
        });
        expect(result.success).toBe(true);
        expect(voteBuffer.add).toHaveBeenCalledOnce();
        expect(
            await db
                .select()
                .from(opinionTable)
                .where(
                    eq(opinionTable.conversationId, original.conversation.id),
                ),
        ).toHaveLength(1);
    });

    it("appends new seeds without altering existing content or votes", async () => {
        const original = await createConversation();
        const oldSeed = await postNewOpinion({
            db,
            normalizedContent: {
                html: "<p>Existing seed</p>",
                plainText: "Existing seed",
            },
            conversationSlugId: original.conversation.slugId,
            now: new Date(),
            isSeed: true,
            conversationMetadata: {
                conversationId: original.conversation.id,
                conversationContentId: original.content.id,
                conversationAuthorId: OWNER,
            },
        });
        if (!oldSeed.success) throw new Error("Failed to create fixture seed");
        const opinion = firstRow(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.slugId, oldSeed.opinionSlugId)),
        );
        if (opinion.currentContentId === null)
            throw new Error("Missing seed content");
        const vote = firstRow(
            await db
                .insert(voteTable)
                .values({ authorId: OWNER, opinionId: opinion.id })
                .returning(),
        );
        const voteContent = firstRow(
            await db
                .insert(voteContentTable)
                .values({
                    voteId: vote.id,
                    opinionContentId: opinion.currentContentId,
                    vote: "agree",
                })
                .returning(),
        );
        await db
            .update(voteTable)
            .set({ currentContentId: voteContent.id })
            .where(eq(voteTable.id, vote.id));

        const result = await save({
            ...original.request,
            newSeedOpinionList: ["<p>New <strong>seed</strong></p>"],
        });
        expect(result.success).toBe(true);
        expect(result.success && result.addedOpinions?.at(0)?.numAgrees).toBe(
            0,
        );
        expect(
            firstRow(
                await db
                    .select()
                    .from(opinionTable)
                    .where(eq(opinionTable.id, opinion.id)),
            ),
        ).toEqual(opinion);
        expect(
            firstRow(
                await db
                    .select()
                    .from(voteTable)
                    .where(eq(voteTable.id, vote.id)),
            ).currentContentId,
        ).toBe(voteContent.id);
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(voteTable)
                    .where(eq(voteTable.opinionId, opinion.id)),
            ).count,
        ).toBe(1);
        const edit = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: original.conversation.slugId,
        });
        expect(
            edit.success && edit.seedOpinions.map((seed) => seed.content),
        ).toEqual(["<p>Existing seed</p>", "<p>New <strong>seed</strong></p>"]);
        expect(
            firstRow(
                await db
                    .select()
                    .from(opinionContentTable)
                    .where(
                        eq(opinionContentTable.id, opinion.currentContentId),
                    ),
            ).content,
        ).toBe("<p>Existing seed</p>");
    });

    it("rejects duplicate concurrent saves without inserting twice", async () => {
        const { request, conversation } = await createConversation();
        const results = await Promise.all([
            save({ ...request, newSeedOpinionList: ["One seed"] }),
            save({ ...request, newSeedOpinionList: ["<p>ONE SEED</p>"] }),
        ]);
        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(results.find((result) => !result.success)).toMatchObject({
            reason: "invalid_seed_opinion",
            seedOpinionFailure: { index: 0, reason: "duplicate" },
        });
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(opinionTable)
                    .where(eq(opinionTable.conversationId, conversation.id)),
            ).count,
        ).toBe(1);
    });

    it("rolls back details and every new statement when later work fails", async () => {
        const { request, conversation, content } = await createConversation();
        const translationFailure = vi
            .spyOn(
                translations,
                "createEagerContentTranslationWorkForKnownConversation",
            )
            .mockRejectedValueOnce(new Error("translation unavailable"));
        try {
            await expect(
                save({
                    ...request,
                    conversationTitle: "Changed title",
                    newSeedOpinionList: ["First seed", "Second seed"],
                }),
            ).rejects.toThrow("translation unavailable");
        } finally {
            translationFailure.mockRestore();
        }
        expect(
            firstRow(
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversation.id)),
            ).currentContentId,
        ).toBe(content.id);
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(opinionTable)
                    .where(eq(opinionTable.conversationId, conversation.id)),
            ).count,
        ).toBe(0);
    });

    it("allows additions to closed conversations without reopening them", async () => {
        const { request, conversation } = await createConversation({
            closed: true,
        });
        expect(
            (
                await save({
                    ...request,
                    newSeedOpinionList: ["Prepared for later"],
                })
            ).success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversation.id)),
            ).isClosed,
        ).toBe(true);
    });

    it("enforces editor permissions and locking", async () => {
        const { request, conversation } = await createConversation();
        await expect(
            requireConversationCapabilityBySlug({
                db,
                userId: STRANGER,
                conversationSlugId: conversation.slugId,
                capability: "conversation_edit",
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        await db.insert(conversationModerationTable).values({
            conversationId: conversation.id,
            authorId: OWNER,
            moderationAction: "lock",
            moderationReason: "spam",
        });
        expect(
            await save({ ...request, newSeedOpinionList: ["Locked"] }),
        ).toMatchObject({ success: false, reason: "conversation_locked" });
    });

    it("adds manual ranking seeds and preserves source-managed lists", async () => {
        const manual = await createConversation({ ranking: true });
        expect(
            (
                await save({
                    ...manual.request,
                    newSeedOpinionList: ["First item", "Second item"],
                })
            ).success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(rankingConversationConfigTable)
                    .where(
                        eq(rankingConversationConfigTable.id, manual.config.id),
                    ),
            ).itemCount,
        ).toBe(2);
        expect(
            await db
                .select({ isSeed: rankingItemTable.isSeed })
                .from(rankingItemTable)
                .where(
                    eq(rankingItemTable.conversationId, manual.conversation.id),
                ),
        ).toEqual([{ isSeed: true }, { isSeed: true }]);
        const linked = await createConversation({
            ranking: true,
            sourceManaged: true,
        });
        expect(
            await save({
                ...linked.request,
                newSeedOpinionList: ["Manual item"],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinions_not_allowed",
        });
    });
});
