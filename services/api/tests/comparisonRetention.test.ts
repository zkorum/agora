import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pushSchema } from "drizzle-kit/api-postgres";
import { and, count, eq, getTableName, is, sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { PgTable, withReplicas } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../src/shared-backend/schema.js";
import { retireComparisonAccountInputs } from "../src/shared-backend/comparisonAccountLifecycle.js";
import { findAccountParticipationSource } from "../src/shared-backend/accountParticipationSources.js";
import { unlinkAccountRetainedContributions } from "../src/shared-backend/deletionIdentity.js";
import { finalizeCurrentRankingConversation } from "../src/service/conversationFinalization.js";
import {
    fetchRankingStatsCheckpoints,
    getComparisonResults,
} from "../src/service/comparison.js";
import { setClosedAnalysisInputMode } from "../src/service/closedAnalysisSelection.js";
import {
    moderateComparisonItem,
    readComparisonModerationHistory,
} from "../src/service/comparisonModeration.js";
import {
    getClosedVoteWithdrawalStatus,
    withdrawClosedVotes,
} from "../src/service/closedVoteWithdrawal.js";
import { resolveRetainedComparisonBaseline } from "../src/shared-backend/comparisonRetention.js";
import type { RankingItemDisplayPreferences } from "../src/service/rankingItemDisplay.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined)
        throw new Error("Missing comparison retention fixture");
    return row;
}

