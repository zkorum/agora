import { Script } from "@valkey/valkey-glide";
import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import pino from "pino";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

import {
    analysisSnapshotOpinionTable,
    contentTranslationWorkTable,
    conversationTable,
    conversationViewSnapshotTable,
    opinionContentTable,
    opinionContentTranslationTable,
    opinionModerationTable,
    opinionTable,
    userTable,
} from "../src/shared-backend/schema.js";
import { ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT } from "../src/shared-backend/contentTranslationQueue.js";
import {
    cancelPendingOpinionTranslationWorkForOpinion,
    cancelPendingOpinionTranslationWorkForUser,
} from "../src/shared-backend/contentTranslationWork.js";
import { Dto } from "../src/shared/types/dto.js";
import { isSiteModeratorAccount } from "../src/service/authUtil.js";
import { requestContentTranslation } from "../src/service/contentTranslation.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const conversationSlugId = "conv1234";
const opinionSlugId = "opin1234";
const historicalSourceVersion = "00000000-0000-4000-8000-000000000001";
const currentSourceVersion = "00000000-0000-4000-8000-000000000002";
const opinionAuthorId = "00000000-0000-4000-8000-000000000003";
const guestUserId = "00000000-0000-4000-8000-000000000004";
const normalUserId = "00000000-0000-4000-8000-000000000005";
const siteModeratorUserId = "00000000-0000-4000-8000-000000000006";

