import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Pool } from "pg";
import * as schema from "@/shared-backend/schema.js";
import pino from "pino";
import { Script } from "@valkey/valkey-glide";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    conversationTable,
    conversationContentTable,
    conversationViewSnapshotTable,
    opinionGroupSpecTable,
    comparisonAnswerTable,
    comparisonResponseTable,
    comparisonUserEntityScoreTable,
    projectTable,
    rankingConversationConfigTable,
    rankingConversationStatsCheckpointTable,
    rankingConversationStatsSnapshotTable,
    rankingConversationStatsItemTable,
    rankingItemTable,
    rankingItemContentTable,
    rankingScoreTable,
    rankingScoreEntityTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { ComparisonAnswer } from "@/shared/types/zod.js";
import { syncComparisonAnswers } from "./comparisonHistory.js";
import { buildComparisonAppearanceCountQuery } from "./comparisonQueries.js";
import {
    loadComparisonResponse,
    getComparisonResults,
    computeItemSnapshot,
    fetchRankingStatsCheckpoints,
} from "./comparison.js";
import { fetchRankingItems } from "./rankingItem.js";
import type { RankingItemDisplayPreferences } from "./rankingItemDisplay.js";
import { fetchConversationDisplayCountsByConversationId } from "./conversationDisplayCounts.js";
import { requestContentTranslation } from "./contentTranslation.js";
import { ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT } from "@/shared-backend/contentTranslationQueue.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

