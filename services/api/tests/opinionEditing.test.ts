import { randomUUID } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Decoder, GlideClient, Script } from "@valkey/valkey-glide";
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
    analysisSnapshotOpinionTable,
    analysisWorkStateTable,
    conversationContentTable,
    conversationTable,
    conversationViewSnapshotTable,
    opinionContentTable,
    opinionTable,
    opinionGroupSpecTable,
    realtimeEventOutboxTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    polisConversationConfigTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
    voteContentTable,
    voteTable,
    surveyConfigTable,
    surveyQuestionTable,
    surveyQuestionContentTable,
    surveyResponseTable,
    surveyAnswerTable,
} from "../src/shared-backend/schema.js";
import { getOpinionManagementCapabilities } from "../src/service/opinionPermissions.js";
import { editOpinion } from "../src/service/opinionEdit.js";
import { deleteOpinionBySlugId } from "../src/service/comment.js";
import {
    createVoteBuffer,
    CLEANUP_VOTES_SCRIPT,
    type VoteBuffer,
} from "../src/service/voteBuffer.js";
import { readDbFixtureSql } from "./dbFixture.js";
import { VALKEY_QUEUE_KEYS } from "../src/shared-backend/valkeyQueues.js";
import { Dto } from "../src/shared/types/dto.js";
import { zodSSEEventDataByType } from "../src/shared/types/sse.js";
import {
    resolveContentLanguageMetadata,
    UNKNOWN_CONTENT_LANGUAGE_METADATA,
} from "../src/service/contentLanguageMetadata.js";
import { createEagerContentTranslationWorkForOpinion } from "../src/service/contentTranslation.js";
import {
    assertNativeValkeyTimeoutRecovery,
    assertValkeyStallSessionState,
    assertVoteReadSerialization,
} from "./voteBufferReadStallCase.js";
import { assertPostgresVoteFlushRecovery } from "./postgresVoteFlushRecoveryCase.js";
import { scheduleAnalysisUpdate } from "../src/shared-backend/analysisScheduler.js";
import { createConversationViewSnapshotsFromCurrentState } from "../src/service/conversationViewSnapshot.js";
import {
    queueConversationCommentStatsUpdatedEventsForViewSnapshots,
    queueOpinionVoteCountsUpdatedEvent,
} from "../src/service/realtimeEventOutbox.js";
import { fetchConversationSeedOpinions } from "../src/service/conversationSeedOpinions.js";
import { getEligibleParticipantIdsForAnalysis } from "../src/shared-backend/surveyAnalysis.js";

vi.mock("../src/shared-backend/conversationCounters.js", async () => ({
    ...(await vi.importActual("../src/shared-backend/conversationCounters.js")),
    scheduleConversationAnalysisRefresh: vi.fn(),
}));
vi.mock("../src/service/conversationViewSnapshot.js", async () => ({
    ...(await vi.importActual("../src/service/conversationViewSnapshot.js")),
    createConversationViewSnapshotsFromCurrentState: vi.fn(),
}));
vi.mock("../src/service/contentLanguageMetadata.js", async () => ({
    ...(await vi.importActual("../src/service/contentLanguageMetadata.js")),
    resolveContentLanguageMetadata: vi.fn().mockResolvedValue({
        sourceLanguageCode: null,
        sourceRawLanguageCode: null,
        sourceLanguageProvider: null,
        sourceLanguageConfidence: null,
    }),
}));
vi.mock("../src/service/conversationMultilingual.js", () => ({
    getConversationMultilingualSetting: vi.fn().mockResolvedValue({
        dynamicTranslationEnabled: false,
    }),
}));
vi.mock("../src/service/contentTranslation.js", async () => ({
    ...(await vi.importActual("../src/service/contentTranslation.js")),
    createEagerContentTranslationWorkForOpinion: vi.fn().mockResolvedValue([]),
}));

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const authorId = "00000000-0000-4000-8000-000000000001";
const editorId = "00000000-0000-4000-8000-000000000002";
const voterId = "00000000-0000-4000-8000-000000000003";
const blockingVotes = vi
    .fn<VoteBuffer["hasBlockingVotes"]>()
    .mockResolvedValue(false);
const voteBuffer: VoteBuffer = {
    add: vi.fn<VoteBuffer["add"]>().mockResolvedValue(undefined),
    flush: vi.fn<VoteBuffer["flush"]>().mockResolvedValue(undefined),
    shutdown: vi.fn<VoteBuffer["shutdown"]>().mockResolvedValue(undefined),
    hasBlockingVotes: blockingVotes,
};
const translationQueueScript = new Script("return 0");
function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing test fixture row");
    return row;
}