describe("result-owned comparison evidence and account-source retirement", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "comparison_retention",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "comparison_retention",
        };
        client = postgres({ ...connection, onnotice: () => undefined });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (
                await pushSchema(schema, drizzlePg({ client: pool }))
            ).apply();
        } finally {
            await pool.end();
        }
        for (const migration of [
            "../database/flyway/V0115.10__prepare_comparison_retention.sql",
            "../database/flyway/V0116.1__retain_reused_comparison_inputs.sql",
            "../database/flyway/V0116.2__certify_comparison_input_baselines.sql",
            "../database/flyway/V0116.4__bind_polis_analysis_closes.sql",
        ]) {
            await db.transaction(async (tx) => {
                await tx.execute(
                    sql.raw(
                        await readFile(
                            new URL(migration, import.meta.url),
                            "utf8",
                        ),
                    ),
                );
            });
        }
    }, 120_000);
    beforeEach(async () => {
        const tables = Object.values(schema)
            .filter((value) => is(value, PgTable))
            .map((table) => `"${getTableName(table)}"`);
        if (client === undefined) throw new Error("Missing test database");
        // TRUNCATE resets only this fresh disposable schema, not application data.
        await client.unsafe(
            `TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
        );
    });
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function seed({
        method,
        withBaseline = true,
    }: {
        method: "bws" | "pairwise";
        withBaseline?: boolean;
    }) {
        const userId = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: "voter" });
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: "retention",
                    title: "Retention",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const config = first(
            await db
                .insert(schema.rankingConversationConfigTable)
                .values({ rankingMode: method })
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "retain01",
                    projectId: project.id,
                    rankingConfigId: config.id,
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({ conversationId: conversation.id, title: "Retention" })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        const slugs =
            method === "bws"
                ? ["retain01", "retain02", "retain03", "retain04"]
                : ["retain01", "retain02"];
        const best = first(slugs);
        const worst = first(slugs.slice(-1));
        const history = [{ best, worst, set: slugs }];
        const response = first(
            await db
                .insert(schema.comparisonResponseTable)
                .values({
                    participantId: userId,
                    conversationId: conversation.id,
                    comparisons: history,
                    ranking: slugs,
                    isComplete: true,
                })
                .returning(),
        );
        await db.insert(schema.comparisonAnswerTable).values({
            comparisonResponseId: response.id,
            position: 0,
            bestSlugId: best,
            worstSlugId: worst,
            candidateSet: slugs,
        });
        await db.insert(schema.comparisonUserEntityScoreTable).values({
            comparisonResponseId: response.id,
            entitySlugId: best,
            score: 1,
            displayScore: 0.7,
            uncertaintyLeft: 0.1,
            uncertaintyRight: 0.1,
        });
        const participant = first(
            await db
                .insert(schema.conversationParticipantTable)
                .values({ userId, conversationId: conversation.id })
                .returning(),
        );
        const score = first(
            await db
                .insert(schema.rankingScoreTable)
                .values({
                    conversationId: conversation.id,
                    scores: [{ entityId: best, score: 1 }],
                    participantCounts: { [best]: 1 },
                    pipelineConfig: {},
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db
            .update(schema.rankingConversationConfigTable)
            .set({ currentRankingScoreId: score.id })
            .where(eq(schema.rankingConversationConfigTable.id, config.id));
        const snapshot = first(
            await db
                .insert(schema.rankingConversationStatsSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    rankingScoreId: score.id,
                    itemCount: slugs.length,
                    totalItemCount: slugs.length,
                    voteCount: 1,
                    totalVoteCount: 1,
                    participantCount: 1,
                    totalParticipantCount: 1,
                    scoringInputRevision: 0,
                    isClosed: true,
                })
                .returning(),
        );
        await db.insert(schema.rankingConversationStatsCheckpointTable).values({
            conversationId: conversation.id,
            statsSnapshotId: snapshot.id,
            reason: "conversation_closed",
        });
        const input = await db.transaction(async (tx) => {
            const draft = first(
                await tx
                    .insert(schema.rankingInputSnapshotTable)
                    .values({
                        conversationId: conversation.id,
                        comparisonMethod: method,
                        scoringInputRevision: 0,
                        algorithmVersion: 1,
                        solidagoVersion: "0.5.0",
                        pipelineConfig: {
                            preference_learning: "JointMaxDiffLearning",
                            choice_scale: 0.5,
                            trust: "equal",
                            trust_score: 1,
                        },
                        participantCount: 1,
                        itemCount: slugs.length,
                        answerCount: 1,
                    })
                    .returning(),
            );
            await tx
                .insert(schema.rankingInputParticipantTable)
                .values({ inputSnapshotId: draft.id, participantIndex: 0 });
            await tx
                .insert(schema.rankingInputParticipantEligibilityTable)
                .values({
                    inputSnapshotId: draft.id,
                    participantIndex: 0,
                    userId,
                });
            await tx.insert(schema.rankingInputItemTable).values(
                slugs.map((itemSlugId, position) => ({
                    inputSnapshotId: draft.id,
                    itemSlugId,
                    position,
                })),
            );
            await tx.insert(schema.rankingInputAnswerTable).values({
                inputSnapshotId: draft.id,
                participantIndex: 0,
                position: 0,
                bestSlugId: best,
                worstSlugId: worst,
                candidateSet: slugs,
                effectiveCandidateSet: slugs,
            });
            await tx
                .update(schema.rankingInputSnapshotTable)
                .set({ sealedAt: new Date() })
                .where(eq(schema.rankingInputSnapshotTable.id, draft.id));
            if (withBaseline)
                await tx.insert(schema.comparisonInputBaselineTable).values({
                    inputSnapshotId: draft.id,
                    baselineInputSnapshotId: draft.id,
                    conversationId: conversation.id,
                });
            return first(
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({ statsSnapshotId: snapshot.id })
                    .where(eq(schema.rankingInputSnapshotTable.id, draft.id))
                    .returning(),
            );
        });
        return {
            userId,
            configId: config.id,
            conversation,
            response,
            participant,
            score,
            snapshot,
            input,
            slugs,
        };
    }
    async function evidence() {
        return {
            roots: await db.select().from(schema.rankingInputSnapshotTable),
            baselines: await db
                .select()
                .from(schema.comparisonInputBaselineTable),
            participants: await db
                .select()
                .from(schema.rankingInputParticipantTable),
            items: await db.select().from(schema.rankingInputItemTable),
            answers: await db.select().from(schema.rankingInputAnswerTable),
            scores: await db.select().from(schema.rankingScoreTable),
            snapshots: await db
                .select()
                .from(schema.rankingConversationStatsSnapshotTable),
            checkpoints: await db
                .select()
                .from(schema.rankingConversationStatsCheckpointTable),
        };
    }

    async function prepareClose({
        conversationId,
        configId,
        revision = 1,
    }: {
        conversationId: number;
        configId: number;
        revision?: number;
    }) {
        await db
            .update(schema.rankingConversationConfigTable)
            .set({
                scoringInputRevision: revision,
                processedScoringInputRevision: revision - 1,
            })
            .where(eq(schema.rankingConversationConfigTable.id, configId));
        await db
            .update(schema.conversationTable)
            .set({
                isClosed: true,
                closingTargetRevision: revision,
                closedFinalizedAt: null,
            })
            .where(eq(schema.conversationTable.id, conversationId));
    }

    it("denies the checkpoint timeline when its project deletion has not reached the display replica", async () => {
        const { conversation } = await seed({ method: "pairwise" });
        await db.transaction(
            async (staleReader) => {
                const read = {
                    db: withReplicas(db, [staleReader]),
                    conversationSlugId: conversation.slugId,
                    requestedRankingStatsSnapshotId: undefined,
                };
                expect(
                    (await fetchRankingStatsCheckpoints(read)).length,
                ).toBeGreaterThan(0);
                await db
                    .update(schema.projectTable)
                    .set({ deletedAt: new Date() })
                    .where(eq(schema.projectTable.id, conversation.projectId));
                expect(
                    first(
                        await staleReader
                            .select({
                                deletedAt: schema.projectTable.deletedAt,
                            })
                            .from(schema.projectTable)
                            .where(
                                eq(
                                    schema.projectTable.id,
                                    conversation.projectId,
                                ),
                            ),
                    ).deletedAt,
                ).toBeNull();
                await expect(
                    fetchRankingStatsCheckpoints(read),
                ).rejects.toMatchObject({ statusCode: 404 });
            },
            { isolationLevel: "repeatable read", accessMode: "read only" },
        );
    });

    it.each(["bws", "pairwise"] as const)(
        "withdraws only the owner's %s inputs after finalization without touching retained evidence",
        async (method) => {
            const f = await seed({ method });
            const {
                id: conversationId,
                slugId: conversationSlugId,
                voteBufferEpoch,
            } = f.conversation;
            const now = new Date();
            const didWrite = "did:test:compare-withdrawal";
            await db.insert(schema.deviceTable).values({
                didWrite,
                userId: f.userId,
                userAgent: "Vitest",
                sessionExpiry: new Date(now.getTime() + 60_000),
            });
            const owner = { db, conversationSlugId, userId: f.userId };
            const action = {
                db,
                didWrite,
                userId: f.userId,
                now,
                request: {
                    conversationSlugId,
                    closeEpoch: voteBufferEpoch,
                    expectedViewerId: f.userId,
                },
            };
            await prepareClose({ conversationId, configId: f.configId });
            await expect(withdrawClosedVotes(action)).rejects.toMatchObject({
                statusCode: 409,
            });
            await expect(getClosedVoteWithdrawalStatus(owner)).resolves.toEqual(
                { available: false },
            );
            await expect(
                db.transaction(
                    async (tx) =>
                        await finalizeCurrentRankingConversation({
                            db: tx,
                            conversationId,
                        }),
                ),
            ).resolves.toBe(true);
            await expect(getClosedVoteWithdrawalStatus(owner)).resolves.toEqual(
                {
                    available: true,
                    closeEpoch: voteBufferEpoch,
                },
            );
            const before = await evidence();
            await expect(
                withdrawClosedVotes({
                    ...action,
                    request: {
                        ...action.request,
                        expectedViewerId: randomUUID(),
                    },
                }),
            ).rejects.toMatchObject({ statusCode: 409 });
            await expect(withdrawClosedVotes(action)).resolves.toEqual({
                success: true,
            });
            await expect(withdrawClosedVotes(action)).resolves.toEqual({
                success: true,
            });
            await expect(getClosedVoteWithdrawalStatus(owner)).resolves.toEqual(
                { available: false },
            );
            expect(await evidence()).toEqual(before);
            expect(
                await db.select().from(schema.comparisonAnswerTable),
            ).toMatchObject([{ deletedAt: expect.any(Date) }]);
            expect(
                await db.select().from(schema.comparisonResponseTable),
            ).toMatchObject([
                {
                    id: f.response.id,
                    participantId: f.userId,
                    comparisons: [],
                    ranking: null,
                },
            ]);
            expect(
                await db.select().from(schema.comparisonUserEntityScoreTable),
            ).toMatchObject([{ deletedAt: expect.any(Date) }]);
        },
    );

    it.each(["bws", "pairwise"] as const)(
        "reads the bound %s result while closed and the ordinary result after reopening",
        async (method) => {
            const f = await seed({ method });
            const conversationId = f.conversation.id;
            const parent = schema.conversationTable;
            const item = first(
                await db
                    .insert(schema.rankingItemTable)
                    .values({
                        conversationId,
                        slugId: first(f.slugs),
                        authorId: f.userId,
                    })
                    .returning(),
            );
            const content = first(
                await db
                    .select()
                    .from(schema.conversationContentTable)
                    .where(
                        eq(
                            schema.conversationContentTable.conversationId,
                            conversationId,
                        ),
                    ),
            );
            const itemContent = first(
                await db
                    .insert(schema.rankingItemContentTable)
                    .values({
                        rankingItemId: item.id,
                        conversationContentId: content.id,
                        title: "Retained item",
                    })
                    .returning(),
            );
            await db
                .update(schema.rankingItemTable)
                .set({ currentContentId: itemContent.id })
                .where(eq(schema.rankingItemTable.id, item.id));
            await db.insert(schema.rankingConversationStatsItemTable).values({
                statsSnapshotId: f.snapshot.id,
                conversationId,
                rankingItemId: item.id,
                rankingItemContentId: itemContent.id,
                lifecycleStatus: "active",
                score: 0.7,
                rank: 1,
                participantCount: 1,
            });
            await prepareClose({ conversationId, configId: f.configId });
            await expect(
                db.transaction(
                    async (tx) =>
                        await finalizeCurrentRankingConversation({
                            db: tx,
                            conversationId,
                        }),
                ),
            ).resolves.toBe(true);
            const binding = first(
                await db.select().from(schema.comparisonAnalysisCloseTable),
            );
            await db
                .update(schema.rankingItemTable)
                .set({ lifecycleStatus: "canceled" })
                .where(eq(schema.rankingItemTable.id, item.id));
            const displayPreferences = {
                displayLanguage: "en",
                targetLanguage: "en",
                spokenLanguages: ["en"],
                translationAllowed: false,
            } satisfies RankingItemDisplayPreferences;
            const read = {
                db,
                conversationSlugId: f.conversation.slugId,
                displayPreferences,
            };
            const checkpoint = {
                ...read,
                rankingStatsSnapshotId: binding.originalStatsSnapshotId,
            };
            const closing = await getComparisonResults(read);
            expect(closing.closedAnalysisSelection).toMatchObject({
                status: "ready",
                servedInputMode: "closing",
            });
            const historical = { rankings: closing.rankings };
            expect(closing.rankings).toMatchObject([
                {
                    itemSlugId: item.slugId,
                    lifecycleStatus: "active",
                    avgRank: 1,
                },
            ]);
            await expect(getComparisonResults(checkpoint)).resolves.toEqual(
                historical,
            );
            const close = first(
                await db.select().from(schema.conversationAnalysisCloseTable),
            );
            const organization = first(
                await db
                    .insert(schema.organizationTable)
                    .values({
                        slug: randomUUID().slice(0, 8),
                        displayName: "Comparison facilitators",
                        defaultLanguageCode: "en",
                        isFullImagePath: false,
                        directoryVisibility: "unlisted",
                    })
                    .returning(),
            );
            await db.insert(schema.organizationMembershipTable).values({
                role: "manager",
                organizationId: organization.id,
                userId: f.userId,
            });
            await db.insert(schema.projectOrganizationOwnershipTable).values({
                projectId: f.conversation.projectId,
                organizationId: organization.id,
            });
            const moderationRequest = {
                conversationSlugId: read.conversationSlugId,
                itemSlugId: item.slugId,
                reason: "Off topic",
            };
            const moderate = (action: "move" | "hide" | "restore") =>
                moderateComparisonItem({
                    db,
                    userId: f.userId,
                    request: { ...moderationRequest, action },
                    valkey: undefined,
                });
            const history = (userId?: string) =>
                readComparisonModerationHistory({
                    db,
                    userId,
                    request: { conversationSlugId: read.conversationSlugId },
                });
            await expect(moderate("hide")).rejects.toMatchObject({
                statusCode: 403,
            });
            await moderate("move");
            expect((await history()).items).toMatchObject([
                { action: "move", title: "Retained item" },
            ]);
            await expect(
                getComparisonResults(checkpoint),
            ).resolves.toMatchObject({
                rankings: [{ displayContent: null, avgRank: 1 }],
            });
            await db
                .update(schema.userTable)
                .set({ isSiteModerator: true })
                .where(eq(schema.userTable.id, f.userId));
            await moderate("hide");
            expect((await history()).items).toEqual([]);
            expect((await history(f.userId)).items).toMatchObject([
                { action: "hide" },
            ]);
            await db
                .update(schema.userTable)
                .set({ isSiteModerator: false })
                .where(eq(schema.userTable.id, f.userId));
            await expect(moderate("restore")).rejects.toMatchObject({
                statusCode: 404,
            });
            await db
                .update(schema.userTable)
                .set({ isSiteModerator: true })
                .where(eq(schema.userTable.id, f.userId));
            await moderate("restore");
            await expect(getComparisonResults(checkpoint)).resolves.toEqual(
                historical,
            );
            // The worker has now accepted the restored projection.
            const [restored] = await db
                .select()
                .from(schema.conversationAnalysisCloseTable);
            await db
                .update(schema.comparisonAnalysisCloseTable)
                .set({
                    processedClosingRevision:
                        restored.minimumClosingResultRevision,
                })
                .where(
                    eq(schema.comparisonAnalysisCloseTable.closeId, close.id),
                );
            const liveRevision = restored.minimumClosingResultRevision + 1;
            const ranking = schema.rankingConversationConfigTable;
            await db
                .update(ranking)
                .set({ scoringInputRevision: liveRevision })
                .where(eq(ranking.id, f.configId));
            const selectMode = {
                db,
                userId: f.userId,
                request: {
                    conversationSlugId: f.conversation.slugId,
                    closeId: close.id,
                    selectionRevision: 0,
                    inputMode: "live" as const,
                },
            };
            const selected = await setClosedAnalysisInputMode(selectMode);
            await expect(
                setClosedAnalysisInputMode(selectMode),
            ).resolves.toEqual(selected);
            await expect(getComparisonResults(read)).resolves.toMatchObject({
                ...historical,
                closedAnalysisSelection: {
                    status: "pending",
                    requestedInputMode: "live",
                    servedInputMode: "closing",
                },
            });
            const live = first(
                await db
                    .insert(schema.rankingConversationStatsSnapshotTable)
                    .values({
                        conversationId,
                        itemCount: 0,
                        totalItemCount: 1,
                        voteCount: 0,
                        totalVoteCount: 0,
                        participantCount: 0,
                        totalParticipantCount: 0,
                        isClosed: true,
                        scoringInputRevision: liveRevision,
                    })
                    .returning(),
            );
            // Switch back before publication; the worker's publication fence is
            // covered by the scoring suite. An already processed Live result can
            // then be selected without queuing anything.
            const back = await setClosedAnalysisInputMode({
                ...selectMode,
                request: {
                    ...selectMode.request,
                    inputMode: "closing",
                    selectionRevision: selected.selectionRevision,
                },
            });
            await db
                .update(schema.comparisonAnalysisCloseTable)
                .set({ liveStatsSnapshotId: live.id })
                .where(
                    eq(schema.comparisonAnalysisCloseTable.closeId, close.id),
                );
            await db
                .update(ranking)
                .set({ processedScoringInputRevision: liveRevision })
                .where(eq(ranking.id, f.configId));
            // A revision can have another complete result. It must not win just
            // because its ID is greater than the accepted Live publication.
            const { id: _liveId, ...counts } = live;
            const replacement = first(
                await db
                    .insert(schema.rankingConversationStatsSnapshotTable)
                    .values({ ...counts, voteCount: 1, totalVoteCount: 1 })
                    .returning(),
            );
            const { selectionRevision } = await setClosedAnalysisInputMode({
                ...selectMode,
                request: {
                    ...selectMode.request,
                    selectionRevision: back.selectionRevision,
                },
            });
            await expect(getComparisonResults(read)).resolves.toMatchObject({
                rankings: [],
                counters: { voteCount: 0 },
                closedAnalysisSelection: {
                    status: "ready",
                    servedInputMode: "live",
                },
            });
            await expect(getComparisonResults(checkpoint)).resolves.toEqual(
                historical,
            );
            await expect(
                getComparisonResults({
                    ...read,
                    rankingStatsSnapshotId: live.id,
                }),
            ).rejects.toMatchObject({ statusCode: 404 });
            await setClosedAnalysisInputMode({
                ...selectMode,
                request: {
                    ...selectMode.request,
                    selectionRevision,
                    inputMode: "closing",
                },
            });
            await expect(getComparisonResults(read)).resolves.toMatchObject({
                ...historical,
                closedAnalysisSelection: {
                    status: "ready",
                    servedInputMode: "closing",
                },
            });
            await db
                .update(schema.rankingItemTable)
                .set({
                    accountHiddenAt: new Date(),
                    accountHiddenContentRetained: true,
                })
                .where(eq(schema.rankingItemTable.id, item.id));
            await expect(getComparisonResults(read)).resolves.toMatchObject({
                rankings: [
                    {
                        itemSlugId: item.slugId,
                        isDeleted: true,
                        displayContent: null,
                        avgRank: 1,
                    },
                ],
            });
            await expect(getComparisonResults(checkpoint)).resolves.toEqual(
                historical,
            );
            await db
                .update(schema.rankingItemTable)
                .set({ currentContentId: null, deletedAt: new Date() })
                .where(eq(schema.rankingItemTable.id, item.id));
            await expect(
                getComparisonResults(checkpoint),
            ).resolves.toMatchObject({
                rankings: [
                    {
                        itemSlugId: item.slugId,
                        isDeleted: true,
                        displayContent: null,
                        externalUrl: null,
                        avgRank: 1,
                        score: expect.closeTo(0.7),
                    },
                ],
            });
            // Simulate the Closing publication pointer independently of the
            // worker. No replacement result acquires a second permanent link.
            await db
                .update(schema.comparisonAnalysisCloseTable)
                .set({
                    closingStatsSnapshotId: replacement.id,
                    servedStatsSnapshotId: replacement.id,
                })
                .where(
                    eq(schema.comparisonAnalysisCloseTable.closeId, close.id),
                );
            await expect(getComparisonResults(checkpoint)).resolves.toEqual({
                rankings: [],
            });
            await expect(
                getComparisonResults({
                    ...read,
                    rankingStatsSnapshotId: replacement.id,
                }),
            ).rejects.toMatchObject({ statusCode: 404 });
            // Publication IDs advance even when timestamps from different writers do not.
            await db
                .update(schema.rankingConversationStatsSnapshotTable)
                .set({ createdAt: new Date(Date.now() + 60_000) })
                .where(
                    eq(
                        schema.rankingConversationStatsSnapshotTable.id,
                        live.id,
                    ),
                );
            const timeline = await fetchRankingStatsCheckpoints({
                ...read,
                requestedRankingStatsSnapshotId: replacement.id,
            });
            expect(
                timeline.map((entry) => entry.rankingStatsSnapshotId),
            ).toEqual([f.snapshot.id, binding.originalStatsSnapshotId]);
            expect(timeline.at(-1)).toMatchObject({
                itemCount: 0,
                reasons: [{ reason: "conversation_closed" }],
            });
            await db
                .update(parent)
                .set({
                    isClosed: false,
                    closedFinalizedAt: null,
                    closingTargetRevision: null,
                    voteBufferEpoch: randomUUID(),
                })
                .where(eq(parent.id, conversationId));
            await expect(getComparisonResults(read)).resolves.toEqual({
                rankings: [],
            });
            await expect(getComparisonResults(checkpoint)).resolves.toEqual({
                rankings: [],
            });
            await db
                .update(schema.projectTable)
                .set({ deletedAt: new Date() })
                .where(eq(schema.projectTable.id, f.conversation.projectId));
            await expect(
                getComparisonResults(checkpoint),
            ).rejects.toMatchObject({ statusCode: 404 });
        },
    );

    it.each(["bws", "pairwise"] as const)(
        "roots a reused %s closing result in the original sealed capture without copying choices",
        async (method) => {
            const f = await seed({ method });
            await prepareClose({
                conversationId: f.conversation.id,
                configId: f.configId,
            });
            const before = await evidence();
            await expect(
                db.transaction(async (tx) =>
                    finalizeCurrentRankingConversation({
                        db: tx,
                        conversationId: f.conversation.id,
                    }),
                ),
            ).resolves.toBe(true);
            const after = await evidence();
            expect(after.roots).toEqual(before.roots);
            expect(after.participants).toEqual(before.participants);
            expect(after.answers).toEqual(before.answers);
            expect(after.items).toEqual(before.items);
            expect(after.scores).toEqual(before.scores);
            const closing = first(
                after.snapshots.filter(
                    (snapshot) => snapshot.id !== f.snapshot.id,
                ),
            );
            expect(closing).toMatchObject({
                reusedInputSnapshotId: f.input.id,
                rankingScoreId: f.score.id,
                scoringInputRevision: 1,
                isClosed: true,
                voteCount: 1,
                participantCount: 1,
                itemCount: f.slugs.length,
            });
            expect(after.checkpoints).toContainEqual(
                expect.objectContaining({
                    statsSnapshotId: closing.id,
                    reason: "conversation_closed",
                }),
            );
            const conversation = first(
                await db.select().from(schema.conversationTable),
            );
            const close = first(
                await db.select().from(schema.conversationAnalysisCloseTable),
            );
            expect(close).toMatchObject({
                conversationId: conversation.id,
                closeEpoch: conversation.voteBufferEpoch,
                finalizedAt: conversation.closedFinalizedAt,
                sourceRevision: closing.scoringInputRevision,
                selectedInputMode: "closing",
                servedInputMode: "closing",
            });
            expect(
                await db.select().from(schema.comparisonAnalysisCloseTable),
            ).toEqual([
                {
                    closeId: close.id,
                    conversationId: conversation.id,
                    originalStatsSnapshotId: closing.id,
                    closingStatsSnapshotId: closing.id,
                    liveStatsSnapshotId: closing.id,
                    servedStatsSnapshotId: closing.id,
                    processedClosingRevision: 0,
                    failedClosingRevision: null,
                    failedLiveRevision: null,
                },
            ]);
            await expect(
                db.transaction(async (tx) =>
                    finalizeCurrentRankingConversation({
                        db: tx,
                        conversationId: f.conversation.id,
                    }),
                ),
            ).resolves.toBe(false);
            expect(await evidence()).toEqual(after);
        },
    );

    it("reuses an explicit empty capture instead of reading current private answers", async () => {
        const f = await seed({ method: "pairwise" });
        const empty = first(
            await db
                .insert(schema.rankingConversationStatsSnapshotTable)
                .values({
                    conversationId: f.conversation.id,
                    itemCount: 0,
                    totalItemCount: 0,
                    voteCount: 0,
                    totalVoteCount: 0,
                    participantCount: 0,
                    totalParticipantCount: 0,
                    scoringInputRevision: 0,
                    isClosed: false,
                })
                .returning(),
        );
        const input = await db.transaction(async (tx) => {
            const capture = first(
                await tx
                    .insert(schema.rankingInputSnapshotTable)
                    .values({
                        conversationId: f.conversation.id,
                        comparisonMethod: "pairwise",
                        scoringInputRevision: 0,
                        algorithmVersion: 1,
                        solidagoVersion: "0.5.0",
                        pipelineConfig: {},
                        participantCount: 0,
                        itemCount: 0,
                        answerCount: 0,
                    })
                    .returning(),
            );
            await tx
                .update(schema.rankingInputSnapshotTable)
                .set({ sealedAt: new Date() })
                .where(eq(schema.rankingInputSnapshotTable.id, capture.id));
            await tx.insert(schema.comparisonInputBaselineTable).values({
                inputSnapshotId: capture.id,
                baselineInputSnapshotId: capture.id,
                conversationId: f.conversation.id,
            });
            await tx
                .update(schema.rankingInputSnapshotTable)
                .set({ statsSnapshotId: empty.id })
                .where(eq(schema.rankingInputSnapshotTable.id, capture.id));
            return capture;
        });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        await db
            .update(schema.rankingConversationConfigTable)
            .set({ currentRankingScoreId: null })
            .where(eq(schema.rankingConversationConfigTable.id, f.configId));
        await expect(
            db.transaction(async (tx) =>
                finalizeCurrentRankingConversation({
                    db: tx,
                    conversationId: f.conversation.id,
                }),
            ),
        ).resolves.toBe(true);
        expect(
            await db
                .select()
                .from(schema.rankingConversationStatsSnapshotTable)
                .where(
                    eq(
                        schema.rankingConversationStatsSnapshotTable
                            .reusedInputSnapshotId,
                        input.id,
                    ),
                ),
        ).toEqual([
            expect.objectContaining({
                rankingScoreId: null,
                voteCount: 0,
                itemCount: 0,
                participantCount: 0,
            }),
        ]);
        expect(
            await db.select().from(schema.comparisonAnswerTable),
        ).toHaveLength(1);
    });

    it("keeps a legacy closing result pending rather than fabricating its input capture", async () => {
        const f = await seed({ method: "pairwise" });
        await db.insert(schema.rankingConversationStatsSnapshotTable).values({
            conversationId: f.conversation.id,
            rankingScoreId: f.score.id,
            itemCount: 2,
            totalItemCount: 2,
            voteCount: 1,
            totalVoteCount: 1,
            participantCount: 1,
            totalParticipantCount: 1,
            scoringInputRevision: 0,
            isClosed: false,
        });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        const before = await evidence();
        const legacy = first(
            before.snapshots.filter(
                (snapshot) => snapshot.id !== f.snapshot.id,
            ),
        );
        expect(
            await resolveRetainedComparisonBaseline({
                db,
                conversationId: f.conversation.id,
                statsSnapshotId: legacy.id,
            }),
        ).toEqual({
            status: "unsupported",
            reason: "missing_numerical_evidence",
        });
        await expect(
            db.transaction(async (tx) =>
                finalizeCurrentRankingConversation({
                    db: tx,
                    conversationId: f.conversation.id,
                }),
            ),
        ).resolves.toBe(false);
        expect(await evidence()).toEqual(before);
        expect(
            first(await db.select().from(schema.conversationTable))
                .closedFinalizedAt,
        ).toBeNull();
        expect(await db.select().from(schema.realtimeEventOutboxTable)).toEqual(
            [],
        );
    });

    it("classifies an effective-only legacy capture as unsupported without rebuilding its baseline", async () => {
        const f = await seed({ method: "bws", withBaseline: false });
        expect(
            await resolveRetainedComparisonBaseline({
                db,
                conversationId: f.conversation.id,
                statsSnapshotId: f.snapshot.id,
            }),
        ).toEqual({
            status: "unsupported",
            reason: "missing_complete_baseline",
        });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        const before = await evidence();
        expect(
            await db.transaction(async (tx) =>
                finalizeCurrentRankingConversation({
                    db: tx,
                    conversationId: f.conversation.id,
                }),
            ),
        ).toBe(false);
        expect(await evidence()).toEqual(before);
        expect(before.baselines).toEqual([]);
    });

    it("resolves a reused closing baseline after its original publication is tombstoned", async () => {
        const f = await seed({ method: "pairwise" });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        expect(
            await db.transaction(async (tx) =>
                finalizeCurrentRankingConversation({
                    db: tx,
                    conversationId: f.conversation.id,
                }),
            ),
        ).toBe(true);
        const closing = first(
            (await evidence()).snapshots.filter(
                (snapshot) => snapshot.id !== f.snapshot.id,
            ),
        );
        await db
            .update(schema.rankingConversationStatsSnapshotTable)
            .set({ deletedAt: new Date() })
            .where(
                eq(
                    schema.rankingConversationStatsSnapshotTable.id,
                    f.snapshot.id,
                ),
            );
        expect(
            await resolveRetainedComparisonBaseline({
                db,
                conversationId: f.conversation.id,
                statsSnapshotId: closing.id,
            }),
        ).toEqual({
            status: "available",
            inputSnapshotId: f.input.id,
            baselineInputSnapshotId: f.input.id,
            comparisonMethod: "pairwise",
            participantCount: 1,
            itemCount: 2,
            answerCount: 1,
        });
        expect(
            await resolveRetainedComparisonBaseline({
                db,
                conversationId: f.conversation.id + 1,
                statsSnapshotId: closing.id,
            }),
        ).toEqual({ status: "unsupported", reason: "missing_publication" });
    });

    it("rejects reuse when the captured method no longer matches the conversation", async () => {
        const f = await seed({ method: "bws" });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        await db
            .update(schema.rankingConversationConfigTable)
            .set({ rankingMode: "pairwise" })
            .where(eq(schema.rankingConversationConfigTable.id, f.configId));
        const before = await evidence();
        await expect(
            db.transaction(async (tx) =>
                finalizeCurrentRankingConversation({
                    db: tx,
                    conversationId: f.conversation.id,
                }),
            ),
        ).resolves.toBe(false);
        expect(await evidence()).toEqual(before);
    });

    it("rolls back the closing reference, checkpoint, counters and event together", async () => {
        const f = await seed({ method: "pairwise" });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        const before = await evidence();
        await expect(
            db.transaction(async (tx) => {
                expect(
                    await finalizeCurrentRankingConversation({
                        db: tx,
                        conversationId: f.conversation.id,
                    }),
                ).toBe(true);
                throw new Error("rollback closing publication");
            }),
        ).rejects.toThrow("rollback closing publication");
        expect(await evidence()).toEqual(before);
        expect(
            first(await db.select().from(schema.conversationTable))
                .closedFinalizedAt,
        ).toBeNull();
        expect(
            first(await db.select().from(schema.rankingConversationConfigTable))
                .processedScoringInputRevision,
        ).toBe(0);
        expect(await db.select().from(schema.realtimeEventOutboxTable)).toEqual(
            [],
        );
    });

    it("protects reused evidence and permits source retirement after the original publication is tombstoned", async () => {
        const f = await seed({ method: "bws" });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        await db.transaction(async (tx) =>
            finalizeCurrentRankingConversation({
                db: tx,
                conversationId: f.conversation.id,
            }),
        );
        await db
            .update(schema.rankingConversationStatsSnapshotTable)
            .set({ deletedAt: new Date() })
            .where(
                eq(
                    schema.rankingConversationStatsSnapshotTable.id,
                    f.snapshot.id,
                ),
            );
        await expect(
            db
                .delete(schema.rankingInputAnswerTable)
                .where(
                    eq(
                        schema.rankingInputAnswerTable.inputSnapshotId,
                        f.input.id,
                    ),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_retained" },
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction(async (tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toMatchObject({ status: "progress", responses: 1 });
        expect(
            await db.select().from(schema.rankingInputAnswerTable),
        ).toHaveLength(1);
    });

    it("reuses the original capture directly across subsequent close cycles", async () => {
        const f = await seed({ method: "pairwise" });
        const epochs = [f.conversation.voteBufferEpoch, randomUUID()];
        for (const [index, epoch] of epochs.entries()) {
            const revision = index + 1;
            if (index > 0) {
                await db
                    .update(schema.conversationTable)
                    .set({
                        isClosed: false,
                        closingTargetRevision: null,
                        closedFinalizedAt: null,
                        voteBufferEpoch: epoch,
                    })
                    .where(eq(schema.conversationTable.id, f.conversation.id));
            }
            await prepareClose({
                conversationId: f.conversation.id,
                configId: f.configId,
                revision,
            });
            await expect(
                db.transaction(async (tx) =>
                    finalizeCurrentRankingConversation({
                        db: tx,
                        conversationId: f.conversation.id,
                    }),
                ),
            ).resolves.toBe(true);
        }
        const captures = await db
            .select()
            .from(schema.rankingInputSnapshotTable);
        expect(captures).toHaveLength(1);
        expect(captures[0]).toMatchObject({ statsSnapshotId: f.snapshot.id });
        const reused = await db
            .select()
            .from(schema.rankingConversationStatsSnapshotTable)
            .where(
                eq(
                    schema.rankingConversationStatsSnapshotTable
                        .reusedInputSnapshotId,
                    f.input.id,
                ),
            );
        expect(reused).toHaveLength(2);
        const closes = await db
            .select({ epoch: schema.conversationAnalysisCloseTable.closeEpoch })
            .from(schema.conversationAnalysisCloseTable)
            .orderBy(schema.conversationAnalysisCloseTable.sourceRevision);
        expect(closes.map((close) => close.epoch)).toEqual(epochs);
    });

    it("rejects mismatched reused counts and changes to a publication's evidence identity", async () => {
        const f = await seed({ method: "pairwise" });
        await expect(
            db.insert(schema.rankingConversationStatsSnapshotTable).values({
                conversationId: f.conversation.id,
                rankingScoreId: f.score.id,
                isClosed: true,
                itemCount: f.slugs.length,
                totalItemCount: f.slugs.length,
                totalVoteCount: 1,
                participantCount: 1,
                totalParticipantCount: 1,
                scoringInputRevision: 1,
                reusedInputSnapshotId: f.input.id,
                voteCount: 0,
            }),
        ).rejects.toMatchObject({
            cause: {
                constraint_name: "ranking_reused_input_publication_mismatch",
            },
        });
        await prepareClose({
            conversationId: f.conversation.id,
            configId: f.configId,
        });
        await db.transaction(async (tx) =>
            finalizeCurrentRankingConversation({
                db: tx,
                conversationId: f.conversation.id,
            }),
        );
        await expect(
            db
                .update(schema.rankingConversationStatsSnapshotTable)
                .set({ reusedInputSnapshotId: null })
                .where(
                    eq(
                        schema.rankingConversationStatsSnapshotTable
                            .reusedInputSnapshotId,
                        f.input.id,
                    ),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_reused_input_immutable" },
        });
    });

    it.each(["bws", "pairwise"] as const)(
        "preserves %s evidence/counts while removing account associations, never reattaching later registration",
        async (method) => {
            const f = await seed({ method });
            await db
                .update(schema.conversationTable)
                .set({
                    isClosed: true,
                    closingTargetRevision: 0,
                    closedFinalizedAt: new Date(),
                })
                .where(eq(schema.conversationTable.id, f.conversation.id));
            const before = await evidence();
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({ db: tx, userId: f.userId }),
                ),
            ).resolves.toEqual({
                status: "blocked",
                reason: "account_not_purging",
            });
            // A recoverable deletion alone still cannot retire the resumable session.
            await db
                .update(schema.userTable)
                .set({ isDeleted: true })
                .where(eq(schema.userTable.id, f.userId));
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({ db: tx, userId: f.userId }),
                ),
            ).resolves.toEqual({
                status: "blocked",
                reason: "account_not_purging",
            });
            await db
                .update(schema.userTable)
                .set({ purgeStartedAt: new Date() })
                .where(eq(schema.userTable.id, f.userId));
            await expect(
                db.transaction((tx) =>
                    findAccountParticipationSource({
                        db: tx,
                        userId: f.userId,
                    }),
                ),
            ).resolves.toBe("comparison_response");
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({ db: tx, userId: f.userId }),
                ),
            ).resolves.toEqual({
                status: "progress",
                responses: 1,
                answers: 1,
                personalScores: 1,
            });
            await expect(
                db.transaction((tx) =>
                    findAccountParticipationSource({
                        db: tx,
                        userId: f.userId,
                    }),
                ),
            ).resolves.toBeUndefined();
            await expect(
                db.transaction((tx) =>
                    unlinkAccountRetainedContributions({
                        db: tx,
                        userId: f.userId,
                    }),
                ),
            ).resolves.toMatchObject({ status: "progress", participants: 2 });
            expect(await evidence()).toEqual(before);
            expect(
                first(await db.select().from(schema.comparisonResponseTable)),
            ).toMatchObject({
                participantId: null,
                comparisons: [],
                ranking: null,
                isComplete: false,
            });
            expect(
                first(
                    await db.select().from(schema.conversationParticipantTable),
                ).userId,
            ).toBeNull();
            const newUserId = randomUUID();
            await db
                .insert(schema.userTable)
                .values({ id: newUserId, username: "later-voter" });
            await expect(
                db
                    .update(schema.comparisonResponseTable)
                    .set({ participantId: newUserId, detachedAt: null })
                    .where(
                        eq(schema.comparisonResponseTable.id, f.response.id),
                    ),
            ).rejects.toMatchObject({
                cause: { constraint_name: "comparison_source_no_reattachment" },
            });
            const fresh = first(
                await db
                    .insert(schema.comparisonResponseTable)
                    .values({
                        participantId: newUserId,
                        conversationId: f.conversation.id,
                        comparisons: [],
                    })
                    .returning(),
            );
            expect(fresh.id).not.toBe(f.response.id);
            expect(
                (
                    await db
                        .select({ count: count() })
                        .from(schema.comparisonAnswerTable)
                        .where(
                            eq(
                                schema.comparisonAnswerTable
                                    .comparisonResponseId,
                                fresh.id,
                            ),
                        )
                ).at(0)?.count,
            ).toBe(0);
            expect(await evidence()).toEqual(before);
        },
    );

    it("bounds private child retirement and detaches only after all active children are retired", async () => {
        const f = await seed({ method: "bws" });
        await db.insert(schema.comparisonAnswerTable).values(
            [1, 2].map((position) => ({
                comparisonResponseId: f.response.id,
                position,
                bestSlugId: first(f.slugs),
                worstSlugId: first(f.slugs.slice(-1)),
                candidateSet: f.slugs,
            })),
        );
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        for (const responses of [0, 0, 1]) {
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({
                        db: tx,
                        userId: f.userId,
                        limit: 1,
                    }),
                ),
            ).resolves.toMatchObject({
                status: "progress",
                responses,
                answers: 1,
            });
        }
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({
                    db: tx,
                    userId: f.userId,
                    limit: 1,
                }),
            ),
        ).resolves.toEqual({
            status: "progress",
            responses: 0,
            answers: 0,
            personalScores: 0,
        });
    });

    it("blocks legacy retained checkpoints rather than manufacturing input evidence", async () => {
        const f = await seed({ method: "pairwise" });
        await db.insert(schema.rankingConversationStatsSnapshotTable).values({
            conversationId: f.conversation.id,
            itemCount: 2,
            totalItemCount: 2,
            voteCount: 1,
            totalVoteCount: 1,
            participantCount: 1,
            totalParticipantCount: 1,
            scoringInputRevision: 0,
            isClosed: true,
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "legacy_comparison_evidence_missing",
        });
        expect(
            first(await db.select().from(schema.comparisonResponseTable))
                .participantId,
        ).toBe(f.userId);
        expect(
            first(await db.select().from(schema.comparisonAnswerTable))
                .deletedAt,
        ).toBeNull();
        await db
            .update(schema.comparisonAnswerTable)
            .set({ deletedAt: new Date() })
            .where(
                eq(
                    schema.comparisonAnswerTable.comparisonResponseId,
                    f.response.id,
                ),
            );
        await db
            .update(schema.comparisonUserEntityScoreTable)
            .set({ deletedAt: new Date() })
            .where(
                eq(
                    schema.comparisonUserEntityScoreTable.comparisonResponseId,
                    f.response.id,
                ),
            );
        await expect(
            db
                .update(schema.comparisonResponseTable)
                .set({
                    participantId: null,
                    detachedAt: new Date(),
                    comparisons: [],
                    ranking: null,
                    isComplete: false,
                })
                .where(eq(schema.comparisonResponseTable.id, f.response.id)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "comparison_source_unlink_not_ready" },
        });
    });

    it("waits for an unfinished close before retiring private inputs", async () => {
        const f = await seed({ method: "pairwise" });
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true, closingTargetRevision: 0 })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "unfinished_comparison_calculation",
        });
        expect(
            first(await db.select().from(schema.comparisonAnswerTable))
                .deletedAt,
        ).toBeNull();
        await db
            .update(schema.conversationTable)
            .set({ closedFinalizedAt: new Date() })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toMatchObject({ status: "progress", responses: 1 });
    });

    it("blocks a legacy current score even when other checkpoint inputs exist", async () => {
        const f = await seed({ method: "bws" });
        const legacy = first(
            await db
                .insert(schema.rankingScoreTable)
                .values({
                    conversationId: f.conversation.id,
                    scores: [],
                    participantCounts: {},
                    pipelineConfig: {},
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db
            .update(schema.rankingConversationConfigTable)
            .set({ currentRankingScoreId: legacy.id })
            .where(eq(schema.rankingConversationConfigTable.id, f.configId));
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "legacy_comparison_evidence_missing",
        });
    });

    it("blocks legacy account-keyed trust blobs, including unrooted score copies", async () => {
        const f = await seed({ method: "pairwise" });
        await db.insert(schema.rankingScoreTable).values({
            conversationId: f.conversation.id,
            scores: [],
            participantCounts: {},
            pipelineConfig: {},
            userWeightsSnapshot: { [f.userId]: 1 },
            computedAt: new Date(),
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "legacy_comparison_account_context",
        });
        expect(
            first(await db.select().from(schema.comparisonResponseTable))
                .participantId,
        ).toBe(f.userId);
    });

    it("treats legacy JSON null as absent trust context rather than an account lookup", async () => {
        const f = await seed({ method: "bws" });
        // A JS null is encoded as SQL NULL by Drizzle; exercise the distinct
        // historical JSON null representation explicitly at this fixture boundary.
        await db.insert(schema.rankingScoreTable).values({
            conversationId: f.conversation.id,
            scores: [],
            participantCounts: {},
            pipelineConfig: {},
            userWeightsSnapshot: sql`'null'::jsonb`,
            computedAt: new Date(),
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toMatchObject({ status: "progress", responses: 1 });
    });

    it("prevents rewriting a retained input or detaching its published binding", async () => {
        const f = await seed({ method: "bws" });
        await expect(
            db
                .update(schema.rankingInputSnapshotTable)
                .set({ statsSnapshotId: null })
                .where(eq(schema.rankingInputSnapshotTable.id, f.input.id)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db.insert(schema.rankingInputAnswerTable).values({
                inputSnapshotId: f.input.id,
                participantIndex: 0,
                position: 99,
                bestSlugId: first(f.slugs),
                worstSlugId: first(f.slugs.slice(-1)),
                candidateSet: f.slugs,
                effectiveCandidateSet: f.slugs,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db
                .insert(schema.rankingInputParticipantTable)
                .values({ inputSnapshotId: f.input.id, participantIndex: 42 }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db.insert(schema.rankingInputItemTable).values({
                inputSnapshotId: f.input.id,
                itemSlugId: "extra001",
                position: 42,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db
                .delete(schema.rankingInputAnswerTable)
                .where(
                    eq(
                        schema.rankingInputAnswerTable.inputSnapshotId,
                        f.input.id,
                    ),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_retained" },
        });
        await expect(
            db
                .update(schema.rankingInputAnswerTable)
                .set({ position: 42 })
                .where(
                    eq(
                        schema.rankingInputAnswerTable.inputSnapshotId,
                        f.input.id,
                    ),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
    });

    it("blocks account-wide unlink for legacy context without any surviving response", async () => {
        const f = await seed({ method: "pairwise" });
        const userId = randomUUID();
        await db.insert(schema.userTable).values({
            id: userId,
            username: "legacy-only",
            isDeleted: true,
            purgeStartedAt: new Date(),
        });
        await db
            .insert(schema.conversationParticipantTable)
            .values({ userId, conversationId: f.conversation.id });
        await db.insert(schema.rankingScoreTable).values({
            conversationId: f.conversation.id,
            scores: [],
            participantCounts: {},
            pipelineConfig: {},
            userWeightsSnapshot: { [userId]: 1 },
            computedAt: new Date(),
        });
        for (const operation of [
            retireComparisonAccountInputs,
            unlinkAccountRetainedContributions,
        ]) {
            await expect(
                db.transaction(
                    async (tx) => await operation({ db: tx, userId }),
                ),
            ).resolves.toMatchObject({
                status: "blocked",
                reason: "legacy_comparison_account_context",
            });
        }
        await expect(
            db
                .update(schema.conversationParticipantTable)
                .set({ userId: null })
                .where(eq(schema.conversationParticipantTable.userId, userId)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "legacy_comparison_account_context" },
        });
        const authorId = randomUUID();
        await db.insert(schema.userTable).values({
            id: authorId,
            username: "legacy-author",
            isDeleted: true,
            purgeStartedAt: new Date(),
        });
        const item = first(
            await db
                .insert(schema.rankingItemTable)
                .values({
                    slugId: "legacy01",
                    conversationId: f.conversation.id,
                    authorId,
                })
                .returning(),
        );
        await expect(
            db.transaction(
                async (tx) =>
                    await unlinkAccountRetainedContributions({
                        db: tx,
                        userId: authorId,
                    }),
            ),
        ).resolves.toMatchObject({
            status: "blocked",
            reason: "legacy_comparison_account_context",
        });
        expect(
            first(
                await db
                    .select({ authorId: schema.rankingItemTable.authorId })
                    .from(schema.rankingItemTable)
                    .where(eq(schema.rankingItemTable.id, item.id)),
            ).authorId,
        ).toBe(authorId);
    });

    it("requires a complete sealed capture before committing", async () => {
        const f = await seed({ method: "bws" });
        const root = {
            conversationId: f.conversation.id,
            comparisonMethod: "bws",
            scoringInputRevision: 0,
            algorithmVersion: 1,
            solidagoVersion: "0.5.0",
            pipelineConfig: {},
            participantCount: 1,
            itemCount: 1,
            answerCount: 1,
        } satisfies typeof schema.rankingInputSnapshotTable.$inferInsert;
        await expect(
            db.transaction(async (tx) => {
                await tx.insert(schema.rankingInputSnapshotTable).values(root);
            }),
        ).rejects.toMatchObject({
            constraint_name: "ranking_input_seal_required",
        });
        await expect(
            db.transaction(async (tx) => {
                const input = first(
                    await tx
                        .insert(schema.rankingInputSnapshotTable)
                        .values(root)
                        .returning(),
                );
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({ sealedAt: new Date() })
                    .where(eq(schema.rankingInputSnapshotTable.id, input.id));
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_incomplete" },
        });
        await expect(
            db.transaction(async (tx) => {
                const input = first(
                    await tx
                        .insert(schema.rankingInputSnapshotTable)
                        .values({
                            ...root,
                            participantCount: 0,
                            itemCount: 0,
                            answerCount: 0,
                        })
                        .returning(),
                );
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({
                        sealedAt: new Date(),
                        statsSnapshotId: f.snapshot.id,
                    })
                    .where(eq(schema.rankingInputSnapshotTable.id, input.id));
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_publication_mismatch" },
        });
    });

    it("rejects direct unlinking before source retirement and cross-conversation evidence references", async () => {
        const f = await seed({ method: "pairwise" });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db
                .update(schema.comparisonResponseTable)
                .set({
                    participantId: null,
                    detachedAt: new Date(),
                    comparisons: [],
                    ranking: null,
                    isComplete: false,
                })
                .where(eq(schema.comparisonResponseTable.id, f.response.id)),
        ).rejects.toThrow();
        const otherProject = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: "other",
                    title: "Other",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const otherConfig = first(
            await db
                .insert(schema.rankingConversationConfigTable)
                .values({ rankingMode: "pairwise" })
                .returning(),
        );
        const other = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "other001",
                    projectId: otherProject.id,
                    rankingConfigId: otherConfig.id,
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                })
                .returning(),
        );
        await expect(
            db
                .update(schema.rankingInputSnapshotTable)
                .set({ conversationId: other.id })
                .where(
                    eq(
                        schema.rankingInputSnapshotTable.statsSnapshotId,
                        f.snapshot.id,
                    ),
                ),
        ).rejects.toThrow();
        await expect(
            db.insert(schema.rankingInputSnapshotTable).values({
                ...f.input,
                id: randomUUID(),
                conversationId: other.id,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_build_before_seal" },
        });
        expect(
            await db
                .select()
                .from(schema.rankingInputAnswerTable)
                .where(
                    and(
                        eq(
                            schema.rankingInputAnswerTable.inputSnapshotId,
                            f.input.id,
                        ),
                        eq(schema.rankingInputAnswerTable.participantIndex, 0),
                    ),
                ),
        ).toHaveLength(1);
    });
});