describe("incremental comparison history with revision triggers", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    let defaultOpinionGroupSpecId: number;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "ranking_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "ranking_test",
            user: "postgres",
            password: "postgres",
        };
        client = postgres({ ...connection, max: 4, onnotice: () => undefined });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (await pushSchema(schema, drizzlePg({ client: pool }))).apply();
        } finally {
            await pool.end();
        }
        const analysisSpec = (
            await db
                .insert(schema.analysisSpecTable)
                .values({ analysisFamily: "opinion_groups" })
                .returning({ id: schema.analysisSpecTable.id })
        ).at(0);
        if (analysisSpec === undefined)
            throw new Error("Missing history analysis spec fixture");
        const opinionGroupSpec = (
            await db
                .insert(opinionGroupSpecTable)
                .values({
                    analysisSpecId: analysisSpec.id,
                    key: "default",
                    version: 1,
                    reducer: "pca",
                    clusterer: "kmeans",
                    selectionPolicy: "silhouette_size_balance",
                    minClusterableParticipants: 2,
                    minVotesPerParticipant: 7,
                    maxGroupCount: 6,
                })
                .returning({ id: opinionGroupSpecTable.id })
        ).at(0);
        if (opinionGroupSpec === undefined)
            throw new Error("Missing history opinion-group spec fixture");
        defaultOpinionGroupSpecId = opinionGroupSpec.id;
        const directory = new URL("../../database/flyway/", import.meta.url);
        // Exercise the real revision fences on canonical DDL, not a historical
        // schema that no longer matches the generated ORM's nullable source link.
        for (const name of [
            "V0082.1__track_ranking_scoring_inputs.sql",
            "V0089.1__separate_ranking_scoring_invalidations.sql",
            "V0105__exclude_survey_annotations_from_scoring.sql",
            "V0111.1__backfill_conversation_participants.sql",
        ]) {
            const source = await readFile(new URL(name, directory), "utf8");
            const definitions = source.matchAll(
                /^CREATE (?:OR REPLACE )?FUNCTION\b.*?^\$\$;|^(?:CREATE|DROP) TRIGGER\b.*?;/gms,
            );
            for (const [definition] of definitions) {
                await client.unsafe(
                    definition
                        .replaceAll("maxdiff_result", "comparison_response")
                        .replaceAll("maxdiff_comparison", "comparison_answer")
                        .replaceAll(
                            "conversation_type = 'ranking'",
                            "prioritization_type = 'comparisons'",
                        ),
                );
            }
        }
        await client.unsafe(
            await readFile(
                new URL(
                    "../../scripts/prepare-comparison-retention-contract.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
    }, 120_000);

    afterAll(async () => {
        if (client !== undefined) await client.end();
        if (container !== undefined) await container.stop();
    });

    async function fixture() {
        const userId = randomUUID();
        const slug = userId.slice(0, 8);
        await db
            .insert(userTable)
            .values({ id: userId, username: `test-${slug}` });
        const [project] = await db
            .insert(projectTable)
            .values({
                slug: `test-${slug}`,
                title: "History test",
                directoryVisibility: "unlisted",
            })
            .returning({ id: projectTable.id });
        const [config] = await db
            .insert(rankingConversationConfigTable)
            .values({
                rankingMode: "bws",
            })
            .returning({ id: rankingConversationConfigTable.id });
        const [conversation] = await db
            .insert(conversationTable)
            .values({
                slugId: slug,
                projectId: project.id,
                rankingConfigId: config.id,
                conversationType: "prioritizing",
                prioritizationType: "comparisons",
            })
            .returning({ id: conversationTable.id });
        const [result] = await db
            .insert(comparisonResponseTable)
            .values({
                participantId: userId,
                conversationId: conversation.id,
                comparisons: [],
            })
            .returning({ id: comparisonResponseTable.id });
        return {
            resultId: result.id,
            configId: config.id,
            userId,
            conversationId: conversation.id,
        };
    }

    const first: ComparisonAnswer = {
        best: "a",
        worst: "d",
        set: ["a", "b", "c", "d"],
    };
    const second: ComparisonAnswer = {
        best: "b",
        worst: "c",
        set: ["b", "c", "d"],
    };

    async function save({
        resultId,
        comparisons,
    }: {
        resultId: number;
        comparisons: ComparisonAnswer[];
    }) {
        await db.transaction(async (tx) => {
            // Lock the response before diffing normalized answers.
            await tx
                .update(comparisonResponseTable)
                .set({ comparisons })
                .where(eq(comparisonResponseTable.id, resultId));
            await syncComparisonAnswers({
                tx,
                responseId: resultId,
                comparisons,
                now: new Date(),
            });
        });
    }

    async function rows(resultId: number) {
        return await db
            .select()
            .from(comparisonAnswerTable)
            .where(eq(comparisonAnswerTable.comparisonResponseId, resultId))
            .orderBy(comparisonAnswerTable.id);
    }

    async function revision(configId: number) {
        const [config] = await db
            .select({
                input: rankingConversationConfigTable.scoringInputRevision,
                invalidation:
                    rankingConversationConfigTable.scoringInvalidationRevision,
            })
            .from(rankingConversationConfigTable)
            .where(eq(rankingConversationConfigTable.id, configId));
        return config;
    }

    it("preserves old row identities on append and does no scoring writes on retry", async () => {
        const { resultId, configId } = await fixture();
        await save({ resultId, comparisons: [first] });
        const original = await rows(resultId);
        const before = await revision(configId);
        await save({ resultId, comparisons: [first, second] });
        const appended = await rows(resultId);
        expect(appended).toHaveLength(2);
        expect(appended[0]).toEqual(original[0]);
        expect(appended.every((row) => row.deletedAt === null)).toBe(true);
        const after = await revision(configId);
        expect(after.input).toBe(before.input + 1);
        expect(after.invalidation).toBe(before.invalidation);
        await save({ resultId, comparisons: [first, second] });
        expect(await rows(resultId)).toEqual(appended);
        expect(await revision(configId)).toEqual(after);
    });

    it("soft-deletes only edited or removed positions and invalidates their snapshots", async () => {
        const { resultId, configId } = await fixture();
        await save({ resultId, comparisons: [first, second] });
        const original = await rows(resultId);
        const before = await revision(configId);
        const edited = { ...first, best: first.worst, worst: first.best };
        await save({ resultId, comparisons: [edited, second] });
        const changed = await rows(resultId);
        expect(changed).toHaveLength(3);
        expect(changed[0].deletedAt).not.toBeNull();
        expect(changed[1]).toEqual(original[1]);
        expect(changed[2].bestSlugId).toBe("d");
        expect((await revision(configId)).invalidation).toBeGreaterThan(
            before.input,
        );
        await save({ resultId, comparisons: [edited] });
        expect(
            (await rows(resultId)).filter((row) => row.deletedAt === null),
        ).toHaveLength(1);
        await save({ resultId, comparisons: [] });
        expect(
            (await rows(resultId)).filter((row) => row.deletedAt === null),
        ).toHaveLength(0);
    });

    it("serializes simultaneous retries without duplicate active comparisons", async () => {
        const { resultId, configId } = await fixture();
        const before = await revision(configId);
        await Promise.all(
            Array.from({ length: 8 }, async () => {
                await save({ resultId, comparisons: [first, second] });
            }),
        );
        expect(await rows(resultId)).toHaveLength(2);
        expect((await revision(configId)).input).toBe(before.input + 1);
    });

    it("inserts only one row per appended task across a 20-task session", async () => {
        const { resultId } = await fixture();
        const comparisons: ComparisonAnswer[] = [];
        for (let index = 0; index < 20; index++) {
            comparisons.push(index % 2 === 0 ? first : second);
            await save({ resultId, comparisons });
        }
        expect(await rows(resultId)).toHaveLength(20);
        const active = await db
            .select()
            .from(comparisonAnswerTable)
            .where(
                and(
                    eq(comparisonAnswerTable.comparisonResponseId, resultId),
                    isNull(comparisonAnswerTable.deletedAt),
                ),
            );
        expect(active).toHaveLength(20);
    });

    it("accepts a large history without exceeding PostgreSQL's parameter limit", async () => {
        const { resultId } = await fixture();
        const comparisons = Array.from({ length: 14_000 }, () => first);
        await save({ resultId, comparisons });
        expect(await rows(resultId)).toHaveLength(comparisons.length);
        await save({ resultId, comparisons: [] });
        expect(
            (await rows(resultId)).every((row) => row.deletedAt !== null),
        ).toBe(true);
    });

    it("counts appearances in PostgreSQL with numeric ORM results scoped to the conversation", async () => {
        const { resultId } = await fixture();
        const other = await fixture();
        await save({ resultId, comparisons: [first, second] });
        await save({ resultId: other.resultId, comparisons: [first] });
        const [result] = await db
            .select({ conversationId: comparisonResponseTable.conversationId })
            .from(comparisonResponseTable)
            .where(eq(comparisonResponseTable.id, resultId));
        const counts = await buildComparisonAppearanceCountQuery({
            db,
            conversationId: result.conversationId,
        });
        expect(
            Object.fromEntries(
                counts.map((row) => [row.itemSlugId, row.appearanceCount]),
            ),
        ).toEqual({ a: 1, b: 2, c: 2, d: 2 });
    });

    it("returns stored personal display scores without exposing tombstones or stretching their range", async () => {
        const { resultId, userId, conversationId } = await fixture();
        await save({ resultId, comparisons: [first] });
        await db.insert(comparisonUserEntityScoreTable).values([
            {
                comparisonResponseId: resultId,
                entitySlugId: "a",
                score: 0.18,
                displayScore: 0.5886,
                uncertaintyLeft: 1,
                uncertaintyRight: 1,
            },
            {
                comparisonResponseId: resultId,
                entitySlugId: "c",
                score: 42,
                displayScore: 0.99,
                uncertaintyLeft: 1,
                uncertaintyRight: 1,
                deletedAt: new Date(),
            },
            {
                comparisonResponseId: resultId,
                entitySlugId: "d",
                score: -0.135,
                displayScore: 0.4331,
                uncertaintyLeft: 1,
                uncertaintyRight: 1,
            },
        ]);
        const loaded = await loadComparisonResponse({
            db,
            userId,
            conversationId,
        });
        expect(loaded.perUserScores).toHaveLength(2);
        expect(loaded.perUserScores?.[0].score).toBeCloseTo(0.5886, 5);
        expect(loaded.perUserScores?.[1].score).toBeCloseTo(0.4331, 5);
    });

    async function scoringFixture() {
        const { resultId, configId } = await fixture();
        const [owner] = await db
            .select({
                conversationId: comparisonResponseTable.conversationId,
                userId: comparisonResponseTable.participantId,
            })
            .from(comparisonResponseTable)
            .where(eq(comparisonResponseTable.id, resultId));
        const [conversation] = await db
            .select({ slugId: conversationTable.slugId })
            .from(conversationTable)
            .where(eq(conversationTable.id, owner.conversationId));
        const [content] = await db
            .insert(conversationContentTable)
            .values({
                conversationId: owner.conversationId,
                title: "Stored score scale",
            })
            .returning({ id: conversationContentTable.id });
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, owner.conversationId));
        const items: { id: number; slugId: string; contentId: number }[] = [];
        for (let index = 0; index < 2; index++) {
            const [item] = await db
                .insert(rankingItemTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    authorId: owner.userId,
                    conversationId: owner.conversationId,
                })
                .returning({
                    id: rankingItemTable.id,
                    slugId: rankingItemTable.slugId,
                });
            const [itemContent] = await db
                .insert(rankingItemContentTable)
                .values({
                    rankingItemId: item.id,
                    conversationContentId: content.id,
                    title: `Item ${String(index)}`,
                })
                .returning({ id: rankingItemContentTable.id });
            await db
                .update(rankingItemTable)
                .set({ currentContentId: itemContent.id })
                .where(eq(rankingItemTable.id, item.id));
            items.push({ ...item, contentId: itemContent.id });
        }
        const [scoring] = await db
            .insert(rankingScoreTable)
            .values({
                conversationId: owner.conversationId,
                scores: [],
                participantCounts: {},
                pipelineConfig: {},
                computedAt: new Date(),
            })
            .returning({ id: rankingScoreTable.id });
        await db.insert(rankingScoreEntityTable).values(
            items.map((item, index) => ({
                rankingScoreId: scoring.id,
                entitySlugId: item.slugId,
                score: index === 0 ? 0.2 : -0.2,
                displayScore: index === 0 ? 0.6 : 0.4,
                uncertaintyLeft: 1,
                uncertaintyRight: 1,
                participantCount: 1,
            })),
        );
        await db
            .update(rankingConversationConfigTable)
            .set({ currentRankingScoreId: scoring.id })
            .where(eq(rankingConversationConfigTable.id, configId));
        const [snapshot] = await db
            .insert(rankingConversationStatsSnapshotTable)
            .values({
                conversationId: owner.conversationId,
                rankingScoreId: scoring.id,
                itemCount: 2,
                totalItemCount: 2,
                voteCount: 0,
                totalVoteCount: 0,
                participantCount: 0,
                totalParticipantCount: 0,
                scoringInputRevision: 0,
                isClosed: false,
            })
            .returning({ id: rankingConversationStatsSnapshotTable.id });
        await db.insert(rankingConversationStatsItemTable).values(
            items.map((item, index) => ({
                statsSnapshotId: snapshot.id,
                conversationId: owner.conversationId,
                rankingItemId: item.id,
                rankingItemContentId: item.contentId,
                lifecycleStatus: "active" as const,
                score: index === 0 ? 0.6 : 0.4,
                rank: index + 1,
                participantCount: 1,
            })),
        );
        const displayPreferences = {
            displayLanguage: "en",
            targetLanguage: "en",
            spokenLanguages: ["en"],
            translationAllowed: false,
        } satisfies RankingItemDisplayPreferences;
        await db.insert(conversationViewSnapshotTable).values({
            conversationId: owner.conversationId,
            conversationContentId: content.id,
            opinionGroupSpecId: defaultOpinionGroupSpecId,
            viewReason: "conversation_content_updated",
            isClosed: false,
            opinionCount: 2,
            totalOpinionCount: 2,
            voteCount: 0,
            totalVoteCount: 0,
            participantCount: 0,
            totalParticipantCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            activatedAt: new Date(),
        });
        const request = {
            db,
            conversationSlugId: conversation.slugId,
            displayPreferences,
        };
        return { request, owner, items, scoring, snapshot, configId };
    }

    it("uses the same stored scale for live, historical, and frozen lifecycle scores", async () => {
        const { request, owner, items, scoring, snapshot } =
            await scoringFixture();
        for (const result of [
            await getComparisonResults(request),
            await getComparisonResults({
                ...request,
                rankingStatsSnapshotId: snapshot.id,
            }),
        ]) {
            expect(result.rankings).toHaveLength(2);
            expect(result.rankings[0].score).toBeCloseTo(0.6, 5);
            expect(result.rankings[1].score).toBeCloseTo(0.4, 5);
        }
        await db
            .update(rankingConversationStatsSnapshotTable)
            .set({ rankingScoreId: null })
            .where(eq(rankingConversationStatsSnapshotTable.id, snapshot.id));
        const withoutRawProvenance = await getComparisonResults({
            ...request,
            rankingStatsSnapshotId: snapshot.id,
        });
        // These checkpoint rows already contain authoritative display values;
        // losing an optional raw-score reference must not erase or rescale them.
        expect(withoutRawProvenance.rankings.map((item) => item.score)).toEqual(
            [0.6, 0.4],
        );
        expect(
            withoutRawProvenance.rankings.map((item) => item.avgRank),
        ).toEqual([1, 2]);
        const frozen = await computeItemSnapshot({
            db,
            conversationId: owner.conversationId,
            itemSlugId: items[0].slugId,
        });
        expect(frozen.snapshotRankingScoreId).toBe(scoring.id);
        await db
            .update(rankingItemTable)
            .set({ lifecycleStatus: "completed", ...frozen })
            .where(eq(rankingItemTable.id, items[0].id));
        const completed = await getComparisonResults({
            ...request,
            lifecycleFilter: "completed",
        });
        expect(completed.rankings[0].score).toBeCloseTo(0.6, 5);
        const fetched = await fetchRankingItems({
            ...request,
            lifecycleFilter: "completed",
        });
        expect(fetched.items[0].snapshotScore).toBeCloseTo(0.6, 5);
    });

    it("ignores retained deleted snapshots in display metadata and checkpoint reads", async () => {
        const { request, owner, snapshot } = await scoringFixture();
        const [deletedSnapshot] = await db
            .insert(rankingConversationStatsSnapshotTable)
            .values({
                conversationId: owner.conversationId,
                itemCount: 0,
                totalItemCount: 0,
                voteCount: 0,
                totalVoteCount: 0,
                participantCount: 0,
                totalParticipantCount: 0,
                scoringInputRevision: 0,
                isClosed: true,
                createdAt: new Date("2030-01-01T00:00:00Z"),
                deletedAt: new Date(),
            })
            .returning({ id: rankingConversationStatsSnapshotTable.id });
        await db.insert(rankingConversationStatsCheckpointTable).values({
            conversationId: owner.conversationId,
            statsSnapshotId: deletedSnapshot.id,
            reason: "conversation_closed",
        });
        const counts = await fetchConversationDisplayCountsByConversationId({
            db,
            conversationIds: [owner.conversationId],
        });
        expect(counts.get(owner.conversationId)?.rankingStatsSnapshotId).toBe(
            snapshot.id,
        );
        const checkpoints = await fetchRankingStatsCheckpoints({
            db,
            conversationSlugId: request.conversationSlugId,
            requestedRankingStatsSnapshotId: undefined,
        });
        expect(checkpoints.map((row) => row.rankingStatsSnapshotId)).toEqual([
            snapshot.id,
        ]);
        await expect(
            getComparisonResults({
                ...request,
                rankingStatsSnapshotId: deletedSnapshot.id,
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("filters retained deleted item rows and rejects deleted baseline snapshots", async () => {
        const { request, items, snapshot } = await scoringFixture();
        await db
            .update(rankingConversationStatsItemTable)
            .set({ deletedAt: new Date() })
            .where(
                and(
                    eq(
                        rankingConversationStatsItemTable.statsSnapshotId,
                        snapshot.id,
                    ),
                    eq(
                        rankingConversationStatsItemTable.rankingItemId,
                        items[0].id,
                    ),
                ),
            );
        const historical = await getComparisonResults({
            ...request,
            rankingStatsSnapshotId: snapshot.id,
        });
        expect(historical.rankings.map((row) => row.itemSlugId)).toEqual([
            items[1].slugId,
        ]);
        await db
            .update(rankingConversationStatsSnapshotTable)
            .set({ deletedAt: new Date() })
            .where(eq(rankingConversationStatsSnapshotTable.id, snapshot.id));
        await expect(
            getComparisonResults({
                ...request,
                rankingStatsSnapshotId: snapshot.id,
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it.each(["snapshot", "item"])(
        "does not authorize historical translations through a deleted %s",
        async (deletedKind) => {
            const { request, items, snapshot } = await scoringFixture();
            const [historicalContent] = await db
                .select()
                .from(rankingItemContentTable)
                .where(eq(rankingItemContentTable.id, items[0].contentId));
            const [newContent] = await db
                .insert(rankingItemContentTable)
                .values({
                    rankingItemId: items[0].id,
                    conversationContentId:
                        historicalContent.conversationContentId,
                    title: "Updated item",
                })
                .returning({ id: rankingItemContentTable.id });
            await db
                .update(rankingItemTable)
                .set({ currentContentId: newContent.id })
                .where(eq(rankingItemTable.id, items[0].id));
            const queueScript = new Script(
                ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT,
            );
            const params = {
                db,
                valkey: undefined,
                queueScript,
                targetLanguageCode: "en",
                requestMode: "read_existing",
                requesterIsSiteModerator: false,
                now: new Date(),
                log: pino({ enabled: false }),
                beforeQueueTranslationWork: () =>
                    Promise.reject(
                        new Error(
                            "A read-existing request must not queue translation work",
                        ),
                    ),
                subject: {
                    kind: "ranking_item",
                    conversationSlugId: request.conversationSlugId,
                    itemSlugId: items[0].slugId,
                    sourceVersion: historicalContent.publicId,
                },
            } satisfies Parameters<typeof requestContentTranslation>[0];
            try {
                expect(await requestContentTranslation(params)).toBeDefined();
                if (deletedKind === "snapshot") {
                    await db
                        .update(rankingConversationStatsSnapshotTable)
                        .set({ deletedAt: new Date() })
                        .where(
                            eq(
                                rankingConversationStatsSnapshotTable.id,
                                snapshot.id,
                            ),
                        );
                } else {
                    await db
                        .update(rankingConversationStatsItemTable)
                        .set({ deletedAt: new Date() })
                        .where(
                            eq(
                                rankingConversationStatsItemTable.statsSnapshotId,
                                snapshot.id,
                            ),
                        );
                }
                expect(await requestContentTranslation(params)).toBeUndefined();
            } finally {
                queueScript.release();
            }
        },
    );

    it("preserves live raw-score ranks and counts when display values are missing", async () => {
        const { request, scoring } = await scoringFixture();
        await db
            .update(rankingScoreEntityTable)
            .set({ displayScore: null })
            .where(eq(rankingScoreEntityTable.rankingScoreId, scoring.id));
        const results = await getComparisonResults(request);
        expect(
            results.rankings.map(({ avgRank, score, participantCount }) => ({
                avgRank,
                score,
                participantCount,
            })),
        ).toEqual([
            { avgRank: 1, score: null, participantCount: 1 },
            { avgRank: 2, score: null, participantCount: 1 },
        ]);
    });

    it("keeps the saved lifecycle rank even without recoverable display provenance", async () => {
        const { request, owner, items } = await scoringFixture();
        const frozen = await computeItemSnapshot({
            db,
            conversationId: owner.conversationId,
            itemSlugId: items[1].slugId,
        });
        expect(frozen.snapshotRank).toBe(2);
        await db
            .update(rankingItemTable)
            .set({
                ...frozen,
                lifecycleStatus: "completed",
                snapshotRankingScoreId: null,
            })
            .where(eq(rankingItemTable.id, items[1].id));
        const results = await getComparisonResults({
            ...request,
            lifecycleFilter: "completed",
        });
        expect(results.rankings).toHaveLength(1);
        expect(results.rankings[0]).toMatchObject({
            avgRank: 2,
            score: null,
            participantCount: 1,
        });
    });

    it("returns unranked items when no community score has been computed", async () => {
        const { request, configId } = await scoringFixture();
        await db
            .update(rankingConversationConfigTable)
            .set({ currentRankingScoreId: null })
            .where(eq(rankingConversationConfigTable.id, configId));
        const results = await getComparisonResults(request);
        expect(results.rankings).toHaveLength(2);
        expect(
            results.rankings.every(
                (item) =>
                    item.avgRank === null &&
                    item.score === null &&
                    item.participantCount === 0,
            ),
        ).toBe(true);
    });
});