describe("statement editing and seed deletion", () => {
    it("requires the displayed content version on every public vote request", () => {
        expect(
            Dto.castVoteRequest.safeParse({
                opinionSlugId: "editstat",
                chosenOption: "agree",
            }).success,
        ).toBe(false);
        expect(
            Dto.castVoteRequest.safeParse({
                opinionSlugId: "editstat",
                chosenOption: "agree",
                sourceVersion: "00000000-0000-4000-8000-000000000001",
            }).success,
        ).toBe(true);
    });
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    let conversationId: number;
    let conversationContentId: number;
    let cacheContainer: StartedTestContainer;
    let sharedValkey: GlideClient;

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
        });
        db = drizzle(client);
        cacheContainer = await new GenericContainer("valkey/valkey:8-alpine")
            .withExposedPorts(6379)
            .start();
        sharedValkey = await GlideClient.createClient({
            addresses: [
                {
                    host: cacheContainer.getHost(),
                    port: cacheContainer.getMappedPort(6379),
                },
            ],
            defaultDecoder: Decoder.String,
        });
        await db.execute(
            sql.raw(readDbFixtureSql("conversation-seed-opinions.sql")),
        );
    }, 120_000);
    afterAll(async () => {
        translationQueueScript.release();
        await client?.end({ timeout: 5 });
        await container?.stop();
        sharedValkey?.close();
        await cacheContainer?.stop();
    }, 120_000);
    beforeEach(async () => {
        await sharedValkey.flushall();
        blockingVotes.mockReset().mockResolvedValue(false);
        vi.mocked(createEagerContentTranslationWorkForOpinion).mockClear();
        await db.execute(
            sql`TRUNCATE TABLE "user", project, organization, conversation, conversation_content, conversation_view_snapshot, opinion, opinion_content, conversation_participant, vote, vote_content, analysis_snapshot_opinion, organization_membership, organization_membership_all_project_capability, project_organization_ownership, realtime_event_outbox, survey_config, survey_question, survey_question_content, survey_response, survey_answer CASCADE`,
        );
        await db.insert(userTable).values([
            {
                id: authorId,
                username: "statement-author",
                totalOpinionCount: 1,
            },
            { id: editorId, username: "seed-editor", totalOpinionCount: 7 },
            { id: voterId, username: "voter" },
        ]);
        const organization = first(
            await db
                .insert(organizationTable)
                .values({
                    slug: "opinion-org",
                    displayName: "Opinion organization",
                    defaultLanguageCode: "en",
                    isFullImagePath: false,
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const membership = first(
            await db
                .insert(organizationMembershipTable)
                .values({ organizationId: organization.id, userId: editorId })
                .returning(),
        );
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values({
                organizationMembershipId: membership.id,
                capability: "conversation_edit",
                grantedByUserId: authorId,
            });
        const project = first(
            await db
                .insert(projectTable)
                .values({
                    slug: "opinion-project",
                    title: "Opinion project",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId: project.id, organizationId: organization.id });
        const config = first(
            await db
                .insert(polisConversationConfigTable)
                .values({})
                .returning(),
        );
        const conversation = first(
            await db
                .insert(conversationTable)
                .values({
                    slugId: "editconv",
                    projectId: project.id,
                    polisConfigId: config.id,
                })
                .returning(),
        );
        conversationId = conversation.id;
        const content = first(
            await db
                .insert(conversationContentTable)
                .values({ conversationId, title: "Editing test" })
                .returning(),
        );
        conversationContentId = content.id;
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, conversationId));
        await db.insert(conversationViewSnapshotTable).values({
            conversationId,
            conversationContentId,
            opinionGroupSpecId: 1,
            viewReason: "conversation_content_updated",
            isClosed: false,
            opinionCount: 0,
            voteCount: 0,
            participantCount: 0,
            totalOpinionCount: 0,
            totalVoteCount: 0,
            totalParticipantCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            activatedAt: new Date(),
        });
    });

    async function statement(isSeed = false) {
        return await statementForConversation({
            isSeed,
            conversationId,
            conversationContentId,
        });
    }

    async function statementForConversation({
        isSeed,
        conversationId,
        conversationContentId,
    }: {
        isSeed: boolean;
        conversationId: number;
        conversationContentId: number;
    }) {
        const opinion = first(
            await db
                .insert(opinionTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    authorId,
                    conversationId,
                    isSeed,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(opinionContentTable)
                .values({
                    opinionId: opinion.id,
                    conversationContentId,
                    content: "<p>Original statement</p>",
                    contentPlainText: "Original statement",
                })
                .returning(),
        );
        await db
            .update(opinionTable)
            .set({ currentContentId: content.id })
            .where(eq(opinionTable.id, opinion.id));
        return { opinion, content };
    }

    async function requiredSurvey() {
        const survey = first(
            await db
                .insert(surveyConfigTable)
                .values({ conversationId })
                .returning(),
        );
        const question = first(
            await db
                .insert(surveyQuestionTable)
                .values({
                    slugId: "required",
                    surveyConfigId: survey.id,
                    conversationId,
                    questionType: "free_text",
                    displayOrder: 0,
                    isRequired: true,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(surveyQuestionContentTable)
                .values({
                    surveyQuestionId: question.id,
                    questionText: "Required answer",
                    constraints: {
                        type: "free_text",
                        maxPlainTextLength: 100,
                        maxHtmlLength: 200,
                    },
                })
                .returning(),
        );
        await db
            .update(surveyQuestionTable)
            .set({ currentContentId: content.id })
            .where(eq(surveyQuestionTable.id, question.id));
        return { survey, question };
    }

    it("persists votes and live feedback without constructing an analysis frame", async () => {
        const { opinion, content } = await statement(true);
        const buffer = createVoteBuffer({
            db,
            valkeyRef: { current: sharedValkey },
            flushIntervalMs: 60_000,
            valkeyBatchLimit: 100,
        });
        vi.mocked(createConversationViewSnapshotsFromCurrentState).mockClear();
        try {
            await buffer.add({
                vote: {
                    userId: voterId,
                    opinionId: opinion.id,
                    opinionContentId: content.id,
                    conversationId,
                    vote: "agree",
                    timestamp: new Date(),
                },
            });
            await buffer.flush();
            expect(
                createConversationViewSnapshotsFromCurrentState,
            ).not.toHaveBeenCalled();
            const events = await db.select().from(realtimeEventOutboxTable);
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                eventType: "opinion_vote_counts_updated",
                payload: {
                    conversationSlugId: "editconv",
                    opinionVoteCounts: [
                        {
                            opinionSlugId: opinion.slugId,
                            numAgrees: 1,
                            numDisagrees: 0,
                            numPasses: 0,
                        },
                    ],
                },
            });
            expect(
                await db
                    .select()
                    .from(conversationViewSnapshotTable)
                    .where(
                        eq(
                            conversationViewSnapshotTable.conversationId,
                            conversationId,
                        ),
                    ),
            ).toHaveLength(1);
        } finally {
            await buffer.shutdown();
        }
    });

    it.each(["no_survey", "optional_survey", "no_required_questions"])(
        "does not load or enumerate voters for %s",
        async (mode) => {
            if (mode !== "no_survey") {
                const { survey, question } = await requiredSurvey();
                if (mode === "optional_survey")
                    await db
                        .update(surveyConfigTable)
                        .set({ isOptional: true })
                        .where(eq(surveyConfigTable.id, survey.id));
                else
                    await db
                        .update(surveyQuestionTable)
                        .set({ isRequired: false })
                        .where(eq(surveyQuestionTable.id, question.id));
            }
            const candidates = vi
                .fn<() => Promise<readonly string[]>>()
                .mockResolvedValue([voterId]);
            expect(
                await getEligibleParticipantIdsForAnalysis({
                    db,
                    conversationId,
                    candidateParticipantIds: candidates,
                }),
            ).toBeUndefined();
            expect(candidates).not.toHaveBeenCalled();
        },
    );

    it("keeps excluded survey votes out of live statement breakdowns as eligibility changes", async () => {
        const { opinion, content } = await statement(true);
        await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: authorId,
        });
        await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: editorId,
            option: "pass",
        });
        await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: voterId,
            option: "pass",
        });
        // Deliberately retain the raw counters that used to leak into live events.
        await db
            .update(opinionTable)
            .set({ numAgrees: 1, numPasses: 2 })
            .where(eq(opinionTable.id, opinion.id));
        const { survey, question } = await requiredSurvey();
        const response = first(
            await db
                .insert(surveyResponseTable)
                .values({ participantId: authorId, conversationId })
                .returning(),
        );
        await db.insert(surveyAnswerTable).values({
            surveyResponseId: response.id,
            conversationId,
            surveyQuestionId: question.id,
            answeredQuestionSemanticVersion: 1,
            textValueHtml: "Complete",
            textValuePlainText: "Complete",
        });
        const emit = async () => {
            await queueOpinionVoteCountsUpdatedEvent({
                db,
                conversationSlugId: "editconv",
                opinionIds: [opinion.id],
            });
            return first(
                await db
                    .select()
                    .from(realtimeEventOutboxTable)
                    .orderBy(desc(realtimeEventOutboxTable.id)),
            );
        };
        expect(await emit()).toMatchObject({
            payload: {
                opinionVoteCounts: [
                    {
                        opinionSlugId: opinion.slugId,
                        numParticipants: 1,
                        numAgrees: 1,
                        numDisagrees: 0,
                        numPasses: 0,
                    },
                ],
            },
        });
        await db
            .update(surveyQuestionTable)
            .set({ currentSemanticVersion: 2 })
            .where(eq(surveyQuestionTable.id, question.id));
        expect(await emit()).toMatchObject({
            payload: {
                opinionVoteCounts: [
                    { numParticipants: 0, numAgrees: 0, numPasses: 0 },
                ],
            },
        });
        expect(
            (
                await getOpinionManagementCapabilities({
                    db,
                    userId: editorId,
                    opinionSlugIds: [opinion.slugId],
                })
            ).get(opinion.slugId)?.editing,
        ).toEqual({ allowed: true });
        expect(
            (
                await fetchConversationSeedOpinions({
                    db,
                    conversationId,
                    conversationType: "polis",
                })
            ).at(0)?.editing,
        ).toEqual({ allowed: true });
        const votesBeforeEdit = await db.select().from(voteTable);
        const voteContentsBeforeEdit = await db.select().from(voteContentTable);
        expect(
            (
                await save({
                    slugId: opinion.slugId,
                    sourceVersion: content.publicId,
                    userId: editorId,
                })
            ).success,
        ).toBe(true);
        expect(await db.select().from(voteTable)).toEqual(votesBeforeEdit);
        expect(await db.select().from(voteContentTable)).toEqual(
            voteContentsBeforeEdit,
        );
        await db
            .update(surveyQuestionTable)
            .set({ currentSemanticVersion: 1 })
            .where(eq(surveyQuestionTable.id, question.id));
        await db
            .update(surveyResponseTable)
            .set({ withdrawnAt: new Date() })
            .where(eq(surveyResponseTable.id, response.id));
        expect(await emit()).toMatchObject({
            payload: {
                opinionVoteCounts: [
                    { numParticipants: 0, numAgrees: 0, numPasses: 0 },
                ],
            },
        });
        await db
            .update(surveyConfigTable)
            .set({ isOptional: true })
            .where(eq(surveyConfigTable.id, survey.id));
        expect(await emit()).toMatchObject({
            payload: {
                opinionVoteCounts: [
                    { numParticipants: 3, numAgrees: 1, numPasses: 2 },
                ],
            },
        });
    });

    it("does not attach another conversation's statement counts to a vote event", async () => {
        const { opinion } = await statement(true);
        await queueOpinionVoteCountsUpdatedEvent({
            db,
            conversationSlugId: "unrelated",
            opinionIds: [opinion.id],
        });
        expect(await db.select().from(realtimeEventOutboxTable)).toHaveLength(
            0,
        );
    });

    it("scopes batched snapshot events to each conversation, including repeated snapshots", async () => {
        const original = first(await db.select().from(conversationTable));
        const config = first(
            await db
                .insert(polisConversationConfigTable)
                .values({})
                .returning(),
        );
        const otherConversation = first(
            await db
                .insert(conversationTable)
                .values({
                    slugId: "othercnv",
                    projectId: original.projectId,
                    polisConfigId: config.id,
                })
                .returning(),
        );
        const otherContent = first(
            await db
                .insert(conversationContentTable)
                .values({
                    conversationId: otherConversation.id,
                    title: "Other conversation",
                })
                .returning(),
        );
        await db
            .update(conversationTable)
            .set({ currentContentId: otherContent.id })
            .where(eq(conversationTable.id, otherConversation.id));
        const own = await statement(true);
        const other = await statementForConversation({
            isSeed: true,
            conversationId: otherConversation.id,
            conversationContentId: otherContent.id,
        });
        await vote({
            opinionId: own.opinion.id,
            contentId: own.content.id,
            userId: voterId,
        });
        await vote({
            opinionId: other.opinion.id,
            contentId: other.content.id,
            userId: voterId,
            option: "pass",
        });
        const { id: originalSnapshotId, ...snapshot } = first(
            await db
                .select()
                .from(conversationViewSnapshotTable)
                .where(
                    eq(
                        conversationViewSnapshotTable.conversationId,
                        conversationId,
                    ),
                ),
        );
        const inserted = await db
            .insert(conversationViewSnapshotTable)
            .values([
                snapshot,
                {
                    ...snapshot,
                    conversationId: otherConversation.id,
                    conversationContentId: otherContent.id,
                },
            ])
            .returning({ id: conversationViewSnapshotTable.id });
        await queueConversationCommentStatsUpdatedEventsForViewSnapshots({
            db,
            conversationViewSnapshotIds: [
                originalSnapshotId,
                ...inserted.map((row) => row.id),
            ],
            changedOpinionIds: [own.opinion.id, other.opinion.id],
        });
        const events = await db.select().from(realtimeEventOutboxTable);
        expect(events).toHaveLength(3);
        for (const event of events) {
            const payload =
                zodSSEEventDataByType.conversation_comment_stats_updated.parse(
                    event.payload,
                );
            expect(payload.opinionVoteCounts).toEqual([
                payload.conversationSlugId === "editconv"
                    ? {
                          opinionSlugId: own.opinion.slugId,
                          numParticipants: 1,
                          numAgrees: 1,
                          numDisagrees: 0,
                          numPasses: 0,
                      }
                    : {
                          opinionSlugId: other.opinion.slugId,
                          numParticipants: 1,
                          numAgrees: 0,
                          numDisagrees: 0,
                          numPasses: 1,
                      },
            ]);
        }
    });

    it("keeps a seed locked when its only voter deleted their account, preserving the original vote", async () => {
        const { opinion, content } = await statement(true);
        await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: voterId,
        });
        await db
            .update(userTable)
            .set({ isDeleted: true })
            .where(eq(userTable.id, voterId));
        expect(
            (
                await getOpinionManagementCapabilities({
                    db,
                    userId: editorId,
                    opinionSlugIds: [opinion.slugId],
                })
            ).get(opinion.slugId)?.editing,
        ).toEqual({ allowed: false, reason: "has_votes" });
        expect(
            (
                await fetchConversationSeedOpinions({
                    db,
                    conversationId,
                    conversationType: "polis",
                })
            ).at(0)?.editing,
        ).toEqual({ allowed: false, reason: "has_votes" });
        const votesBeforeEdit = await db.select().from(voteTable);
        expect(
            await save({
                slugId: opinion.slugId,
                sourceVersion: content.publicId,
                userId: editorId,
            }),
        ).toEqual({ success: false, reason: "has_votes" });
        expect(await db.select().from(voteTable)).toEqual(votesBeforeEdit);
        expect(
            first(await db.select().from(voteContentTable)).opinionContentId,
        ).toBe(content.id);
    });

    it("uses the same eligibility for buffered votes, including surveys and deleted accounts", async () => {
        const { opinion, content } = await statement(true);
        const buffer = createVoteBuffer({
            db,
            valkeyRef: { current: sharedValkey },
            flushIntervalMs: 60_000,
            valkeyBatchLimit: 100,
        });
        try {
            await buffer.add({
                vote: {
                    userId: voterId,
                    opinionId: opinion.id,
                    opinionContentId: content.id,
                    conversationId,
                    vote: "agree",
                    timestamp: new Date(),
                },
            });
            expect(
                await buffer.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: true,
                }),
            ).toBe(true);
            const { survey } = await requiredSurvey();
            expect(
                await buffer.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: true,
                }),
            ).toBe(false);
            await db
                .update(surveyConfigTable)
                .set({ isOptional: true })
                .where(eq(surveyConfigTable.id, survey.id));
            expect(
                await buffer.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: true,
                }),
            ).toBe(true);
            await db
                .update(userTable)
                .set({ isDeleted: true })
                .where(eq(userTable.id, voterId));
            expect(
                await buffer.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: true,
                }),
            ).toBe(true);
        } finally {
            await buffer.shutdown();
        }
    });

    it("advances analysis generations without waiting for worker execution locks", async () => {
        const spec = first(
            await db
                .insert(opinionGroupSpecTable)
                .values({
                    analysisSpecId: 1,
                    key: randomUUID(),
                    version: 1,
                    reducer: "pca",
                    clusterer: "kmeans",
                    selectionPolicy: "silhouette_size_balance",
                    minClusterableParticipants: 2,
                    minVotesPerParticipant: 1,
                    maxGroupCount: 3,
                })
                .returning(),
        );
        const logger = { info: vi.fn(), error: vi.fn() };
        const initial = await scheduleAnalysisUpdate({
            db,
            conversationId,
            log: logger,
        });
        let release: () => void = () => undefined;
        let locked: () => void = () => undefined;
        const released = new Promise<void>((resolve) => {
            release = resolve;
        });
        const acquired = new Promise<void>((resolve) => {
            locked = resolve;
        });
        const blocker = db.transaction(async (tx) => {
            await tx
                .select()
                .from(analysisWorkStateTable)
                .where(
                    and(
                        eq(
                            analysisWorkStateTable.conversationId,
                            conversationId,
                        ),
                        eq(analysisWorkStateTable.opinionGroupSpecId, spec.id),
                    ),
                )
                .for("update");
            locked();
            await released;
        });
        await acquired;
        try {
            const scheduled = await db.transaction(async (tx) => {
                await tx.execute(sql`SET LOCAL lock_timeout = '500ms'`);
                return await scheduleAnalysisUpdate({
                    db: tx,
                    conversationId,
                    log: logger,
                });
            });
            expect(scheduled.dataGeneration).toBe(initial.dataGeneration + 1);
        } finally {
            release();
            await blocker;
        }
    });
    async function vote({
        opinionId,
        contentId,
        userId,
        option = "agree",
    }: {
        opinionId: number;
        contentId: number;
        userId: string;
        option?: "agree" | "disagree" | "pass";
    }) {
        const row = first(
            await db
                .insert(voteTable)
                .values({ opinionId, authorId: userId })
                .returning(),
        );
        const content = first(
            await db
                .insert(voteContentTable)
                .values({
                    voteId: row.id,
                    opinionContentId: contentId,
                    vote: option,
                })
                .returning(),
        );
        await db
            .update(voteTable)
            .set({ currentContentId: content.id })
            .where(eq(voteTable.id, row.id));
        return row;
    }
    async function save({
        slugId,
        sourceVersion,
        userId = authorId,
        body = "<p>Updated statement</p>",
    }: {
        slugId: string;
        sourceVersion: string;
        userId?: string;
        body?: string;
    }) {
        return await editOpinion({
            db,
            request: {
                opinionSlugId: slugId,
                sourceVersion,
                opinionBody: body,
            },
            userId,
            voteBuffer,
            googleCloudCredentials: undefined,
            valkey: undefined,
            translationQueueScript,
            displayLanguage: "en",
            spokenLanguages: ["en"],
        });
    }

    it("preserves the published version, checkpoint reference, author, and self-vote", async () => {
        const { opinion, content } = await statement();
        const selfVote = await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: authorId,
        });
        await db.insert(analysisSnapshotOpinionTable).values({
            analysisSnapshotId: 1,
            opinionId: opinion.id,
            opinionContentId: content.id,
            localOpinionIndex: 0,
        });
        const result = await save({
            slugId: opinion.slugId,
            sourceVersion: content.publicId,
        });
        expect(result).toMatchObject({
            success: true,
            displayedOpinionItem: {
                isEdited: true,
                username: "statement-author",
            },
        });
        const current = first(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.id, opinion.id)),
        );
        expect(current.currentContentId).not.toBe(content.id);
        expect(current.authorId).toBe(authorId);
        expect(current.createdAt).toEqual(opinion.createdAt);
        const historical = first(
            await db
                .select({
                    wording: opinionContentTable.content,
                    isEdited: opinionContentTable.isEdited,
                })
                .from(analysisSnapshotOpinionTable)
                .innerJoin(
                    opinionContentTable,
                    eq(
                        opinionContentTable.id,
                        analysisSnapshotOpinionTable.opinionContentId,
                    ),
                ),
        );
        expect(historical).toEqual({
            wording: "<p>Original statement</p>",
            isEdited: false,
        });
        expect(
            first(
                await db
                    .select()
                    .from(voteTable)
                    .where(eq(voteTable.id, selfVote.id)),
            ).currentContentId,
        ).not.toBeNull();
        expect(
            first(await db.select({ count: count() }).from(voteContentTable))
                .count,
        ).toBe(1);
    });

    it.each(["agree", "disagree", "pass"] satisfies readonly (
        | "agree"
        | "disagree"
        | "pass"
    )[])("blocks another user's %s until it is cancelled", async (option) => {
        const { opinion, content } = await statement();
        const outsideVote = await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: voterId,
            option,
        });
        expect(
            await save({
                slugId: opinion.slugId,
                sourceVersion: content.publicId,
            }),
        ).toEqual({ success: false, reason: "has_votes" });
        await db
            .update(voteTable)
            .set({ currentContentId: null })
            .where(eq(voteTable.id, outsideVote.id));
        expect(
            (
                await save({
                    slugId: opinion.slugId,
                    sourceVersion: content.publicId,
                })
            ).success,
        ).toBe(true);
        expect(
            first(await db.select({ count: count() }).from(voteContentTable))
                .count,
        ).toBe(1);
    });

    it("allows a collaborator to edit a seed but not another user's regular statement", async () => {
        const seed = await statement(true);
        expect(
            (
                await save({
                    slugId: seed.opinion.slugId,
                    sourceVersion: seed.content.publicId,
                    userId: editorId,
                })
            ).success,
        ).toBe(true);
        const revision = first(
            await db
                .select()
                .from(opinionContentTable)
                .where(
                    and(
                        eq(opinionContentTable.opinionId, seed.opinion.id),
                        eq(opinionContentTable.isEdited, true),
                    ),
                ),
        );
        expect(revision.editedByUserId).toBe(editorId);
        const regular = await statement();
        expect(
            await save({
                slugId: regular.opinion.slugId,
                sourceVersion: regular.content.publicId,
                userId: editorId,
            }),
        ).toEqual({ success: false, reason: "not_allowed" });
    });

    it("blocks seed edits for any vote, including the creator's vote", async () => {
        const { opinion, content } = await statement(true);
        await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: authorId,
        });
        expect(
            await save({
                slugId: opinion.slugId,
                sourceVersion: content.publicId,
                userId: editorId,
            }),
        ).toEqual({ success: false, reason: "has_votes" });
    });

    it("refuses pending votes, unchanged versions, and concurrent overwrites correctly", async () => {
        const { opinion, content } = await statement();
        expect(
            (
                await save({
                    slugId: opinion.slugId,
                    sourceVersion: content.publicId,
                    body: content.content,
                })
            ).success,
        ).toBe(true);
        expect(
            first(await db.select({ count: count() }).from(opinionContentTable))
                .count,
        ).toBe(1);
        blockingVotes.mockResolvedValue(true);
        expect(
            await save({
                slugId: opinion.slugId,
                sourceVersion: content.publicId,
            }),
        ).toEqual({ success: false, reason: "has_votes" });
        blockingVotes.mockResolvedValue(false);
        const results = await Promise.all([
            save({ slugId: opinion.slugId, sourceVersion: content.publicId }),
            save({
                slugId: opinion.slugId,
                sourceVersion: content.publicId,
                body: "<p>Another update</p>",
            }),
        ]);
        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(results.find((result) => !result.success)).toEqual({
            success: false,
            reason: "version_conflict",
        });
    });

    it("lets conversation editors delete voted seeds and decrements the creator's count", async () => {
        const { opinion, content } = await statement(true);
        await vote({
            opinionId: opinion.id,
            contentId: content.id,
            userId: voterId,
        });
        expect(
            (
                await getOpinionManagementCapabilities({
                    db,
                    opinionSlugIds: [opinion.slugId],
                    userId: editorId,
                })
            ).get(opinion.slugId),
        ).toEqual({
            editing: { allowed: false, reason: "has_votes" },
            canDelete: true,
        });
        await deleteOpinionBySlugId({
            db,
            opinionSlugId: opinion.slugId,
            userId: editorId,
        });
        expect(
            first(
                await db
                    .select()
                    .from(opinionTable)
                    .where(eq(opinionTable.id, opinion.id)),
            ).currentContentId,
        ).toBeNull();
        expect(
            first(
                await db
                    .select()
                    .from(userTable)
                    .where(eq(userTable.id, authorId)),
            ).totalOpinionCount,
        ).toBe(0);
        expect(
            first(
                await db
                    .select()
                    .from(userTable)
                    .where(eq(userTable.id, editorId)),
            ).totalOpinionCount,
        ).toBe(7);
        expect(
            first(await db.select({ count: count() }).from(opinionContentTable))
                .count,
        ).toBe(1);
    });

    it("rejects pending buffered votes before starting the content transaction", async () => {
        const { opinion, content } = await statement();
        blockingVotes.mockResolvedValueOnce(true);
        expect(
            await save({
                slugId: opinion.slugId,
                sourceVersion: content.publicId,
            }),
        ).toEqual({ success: false, reason: "has_votes" });
        expect(
            first(
                await db
                    .select()
                    .from(opinionTable)
                    .where(eq(opinionTable.id, opinion.id)),
            ).currentContentId,
        ).toBe(content.id);
        expect(
            first(
                await db
                    .select({ count: count() })
                    .from(opinionContentTable)
                    .where(eq(opinionContentTable.opinionId, opinion.id)),
            ).count,
        ).toBe(1);
    });

    it("does not authorize seed deletion just because the user is its original author", async () => {
        const { opinion } = await statement(true);
        await expect(
            deleteOpinionBySlugId({
                db,
                opinionSlugId: opinion.slugId,
                userId: authorId,
            }),
        ).rejects.toThrow("Missing statement deletion permission");
    });

    it("does not hold statement locks while a language provider is running", async () => {
        const { opinion, content } = await statement();
        let releaseDetection: (() => void) | undefined;
        const entered = new Promise<void>((resolveEntered) => {
            vi.mocked(resolveContentLanguageMetadata).mockImplementationOnce(
                () =>
                    new Promise((resolveDetection) => {
                        releaseDetection = () => {
                            resolveDetection(UNKNOWN_CONTENT_LANGUAGE_METADATA);
                        };
                        resolveEntered();
                    }),
            );
        });
        const saving = save({
            slugId: opinion.slugId,
            sourceVersion: content.publicId,
        });
        await entered;
        try {
            const acquired = await Promise.race([
                db.transaction(async (tx) => {
                    await tx
                        .select({ id: opinionTable.id })
                        .from(opinionTable)
                        .where(eq(opinionTable.id, opinion.id))
                        .for("update");
                    return true;
                }),
                new Promise<boolean>((resolve) => {
                    setTimeout(() => {
                        resolve(false);
                    }, 1000);
                }),
            ]);
            expect(acquired).toBe(true);
        } finally {
            releaseDetection?.();
        }
        expect((await saving).success).toBe(true);
    });

    it("schedules translations only for the edited seed version", async () => {
        const seed = await statement(true);
        const unrelated = await statement(true);
        expect(
            (
                await save({
                    slugId: seed.opinion.slugId,
                    sourceVersion: seed.content.publicId,
                    userId: editorId,
                })
            ).success,
        ).toBe(true);
        expect(
            createEagerContentTranslationWorkForOpinion,
        ).toHaveBeenCalledTimes(1);
        const translationCall = vi
            .mocked(createEagerContentTranslationWorkForOpinion)
            .mock.calls.at(0);
        expect(translationCall?.[0].source.opinionSlugId).toBe(
            seed.opinion.slugId,
        );
        expect(
            first(
                await db
                    .select()
                    .from(opinionTable)
                    .where(eq(opinionTable.id, unrelated.opinion.id)),
            ).currentContentId,
        ).toBe(unrelated.content.id);
    });

    it("checks shared pending votes across instances and ignores current cancellations", async () => {
        const { opinion, content } = await statement();
        const cacheContainer = await new GenericContainer(
            "valkey/valkey:8-alpine",
        )
            .withExposedPorts(6379)
            .start();
        const valkey = await GlideClient.createClient({
            addresses: [
                {
                    host: cacheContainer.getHost(),
                    port: cacheContainer.getMappedPort(6379),
                },
            ],
            defaultDecoder: Decoder.String,
        });
        const sender = createVoteBuffer({
            db,
            valkeyRef: { current: valkey },
            flushIntervalMs: 60_000,
            valkeyBatchLimit: 100,
        });
        const receiver = createVoteBuffer({
            db,
            valkeyRef: { current: valkey },
            flushIntervalMs: 60_000,
            valkeyBatchLimit: 100,
        });
        const baseVote = {
            opinionId: opinion.id,
            opinionContentId: content.id,
            conversationId,
            timestamp: new Date(),
        };
        try {
            await sender.add({
                vote: { ...baseVote, userId: authorId, vote: "agree" },
            });
            expect(
                await receiver.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: false,
                }),
            ).toBe(false);
            expect(
                await receiver.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: true,
                }),
            ).toBe(true);
            await sender.add({
                vote: { ...baseVote, userId: voterId, vote: "pass" },
            });
            await receiver.add({
                vote: { ...baseVote, userId: voterId, vote: "pass" },
            });
            expect(
                await receiver.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: false,
                }),
            ).toBe(true);
            const epoch = first(
                await db
                    .select({ epoch: conversationTable.voteBufferEpoch })
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversationId)),
            ).epoch;
            const member = `${voterId}:${epoch}:${String(opinion.id)}`;
            const previousPayload = await valkey.hget(
                VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                member,
            );
            if (previousPayload === null)
                throw new Error("Missing queued vote");
            await sender.add({
                vote: {
                    ...baseVote,
                    userId: voterId,
                    vote: "cancel",
                },
            });
            expect(
                await receiver.hasBlockingVotes({
                    db,
                    opinionId: opinion.id,
                    authorId,
                    isSeed: false,
                }),
            ).toBe(false);
            const cleanup = new Script(CLEANUP_VOTES_SCRIPT);
            try {
                expect(
                    await valkey.invokeScript(cleanup, {
                        keys: [
                            VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                            VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                            `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:opinion:`,
                            `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:conversation:`,
                        ],
                        args: [member, String(previousPayload)],
                    }),
                ).toBe(0);
                expect(
                    await valkey.hget(
                        VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                        member,
                    ),
                ).not.toBeNull();
            } finally {
                cleanup.release();
            }
            await sender.flush();
            await receiver.flush();
            expect(
                first(
                    await db
                        .select()
                        .from(voteTable)
                        .where(
                            and(
                                eq(voteTable.opinionId, opinion.id),
                                eq(voteTable.authorId, voterId),
                            ),
                        ),
                ).currentContentId,
            ).toBeNull();

            // Hold a captured batch before its transaction, then commit a newer
            // cancellation on the other instance before the old batch resumes.
            await sender.add({
                vote: { ...baseVote, userId: voterId, vote: "pass" },
            });
            let resume: (() => void) | undefined;
            let entered: (() => void) | undefined;
            const paused = new Promise<void>((resolve) => {
                resume = resolve;
            });
            const captured = new Promise<void>((resolve) => {
                entered = resolve;
            });
            const transaction = db.transaction.bind(db);
            const transactionSpy = vi
                .spyOn(db, "transaction")
                .mockImplementationOnce(async (callback, config) => {
                    entered?.();
                    await paused;
                    return await transaction(callback, config);
                });
            const flushing = receiver.flush();
            await captured;
            try {
                await sender.add({
                    vote: { ...baseVote, userId: voterId, vote: "cancel" },
                });
                await sender.flush();
            } finally {
                resume?.();
                await flushing;
                transactionSpy.mockRestore();
            }
            expect(
                first(
                    await db
                        .select()
                        .from(voteTable)
                        .where(
                            and(
                                eq(voteTable.opinionId, opinion.id),
                                eq(voteTable.authorId, voterId),
                            ),
                        ),
                ).currentContentId,
            ).toBeNull();
            expect(
                first(
                    await db
                        .select()
                        .from(opinionTable)
                        .where(eq(opinionTable.id, opinion.id)),
                ).numPasses,
            ).toBe(0);
        } finally {
            await sender.shutdown();
            await receiver.shutdown();
            valkey.close();
            await cacheContainer.stop();
        }
    }, 120_000);

    it("retains writer serialization and newer payloads during a stalled Valkey recheck", async () => {
        const { opinion, content } = await statement();
        await assertVoteReadSerialization({
            db,
            opinionId: opinion.id,
            opinionContentId: content.id,
            conversationId,
            authorId,
            createBuffer: createVoteBuffer,
        });
    }, 120_000);

    it("recovers from a real Valkey pause through the native client timeout", async () => {
        const { opinion, content } = await statement();
        await assertNativeValkeyTimeoutRecovery({
            db,
            opinionId: opinion.id,
            opinionContentId: content.id,
            conversationId,
            authorId,
            createBuffer: createVoteBuffer,
        });
    }, 120_000);

    it("shows idle-in-transaction ClientRead while awaiting the Valkey recheck", async () => {
        const { opinion, content } = await statement();
        await assertValkeyStallSessionState({
            db,
            opinionId: opinion.id,
            opinionContentId: content.id,
            conversationId,
            authorId,
            createBuffer: createVoteBuffer,
        });
    }, 120_000);

    it("recovers vote persistence and cancellation after a real PostgreSQL connection reset", async () => {
        if (container === undefined) throw new Error("Missing test database");
        const { opinion, content } = await statement();
        await assertPostgresVoteFlushRecovery({
            db,
            host: container.getHost(),
            port: container.getMappedPort(5432),
            opinionId: opinion.id,
            opinionContentId: content.id,
            conversationId,
            authorId,
            createBuffer: createVoteBuffer,
        });
    }, 120_000);
});
