import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    conversationTable,
    conversationContentTable,
    conversationViewSnapshotTable,
    opinionGroupSpecTable,
    maxdiffComparisonTable,
    maxdiffResultTable,
    maxdiffUserEntityScoreTable,
    projectTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
    rankingConversationStatsItemTable,
    rankingItemTable,
    rankingItemContentTable,
    rankingScoreTable,
    rankingScoreEntityTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { syncMaxdiffComparisons } from "./maxdiffHistory.js";
import { buildMaxdiffAppearanceCountQuery } from "./maxdiffQueries.js";
import {
    loadMaxdiffResult,
    getMaxdiffResults,
    computeItemSnapshot,
} from "./maxdiff.js";
import { fetchRankingItems } from "./rankingItem.js";
import type { RankingItemDisplayPreferences } from "./rankingItemDisplay.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

describe("incremental MaxDiff history with revision triggers", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "ranking_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "ranking_test",
            username: "postgres",
            password: "postgres",
            max: 4,
        });
        db = drizzle(client);
        const directory = new URL("../../database/flyway/", import.meta.url);
        const migrations = (await readdir(directory))
            .filter((name) => /^V\d+(\.\d+)?__.*\.sql$/.test(name))
            .map((name) => ({
                name,
                version: name.slice(1).split("__")[0].split(".").map(Number),
            }))
            .sort(
                (a, b) =>
                    a.version[0] - b.version[0] ||
                    (a.version[1] ?? 0) - (b.version[1] ?? 0),
            );
        for (const migration of migrations) {
            const sql = await readFile(
                new URL(migration.name, directory),
                "utf8",
            );
            await client.begin(async (tx) => {
                await tx.unsafe(sql);
            });
        }
    }, 60_000);

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
                conversationType: "ranking",
            })
            .returning({ id: conversationTable.id });
        const [result] = await db
            .insert(maxdiffResultTable)
            .values({
                participantId: userId,
                conversationId: conversation.id,
                comparisons: [],
            })
            .returning({ id: maxdiffResultTable.id });
        return { resultId: result.id, configId: config.id };
    }

    const first: MaxDiffComparison = {
        best: "a",
        worst: "d",
        set: ["a", "b", "c", "d"],
    };
    const second: MaxDiffComparison = {
        best: "b",
        worst: "c",
        set: ["b", "c", "d"],
    };

    async function save({
        resultId,
        comparisons,
    }: {
        resultId: number;
        comparisons: MaxDiffComparison[];
    }) {
        await db.transaction(async (tx) => {
            // Same lock order as saveMaxdiffResult's upsert.
            await tx
                .update(maxdiffResultTable)
                .set({ comparisons })
                .where(eq(maxdiffResultTable.id, resultId));
            await syncMaxdiffComparisons({
                tx,
                resultId,
                comparisons,
                now: new Date(),
            });
        });
    }

    async function rows(resultId: number) {
        return await db
            .select()
            .from(maxdiffComparisonTable)
            .where(eq(maxdiffComparisonTable.maxdiffResultId, resultId))
            .orderBy(maxdiffComparisonTable.id);
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
        const comparisons: MaxDiffComparison[] = [];
        for (let index = 0; index < 20; index++) {
            comparisons.push(index % 2 === 0 ? first : second);
            await save({ resultId, comparisons });
        }
        expect(await rows(resultId)).toHaveLength(20);
        const active = await db
            .select()
            .from(maxdiffComparisonTable)
            .where(
                and(
                    eq(maxdiffComparisonTable.maxdiffResultId, resultId),
                    isNull(maxdiffComparisonTable.deletedAt),
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
            .select({ conversationId: maxdiffResultTable.conversationId })
            .from(maxdiffResultTable)
            .where(eq(maxdiffResultTable.id, resultId));
        const counts = await buildMaxdiffAppearanceCountQuery({
            db,
            conversationId: result.conversationId,
        });
        expect(
            Object.fromEntries(
                counts.map((row) => [row.itemSlugId, row.appearanceCount]),
            ),
        ).toEqual({ a: 1, b: 2, c: 2, d: 2 });
    });

    it("returns stored personal display scores without stretching their range", async () => {
        const { resultId } = await fixture();
        await save({ resultId, comparisons: [first] });
        const [result] = await db
            .select({
                conversationId: maxdiffResultTable.conversationId,
                userId: maxdiffResultTable.participantId,
            })
            .from(maxdiffResultTable)
            .where(eq(maxdiffResultTable.id, resultId));
        await db.insert(maxdiffUserEntityScoreTable).values([
            {
                maxdiffResultId: resultId,
                entitySlugId: "a",
                score: 0.18,
                displayScore: 0.5886,
                uncertaintyLeft: 1,
                uncertaintyRight: 1,
            },
            {
                maxdiffResultId: resultId,
                entitySlugId: "d",
                score: -0.135,
                displayScore: 0.4331,
                uncertaintyLeft: 1,
                uncertaintyRight: 1,
            },
        ]);
        const loaded = await loadMaxdiffResult({ db, ...result });
        expect(loaded.perUserScores).toHaveLength(2);
        expect(loaded.perUserScores?.[0].score).toBeCloseTo(0.5886, 5);
        expect(loaded.perUserScores?.[1].score).toBeCloseTo(0.4331, 5);
    });

    async function scoringFixture() {
        const { resultId, configId } = await fixture();
        const [owner] = await db
            .select({
                conversationId: maxdiffResultTable.conversationId,
                userId: maxdiffResultTable.participantId,
            })
            .from(maxdiffResultTable)
            .where(eq(maxdiffResultTable.id, resultId));
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
                score: index === 0 ? 1 : 0,
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
        const [spec] = await db
            .select({ id: opinionGroupSpecTable.id })
            .from(opinionGroupSpecTable)
            .where(eq(opinionGroupSpecTable.key, "default"))
            .limit(1);
        await db.insert(conversationViewSnapshotTable).values({
            conversationId: owner.conversationId,
            conversationContentId: content.id,
            opinionGroupSpecId: spec.id,
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
            await getMaxdiffResults(request),
            await getMaxdiffResults({
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
        const legacy = await getMaxdiffResults({
            ...request,
            rankingStatsSnapshotId: snapshot.id,
        });
        expect(legacy.rankings.map((item) => item.score)).toEqual([null, null]);
        expect(legacy.rankings.map((item) => item.avgRank)).toEqual([1, 2]);
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
        const completed = await getMaxdiffResults({
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

    it("preserves live raw-score ranks and counts when display values are missing", async () => {
        const { request, scoring } = await scoringFixture();
        await db
            .update(rankingScoreEntityTable)
            .set({ displayScore: null })
            .where(eq(rankingScoreEntityTable.rankingScoreId, scoring.id));
        const results = await getMaxdiffResults(request);
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
        const results = await getMaxdiffResults({
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
        const results = await getMaxdiffResults(request);
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