describe("opinion content translation boundary", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let queueScript: Script;
    let opinionId: number;
    let historicalContentId: number;
    let currentContentId: number;

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
            max: 4,
        });
        db = drizzle(sqlClient);
        queueScript = new Script(ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT);

        await sqlClient.unsafe(readDbFixtureSql("content-translation.sql"));
    }, 120_000);

    afterAll(async () => {
        queueScript?.release();
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await sqlClient.unsafe(`
            TRUNCATE TABLE "content_translation_work", "opinion_moderation", "analysis_snapshot_opinion", "conversation_view_snapshot",
                "opinion_content_translation", "opinion_content", "opinion", "conversation", "user"
            RESTART IDENTITY;
        `);

        await db.insert(userTable).values([
            {
                id: opinionAuthorId,
                username: "opinion-author",
            },
            {
                id: guestUserId,
                username: "guest-requester",
            },
            {
                id: normalUserId,
                username: "normal-requester",
            },
            {
                id: siteModeratorUserId,
                username: "site-moderator",
                isSiteModerator: true,
            },
        ]);

        const conversations = await db
            .insert(conversationTable)
            .values({
                slugId: conversationSlugId,
                projectId: 1,
                polisConfigId: 1,
            })
            .returning({ id: conversationTable.id });
        const conversation = conversations.at(0);
        if (conversation === undefined) {
            throw new Error("Failed to create test conversation");
        }

        const opinions = await db
            .insert(opinionTable)
            .values({
                slugId: opinionSlugId,
                authorId: opinionAuthorId,
                conversationId: conversation.id,
            })
            .returning({ id: opinionTable.id });
        const opinion = opinions.at(0);
        if (opinion === undefined) {
            throw new Error("Failed to create test opinion");
        }
        opinionId = opinion.id;

        const contents = await db
            .insert(opinionContentTable)
            .values([
                {
                    publicId: historicalSourceVersion,
                    opinionId,
                    conversationContentId: 1,
                    content: "Hidden historical statement",
                    sourceLanguageCode: "es",
                },
                {
                    publicId: currentSourceVersion,
                    opinionId,
                    conversationContentId: 1,
                    content: "Current statement",
                    sourceLanguageCode: "es",
                },
            ])
            .returning({
                id: opinionContentTable.id,
                publicId: opinionContentTable.publicId,
            });
        const historicalContent = contents.find(
            (content) => content.publicId === historicalSourceVersion,
        );
        const currentContent = contents.find(
            (content) => content.publicId === currentSourceVersion,
        );
        if (historicalContent === undefined || currentContent === undefined) {
            throw new Error("Failed to create test opinion revisions");
        }
        historicalContentId = historicalContent.id;
        currentContentId = currentContent.id;

        await db
            .update(opinionTable)
            .set({ currentContentId })
            .where(eq(opinionTable.id, opinionId));
        await db
            .update(conversationTable)
            .set({ currentContentId: 1 })
            .where(eq(conversationTable.id, conversation.id));
        await db.insert(analysisSnapshotOpinionTable).values({
            analysisSnapshotId: 1,
            opinionId,
            opinionContentId: historicalContentId,
            localOpinionIndex: 0,
        });
        await db.insert(conversationViewSnapshotTable).values({
            conversationId: conversation.id,
            opinionGroupSpecId: 1,
            analysisSnapshotId: 1,
            conversationContentId: 1,
            viewReason: "analysis_completed",
            isClosed: false,
            opinionCount: 1,
            voteCount: 1,
            participantCount: 1,
            totalOpinionCount: 1,
            totalVoteCount: 1,
            totalParticipantCount: 1,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            activatedAt: new Date("2026-01-01T00:00:00.000Z"),
        });
    });

    async function requestOpinionTranslation({
        sourceVersion,
        requestMode,
        requesterUserId,
        beforeQueueTranslationWork,
    }: {
        sourceVersion: string;
        requestMode: "read_existing" | "queue_if_missing";
        requesterUserId: string;
        beforeQueueTranslationWork: () => Promise<void>;
    }) {
        const request = Dto.contentTranslationRequest.parse({
            subject: {
                kind: "opinion",
                conversationSlugId,
                opinionSlugId,
                sourceVersion,
            },
            targetLanguageCode: "en",
            requestMode,
        });

        return await requestContentTranslation({
            db,
            valkey: undefined,
            queueScript,
            subject: request.subject,
            targetLanguageCode: request.targetLanguageCode,
            requestMode: request.requestMode,
            requesterIsSiteModerator: await isSiteModeratorAccount({
                db,
                userId: requesterUserId,
            }),
            now: new Date("2026-01-01T00:00:00.000Z"),
            log: pino({ enabled: false }),
            beforeQueueTranslationWork,
        });
    }

    it("keeps explicit sourceVersion requests revision-aware", async () => {
        await db.insert(opinionContentTranslationTable).values({
            opinionContentId: historicalContentId,
            displayLanguageCode: "en",
            translatedContent: "Historical translated statement",
            sourceLanguageCode: "es",
        });

        const response = await requestOpinionTranslation({
            sourceVersion: historicalSourceVersion,
            requestMode: "read_existing",
            requesterUserId: normalUserId,
            beforeQueueTranslationWork: async () => {},
        });
        if (response === undefined) {
            throw new Error(
                "Expected historical checkpoint translation response",
            );
        }
        const parsedResponse = Dto.contentTranslationResponse.parse({
            success: true,
            ...response,
        });

        expect(parsedResponse).toMatchObject({
            subject: { sourceVersion: historicalSourceVersion },
            content: {
                sourceVersion: historicalSourceVersion,
                variants: {
                    original: { content: "Hidden historical statement" },
                    translated: { content: "Historical translated statement" },
                },
            },
        });
    });

    it("does not expose an unreferenced historical revision", async () => {
        await db.delete(analysisSnapshotOpinionTable);

        const response = await requestOpinionTranslation({
            sourceVersion: historicalSourceVersion,
            requestMode: "read_existing",
            requesterUserId: normalUserId,
            beforeQueueTranslationWork: async () => {},
        });

        expect(response).toBeUndefined();
    });

    it("does not expose a revision from an unactivated analysis", async () => {
        await db
            .update(conversationViewSnapshotTable)
            .set({ activatedAt: null });

        const response = await requestOpinionTranslation({
            sourceVersion: historicalSourceVersion,
            requestMode: "read_existing",
            requesterUserId: normalUserId,
            beforeQueueTranslationWork: async () => {},
        });

        expect(response).toBeUndefined();
    });

    it.each([
        { requesterKind: "guest", requesterUserId: guestUserId },
        { requesterKind: "non-admin", requesterUserId: normalUserId },
    ])(
        "does not leak hidden historical text to a $requesterKind requester",
        async ({ requesterUserId }) => {
            await db.insert(opinionModerationTable).values({
                opinionId,
                moderationAction: "hide",
                moderationReason: "spam",
            });
            let queueAuthorizationChecks = 0;

            const response = await requestOpinionTranslation({
                sourceVersion: historicalSourceVersion,
                requestMode: "queue_if_missing",
                requesterUserId,
                beforeQueueTranslationWork: async () => {
                    queueAuthorizationChecks += 1;
                },
            });

            expect(response).toBeUndefined();
            expect(queueAuthorizationChecks).toBe(0);
            expect(
                await db.select().from(contentTranslationWorkTable),
            ).toHaveLength(0);
        },
    );

    it("allows a site administrator to translate hidden historical text", async () => {
        await db.insert(opinionContentTranslationTable).values({
            opinionContentId: historicalContentId,
            displayLanguageCode: "en",
            translatedContent: "Historical translated statement",
            sourceLanguageCode: "es",
        });
        await db.insert(opinionModerationTable).values({
            opinionId,
            moderationAction: "hide",
            moderationReason: "spam",
        });

        const response = await requestOpinionTranslation({
            sourceVersion: historicalSourceVersion,
            requestMode: "read_existing",
            requesterUserId: siteModeratorUserId,
            beforeQueueTranslationWork: async () => {},
        });

        expect(response).toMatchObject({
            subject: { sourceVersion: historicalSourceVersion },
            content: {
                variants: {
                    original: { content: "Hidden historical statement" },
                    translated: { content: "Historical translated statement" },
                },
            },
        });
    });

    it("allows a normal user to translate a moved statement", async () => {
        await db.insert(opinionContentTranslationTable).values({
            opinionContentId: historicalContentId,
            displayLanguageCode: "en",
            translatedContent: "Historical translated statement",
            sourceLanguageCode: "es",
        });
        await db.insert(opinionModerationTable).values({
            opinionId,
            moderationAction: "move",
            moderationReason: "antisocial",
        });

        const response = await requestOpinionTranslation({
            sourceVersion: historicalSourceVersion,
            requestMode: "read_existing",
            requesterUserId: normalUserId,
            beforeQueueTranslationWork: async () => {},
        });

        expect(response).toMatchObject({
            content: {
                variants: {
                    original: { content: "Hidden historical statement" },
                    translated: { content: "Historical translated statement" },
                },
            },
        });
    });

    it("does not return or queue deleted historical text for a site administrator", async () => {
        await db
            .update(opinionTable)
            .set({ currentContentId: null })
            .where(eq(opinionTable.id, opinionId));
        let queueAuthorizationChecks = 0;

        const response = await requestOpinionTranslation({
            sourceVersion: historicalSourceVersion,
            requestMode: "queue_if_missing",
            requesterUserId: siteModeratorUserId,
            beforeQueueTranslationWork: async () => {
                queueAuthorizationChecks += 1;
            },
        });

        expect(response).toBeUndefined();
        expect(queueAuthorizationChecks).toBe(0);
        expect(
            await db.select().from(contentTranslationWorkTable),
        ).toHaveLength(0);
    });

    it("does not return or queue a revision authored by a deleted user", async () => {
        await db
            .update(userTable)
            .set({ isDeleted: true })
            .where(eq(userTable.id, opinionAuthorId));
        let queueAuthorizationChecks = 0;

        const response = await requestOpinionTranslation({
            sourceVersion: historicalSourceVersion,
            requestMode: "queue_if_missing",
            requesterUserId: siteModeratorUserId,
            beforeQueueTranslationWork: async () => {
                queueAuthorizationChecks += 1;
            },
        });

        expect(response).toBeUndefined();
        expect(queueAuthorizationChecks).toBe(0);
        expect(
            await db.select().from(contentTranslationWorkTable),
        ).toHaveLength(0);
    });

    it("creates one work row when concurrent requests race", async () => {
        const requests = [
            requestOpinionTranslation({
                sourceVersion: currentSourceVersion,
                requestMode: "queue_if_missing",
                requesterUserId: normalUserId,
                beforeQueueTranslationWork: async () => {},
            }),
            requestOpinionTranslation({
                sourceVersion: currentSourceVersion,
                requestMode: "queue_if_missing",
                requesterUserId: normalUserId,
                beforeQueueTranslationWork: async () => {},
            }),
        ];

        const responses = await Promise.all(requests);

        expect(responses.every((response) => response !== undefined)).toBe(
            true,
        );
        expect(
            await db.select().from(contentTranslationWorkTable),
        ).toHaveLength(1);
    });

    it("preserves a running work lease when a request reuses it", async () => {
        const leaseToken = "00000000-0000-4000-8000-000000000007";
        const leaseExpiresAt = new Date("2026-01-01T00:01:00.000Z");
        await db.insert(contentTranslationWorkTable).values({
            conversationId: 1,
            sourceKind: "opinion",
            opinionContentId: currentContentId,
            displayLanguageCode: "en",
            status: "running",
            priorityRank: 1,
            leaseOwner: "worker-1",
            leaseToken,
            leaseExpiresAt,
        });

        await requestOpinionTranslation({
            sourceVersion: currentSourceVersion,
            requestMode: "queue_if_missing",
            requesterUserId: normalUserId,
            beforeQueueTranslationWork: async () => {},
        });

        const rows = await db
            .select({
                status: contentTranslationWorkTable.status,
                priorityRank: contentTranslationWorkTable.priorityRank,
                leaseOwner: contentTranslationWorkTable.leaseOwner,
                leaseToken: contentTranslationWorkTable.leaseToken,
                leaseExpiresAt: contentTranslationWorkTable.leaseExpiresAt,
            })
            .from(contentTranslationWorkTable);
        expect(rows).toEqual([
            {
                status: "running",
                priorityRank: 0,
                leaseOwner: "worker-1",
                leaseToken,
                leaseExpiresAt,
            },
        ]);
    });

    it("cancels pending hidden work without disturbing running leases", async () => {
        const leaseToken = "00000000-0000-4000-8000-000000000008";
        const leaseExpiresAt = new Date("2026-01-01T00:01:00.000Z");
        await db.insert(contentTranslationWorkTable).values([
            {
                conversationId: 1,
                sourceKind: "opinion",
                opinionContentId: historicalContentId,
                displayLanguageCode: "en",
                status: "pending",
            },
            {
                conversationId: 1,
                sourceKind: "opinion",
                opinionContentId: currentContentId,
                displayLanguageCode: "en",
                status: "running",
                leaseOwner: "worker-1",
                leaseToken,
                leaseExpiresAt,
            },
        ]);

        await cancelPendingOpinionTranslationWorkForOpinion({
            db,
            opinionId,
            now: new Date("2026-01-01T00:00:30.000Z"),
        });

        const rows = await db
            .select({
                opinionContentId: contentTranslationWorkTable.opinionContentId,
                status: contentTranslationWorkTable.status,
                leaseOwner: contentTranslationWorkTable.leaseOwner,
                leaseToken: contentTranslationWorkTable.leaseToken,
                lastErrorCode: contentTranslationWorkTable.lastErrorCode,
            })
            .from(contentTranslationWorkTable);
        expect(rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    opinionContentId: historicalContentId,
                    status: "failed",
                    lastErrorCode: "ineligible_source",
                }),
                expect.objectContaining({
                    opinionContentId: currentContentId,
                    status: "running",
                    leaseOwner: "worker-1",
                    leaseToken,
                }),
            ]),
        );
    });

    it("cancels pending work when the opinion author is deleted", async () => {
        await db.insert(contentTranslationWorkTable).values({
            conversationId: 1,
            sourceKind: "opinion",
            opinionContentId: historicalContentId,
            displayLanguageCode: "en",
            status: "pending",
        });

        await cancelPendingOpinionTranslationWorkForUser({
            db,
            userId: opinionAuthorId,
            now: new Date("2026-01-01T00:00:30.000Z"),
        });

        const rows = await db
            .select({
                status: contentTranslationWorkTable.status,
                lastErrorCode: contentTranslationWorkTable.lastErrorCode,
                lastErrorMessage: contentTranslationWorkTable.lastErrorMessage,
            })
            .from(contentTranslationWorkTable);
        expect(rows).toEqual([
            {
                status: "failed",
                lastErrorCode: "ineligible_source",
                lastErrorMessage: "Opinion author account is deleted",
            },
        ]);
    });
});
