import {
    conversationTable,
    maxdiffResultTable,
    rankingItemTable,
    rankingItemContentTable,
    rankingItemExternalSourceTable,
    rankingConversationConfigTable,
    rankingConversationStatsCheckpointTable,
    rankingConversationStatsItemTable,
    rankingConversationStatsSnapshotTable,
    rankingScoreTable,
    maxdiffComparisonTable,
    maxdiffUserEntityScoreTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";

import {
    eq,
    and,
    desc,
    exists,
    inArray,
    isNotNull,
    isNull,
    sql,
} from "drizzle-orm";
import {
    Dto,
    type MaxDiffResultsResponse,
    type MaxDiffResultItem,
    type RankingStatsCheckpointsResponse,
} from "@/shared/types/dto.js";
import type { RankingStatsCheckpointReason } from "@/shared/types/dto.js";
import { z } from "zod";
import {
    zodMaxdiffComparison,
    zodSolidagoEntityScore,
    type MaxDiffComparison,
    type MaxdiffLifecycleStatus,
} from "@/shared/types/zod.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { log } from "@/app.js";
import {
    buildRankingItemDisplayContentByContentId,
    type RankingItemDisplayPreferences,
} from "./rankingItemDisplay.js";
import { getPrimaryDatabase, hasPrimaryDatabase } from "@/shared-backend/db.js";

// --- Types ---

export interface RankedItem {
    itemSlugId: string;
    avgRank: number;
    score: number;
    participantCount: number;
}

interface ScoredEntry {
    score: number;
}

export function normalizeScores<T extends ScoredEntry>(items: T[]): T[] {
    if (items.length === 0) {
        return items;
    }

    const scoreValues = items.map((item) => item.score);
    const minScore = Math.min(...scoreValues);
    const maxScore = Math.max(...scoreValues);
    const scoreRange = maxScore - minScore;

    if (scoreRange < 1e-6) {
        return items.map((item) => ({
            ...item,
            score: 0.5,
        }));
    }

    return items.map((item) => ({
        ...item,
        score: (item.score - minScore) / scoreRange,
    }));
}

// --- Global Uncertainty (for routing) ---

/**
 * Compute global uncertainty for all active items in a conversation.
 * Uses comparison-count heuristic: uncertainty = 1/sqrt(count + 1).
 * Cheap — no BT MLE, just counts how many comparisons reference each item.
 */
export async function computeGlobalUncertainty({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<{ items: string[]; uncertainty: Map<string, number> }> {
    const activeItems = await db
        .select({ slugId: rankingItemTable.slugId })
        .from(rankingItemTable)
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                isNotNull(rankingItemTable.currentContentId),
                inArray(rankingItemTable.lifecycleStatus, [
                    "active",
                    "in_progress",
                ]),
            ),
        );

    const items = activeItems.map((r) => r.slugId);
    if (items.length < 2) {
        return { items, uncertainty: new Map() };
    }

    // Count item appearances via SQL aggregate (avoids loading full JSONB to app)
    const countRows = await db.execute<{
        item_text: string;
        appearance_count: string;
    }>(sql`
        SELECT item_text, COUNT(*)::text AS appearance_count
        FROM ${maxdiffResultTable},
             jsonb_array_elements(${maxdiffResultTable.comparisons}) AS comp,
             jsonb_array_elements_text(comp -> 'set') AS item_text
        WHERE ${maxdiffResultTable.conversationId} = ${conversationId}
        GROUP BY item_text
    `);

    const itemSet = new Set(items);
    const uncertainty = new Map<string, number>();
    // Default: all items start with max uncertainty (never compared)
    for (const item of items) {
        uncertainty.set(item, 1);
    }
    for (const row of countRows) {
        if (itemSet.has(row.item_text)) {
            const count = Number(row.appearance_count);
            uncertainty.set(row.item_text, 1 / Math.sqrt(count + 1));
        }
    }

    return { items, uncertainty };
}

// --- Save / Upsert ---

interface SaveMaxdiffResultProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
    ranking: string[] | null;
    comparisons: MaxDiffComparison[];
    isComplete: boolean;
    valkey?: Valkey;
}

export async function saveMaxdiffResult({
    db,
    conversationSlugId,
    userId,
    ranking,
    comparisons,
    isComplete,
    valkey,
}: SaveMaxdiffResultProps): Promise<{
    conversationId: number;
    items: string[];
    uncertainty: Map<string, number>;
}> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    // Verify this is a maxdiff conversation and check org restriction
    const conversationTypeResult = await db
        .select({
            conversationType: conversationTable.conversationType,
            rankingMode: rankingConversationConfigTable.rankingMode,
        })
        .from(conversationTable)
        .leftJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(eq(conversationTable.id, conversationId));

    const conversation = conversationTypeResult.at(0);
    if (
        conversation?.conversationType !== "ranking" ||
        conversation.rankingMode !== "bws"
    ) {
        throw httpErrors.badRequest(
            "This conversation is not a MaxDiff conversation",
        );
    }

    // Synchronous DB upsert — user state is immediately consistent.
    // Counter update is handled by the scoring worker (~2s delay);
    // the frontend optimistically updates counts for the current user.
    const now = new Date();
    now.setMilliseconds(0);

    // Transaction: upsert JSONB + soft-delete/insert normalized comparisons atomically.
    const { items, uncertainty } = await db.transaction(async (tx) => {
        const [result] = await tx
            .insert(maxdiffResultTable)
            .values({
                participantId: userId,
                conversationId,
                ranking,
                comparisons,
                isComplete,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: [
                    maxdiffResultTable.participantId,
                    maxdiffResultTable.conversationId,
                ],
                set: {
                    ranking,
                    comparisons,
                    isComplete,
                    updatedAt: now,
                },
            })
            .returning({ id: maxdiffResultTable.id });

        // Dual-write: soft-delete old normalized comparisons, insert new ones
        await tx
            .update(maxdiffComparisonTable)
            .set({ deletedAt: now })
            .where(
                and(
                    eq(maxdiffComparisonTable.maxdiffResultId, result.id),
                    isNull(maxdiffComparisonTable.deletedAt),
                ),
            );
        if (comparisons.length > 0) {
            await tx.insert(maxdiffComparisonTable).values(
                comparisons.map((comp, idx) => ({
                    maxdiffResultId: result.id,
                    position: idx,
                    bestSlugId: comp.best,
                    worstSlugId: comp.worst,
                    candidateSet: comp.set,
                })),
            );
        }

        return await computeGlobalUncertainty({
            db: tx,
            conversationId,
        });
    });

    // Mark conversation as dirty for the scoring worker to pick up.
    // Member = "convId:slugId" (slugId for worker logging without extra DB query).
    // Score = comparison count (proxy for Solidago runtime).
    if (valkey !== undefined) {
        const member = `${String(conversationId)}:${conversationSlugId}`;
        valkey
            .zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, {
                [member]: comparisons.length,
            })
            .catch((error: unknown) => {
                log.error(
                    error,
                    `[MaxDiff] Failed to ZADD scoring:dirty:solidago for ${member}`,
                );
            });
    }

    return { conversationId, items, uncertainty };
}

// --- Load ---

interface LoadMaxdiffResultProps {
    db: PostgresDatabase;
    conversationId: number;
    userId: string;
}

interface PerUserScore {
    entitySlugId: string;
    score: number;
}

interface LoadMaxdiffResultData {
    ranking: string[] | null;
    comparisons: MaxDiffComparison[] | null;
    isComplete: boolean;
    perUserScores: PerUserScore[] | null;
}

export async function loadMaxdiffResult({
    db,
    conversationId,
    userId,
}: LoadMaxdiffResultProps): Promise<LoadMaxdiffResultData> {
    const results = await db
        .select({
            id: maxdiffResultTable.id,
            ranking: maxdiffResultTable.ranking,
            comparisons: maxdiffResultTable.comparisons,
            isComplete: maxdiffResultTable.isComplete,
        })
        .from(maxdiffResultTable)
        .where(
            and(
                eq(maxdiffResultTable.participantId, userId),
                eq(maxdiffResultTable.conversationId, conversationId),
            ),
        );

    if (results.length === 0) {
        return {
            ranking: null,
            comparisons: null,
            isComplete: false,
            perUserScores: null,
        };
    }

    const row = results[0];
    // Parse JSONB columns through zod for type safety
    const comparisonsResult = z
        .array(zodMaxdiffComparison)
        .parse(row.comparisons);
    const ranking =
        row.ranking !== null ? z.array(z.string()).parse(row.ranking) : null;

    // Fetch per-user Solidago scores (written by scoring worker)
    const scoreRows = await db
        .select({
            entitySlugId: maxdiffUserEntityScoreTable.entitySlugId,
            score: maxdiffUserEntityScoreTable.score,
        })
        .from(maxdiffUserEntityScoreTable)
        .where(eq(maxdiffUserEntityScoreTable.maxdiffResultId, row.id))
        .orderBy(desc(maxdiffUserEntityScoreTable.score));

    return {
        ranking,
        comparisons: comparisonsResult,
        isComplete: row.isComplete,
        perUserScores: scoreRows.length > 0 ? normalizeScores(scoreRows) : null,
    };
}

// --- Aggregated Results ---

type LifecycleFilter = MaxdiffLifecycleStatus | "all";

async function resolveRankingReadDatabase({
    db,
    conversationId,
    requestedRankingStatsSnapshotId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    requestedRankingStatsSnapshotId: number | undefined;
}): Promise<PostgresDatabase> {
    if (
        requestedRankingStatsSnapshotId === undefined ||
        !hasPrimaryDatabase(db)
    ) {
        return db;
    }

    const latestReplicaRows = await db
        .select({ id: rankingConversationStatsSnapshotTable.id })
        .from(rankingConversationStatsSnapshotTable)
        .where(
            eq(
                rankingConversationStatsSnapshotTable.conversationId,
                conversationId,
            ),
        )
        .orderBy(
            desc(rankingConversationStatsSnapshotTable.createdAt),
            desc(rankingConversationStatsSnapshotTable.id),
        )
        .limit(1);
    if (
        (latestReplicaRows.at(0)?.id ?? 0) >=
        requestedRankingStatsSnapshotId
    ) {
        return db;
    }

    const primaryDb = getPrimaryDatabase(db);
    const latestPrimaryRows = await primaryDb
        .select({ id: rankingConversationStatsSnapshotTable.id })
        .from(rankingConversationStatsSnapshotTable)
        .where(
            eq(
                rankingConversationStatsSnapshotTable.conversationId,
                conversationId,
            ),
        )
        .orderBy(
            desc(rankingConversationStatsSnapshotTable.createdAt),
            desc(rankingConversationStatsSnapshotTable.id),
        )
        .limit(1);
    if (
        (latestPrimaryRows.at(0)?.id ?? 0) < requestedRankingStatsSnapshotId
    ) {
        throw httpErrors.notFound("Ranking snapshot not found");
    }
    return primaryDb;
}

interface GetMaxdiffResultsProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    displayPreferences: RankingItemDisplayPreferences;
    lifecycleFilter?: LifecycleFilter;
    rankingStatsSnapshotId?: number;
    requestedRankingStatsSnapshotId?: number;
    valkey?: Valkey;
}

async function getHistoricalMaxdiffResults({
    db,
    conversationId,
    conversationSlugId,
    rankingStatsSnapshotId,
    displayPreferences,
}: {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
    rankingStatsSnapshotId: number;
    displayPreferences: RankingItemDisplayPreferences;
}): Promise<MaxDiffResultsResponse> {
    const loadPublishedSnapshot = async (queryDb: PostgresDatabase) => {
        const earliestSnapshotId = queryDb
            .select({ id: rankingConversationStatsSnapshotTable.id })
            .from(rankingConversationStatsSnapshotTable)
            .where(
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    conversationId,
                ),
            )
            .orderBy(
                rankingConversationStatsSnapshotTable.createdAt,
                rankingConversationStatsSnapshotTable.id,
            )
            .limit(1);
        const snapshotRows = await queryDb
            .select({
                id: rankingConversationStatsSnapshotTable.id,
                hasCheckpoint: exists(
                    queryDb
                        .select({ id: rankingConversationStatsCheckpointTable.id })
                        .from(rankingConversationStatsCheckpointTable)
                        .where(
                            eq(
                                rankingConversationStatsCheckpointTable.statsSnapshotId,
                                rankingConversationStatsSnapshotTable.id,
                            ),
                        ),
                ),
                isEarliest: sql<boolean>`${rankingConversationStatsSnapshotTable.id} = (${earliestSnapshotId})`,
            })
            .from(rankingConversationStatsSnapshotTable)
            .where(
                and(
                    eq(
                        rankingConversationStatsSnapshotTable.id,
                        rankingStatsSnapshotId,
                    ),
                    eq(
                        rankingConversationStatsSnapshotTable.conversationId,
                        conversationId,
                    ),
                ),
            )
            .limit(1);
        const snapshot = snapshotRows.at(0);
        return {
            queryDb,
            isPublished:
                snapshot !== undefined &&
                [snapshot.hasCheckpoint, snapshot.isEarliest].includes(true),
        };
    };
    let snapshotAttempt = await loadPublishedSnapshot(db);
    if (!snapshotAttempt.isPublished && hasPrimaryDatabase(db)) {
        snapshotAttempt = await loadPublishedSnapshot(getPrimaryDatabase(db));
    }
    if (!snapshotAttempt.isPublished) {
        throw httpErrors.notFound("Ranking checkpoint not found");
    }

    const itemRows = await snapshotAttempt.queryDb
        .select({
            itemSlugId: rankingItemTable.slugId,
            contentId: rankingItemContentTable.id,
            publicId: rankingItemContentTable.publicId,
            title: rankingItemContentTable.title,
            body: rankingItemContentTable.body,
            sourceLanguageCode: rankingItemContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                rankingItemContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                rankingItemContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTable.sourceLanguageConfidence,
            lifecycleStatus: rankingConversationStatsItemTable.lifecycleStatus,
            score: rankingConversationStatsItemTable.score,
            rank: rankingConversationStatsItemTable.rank,
            participantCount:
                rankingConversationStatsItemTable.participantCount,
            externalUrl: rankingConversationStatsItemTable.externalUrl,
        })
        .from(rankingConversationStatsItemTable)
        .innerJoin(
            rankingItemContentTable,
            eq(
                rankingItemContentTable.id,
                rankingConversationStatsItemTable.rankingItemContentId,
            ),
        )
        .innerJoin(
            rankingItemTable,
            eq(
                rankingItemTable.id,
                rankingConversationStatsItemTable.rankingItemId,
            ),
        )
        .where(
            eq(
                rankingConversationStatsItemTable.statsSnapshotId,
                rankingStatsSnapshotId,
            ),
        );
    const sources = itemRows.map((row) => ({
        conversationSlugId,
        itemSlugId: row.itemSlugId,
        contentId: row.contentId,
        publicId: row.publicId,
        title: row.title,
        bodyHtml: row.body,
        sourceLanguageCode: row.sourceLanguageCode,
        sourceRawLanguageCode: row.sourceRawLanguageCode,
        sourceLanguageProvider: row.sourceLanguageProvider,
        sourceLanguageConfidence: row.sourceLanguageConfidence,
    }));
    const displayContentByContentId =
        await buildRankingItemDisplayContentByContentId({
            db: snapshotAttempt.queryDb,
            sources,
            preferences: displayPreferences,
        });
    const rankings = itemRows
        .map((row): MaxDiffResultItem => {
            const displayContent = displayContentByContentId.get(row.contentId);
            if (displayContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to build historical ranking item display content",
                );
            }
            return {
                itemSlugId: row.itemSlugId,
                displayContent,
                avgRank: row.rank,
                score: row.score,
                participantCount: row.participantCount,
                lifecycleStatus: row.lifecycleStatus,
                externalUrl: row.externalUrl,
            };
        })
        .sort((left, right) => {
            if (left.avgRank === null && right.avgRank === null) {
                return left.itemSlugId.localeCompare(right.itemSlugId);
            }
            if (left.avgRank === null) return 1;
            if (right.avgRank === null) return -1;
            const rankDifference = left.avgRank - right.avgRank;
            return rankDifference !== 0
                ? rankDifference
                : left.itemSlugId.localeCompare(right.itemSlugId);
        });
    return { rankings };
}

export async function getMaxdiffResults({
    db,
    conversationSlugId,
    displayPreferences,
    lifecycleFilter = "active",
    rankingStatsSnapshotId,
    requestedRankingStatsSnapshotId,
    valkey,
}: GetMaxdiffResultsProps): Promise<MaxDiffResultsResponse> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    if (rankingStatsSnapshotId !== undefined) {
        if (requestedRankingStatsSnapshotId !== undefined) {
            throw httpErrors.badRequest(
                "Historical and live ranking snapshot selectors cannot be combined",
            );
        }
        if (lifecycleFilter !== "active") {
            throw httpErrors.badRequest(
                "Ranking checkpoints cannot be combined with a lifecycle filter",
            );
        }
        return await getHistoricalMaxdiffResults({
            db,
            conversationId,
            conversationSlugId,
            rankingStatsSnapshotId,
            displayPreferences,
        });
    }

    const readDb = await resolveRankingReadDatabase({
        db,
        conversationId,
        requestedRankingStatsSnapshotId,
    });

    // Fetch all results (including partial) for this conversation
    const allResults = await readDb
        .select({
            id: maxdiffResultTable.id,
        })
        .from(maxdiffResultTable)
        .where(eq(maxdiffResultTable.conversationId, conversationId));

    // Determine which lifecycle statuses to include
    const activeStatuses: MaxdiffLifecycleStatus[] =
        lifecycleFilter === "all"
            ? ["active", "completed", "in_progress", "canceled"]
            : lifecycleFilter === "active"
              ? ["active", "in_progress"]
              : [lifecycleFilter];

    // Fetch items with their content and optional external source URL
    const itemRows = await readDb
        .select({
            slugId: rankingItemTable.slugId,
            contentId: rankingItemContentTable.id,
            publicId: rankingItemContentTable.publicId,
            title: rankingItemContentTable.title,
            body: rankingItemContentTable.body,
            sourceLanguageCode: rankingItemContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                rankingItemContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                rankingItemContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTable.sourceLanguageConfidence,
            lifecycleStatus: rankingItemTable.lifecycleStatus,
            snapshotScore: rankingItemTable.snapshotScore,
            snapshotRank: rankingItemTable.snapshotRank,
            snapshotParticipantCount: rankingItemTable.snapshotParticipantCount,
            externalUrl: rankingItemExternalSourceTable.externalUrl,
        })
        .from(rankingItemTable)
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, rankingItemTable.currentContentId),
        )
        .leftJoin(
            rankingItemExternalSourceTable,
            eq(
                rankingItemExternalSourceTable.rankingItemId,
                rankingItemTable.id,
            ),
        )
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                isNotNull(rankingItemTable.currentContentId),
                inArray(rankingItemTable.lifecycleStatus, activeStatuses),
            ),
        );

    const items = itemRows.map((r) => r.slugId);
    const itemSlugIds = new Set(items);
    const sources = itemRows.map((r) => ({
        conversationSlugId,
        itemSlugId: r.slugId,
        contentId: r.contentId,
        publicId: r.publicId,
        title: r.title,
        bodyHtml: r.body,
        sourceLanguageCode: r.sourceLanguageCode,
        sourceRawLanguageCode: r.sourceRawLanguageCode,
        sourceLanguageProvider: r.sourceLanguageProvider,
        sourceLanguageConfidence: r.sourceLanguageConfidence,
    }));
    const displayContentByContentId =
        await buildRankingItemDisplayContentByContentId({
            db: readDb,
            sources,
            preferences: displayPreferences,
        });
    const displayContentBySlugId = new Map(
        itemRows.map((r) => {
            const displayContent = displayContentByContentId.get(r.contentId);
            if (displayContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to build ranking item display content",
                );
            }
            return [r.slugId, displayContent] as const;
        }),
    );

    // For completed/canceled items, return snapshot scores if available
    if (lifecycleFilter === "completed" || lifecycleFilter === "canceled") {
        const rankings: MaxDiffResultItem[] = itemRows
            .map((r) => {
                const displayContent = displayContentBySlugId.get(r.slugId);
                if (displayContent === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to locate ranking item display content",
                    );
                }
                return {
                    itemSlugId: r.slugId,
                    displayContent,
                    avgRank: 0, // not meaningful for snapshots
                    score: r.snapshotScore ?? 0,
                    participantCount: r.snapshotParticipantCount ?? 0,
                    lifecycleStatus: r.lifecycleStatus,
                    externalUrl: r.externalUrl,
                };
            })
            .sort((a, b) => b.score - a.score)
            .map((r, idx) => ({
                ...r,
                avgRank: idx + 1, // use display rank
            }));
        return { rankings };
    }

    // For active/all: read pre-computed Solidago scores from ranking_score table.
    // If no cache exists, requeue work for the scoring worker and return empty results.
    const currentScoreId = await (async (): Promise<number | null> => {
        const cachedScoreRows = await readDb
            .select({
                currentRankingScoreId:
                    rankingConversationConfigTable.currentRankingScoreId,
            })
            .from(conversationTable)
            .innerJoin(
                rankingConversationConfigTable,
                eq(
                    rankingConversationConfigTable.id,
                    conversationTable.rankingConfigId,
                ),
            )
            .where(eq(conversationTable.id, conversationId));
        return cachedScoreRows.at(0)?.currentRankingScoreId ?? null;
    })();

    let scored: RankedItem[];

    if (currentScoreId !== null) {
        // Read from ranking_score table (Solidago pre-computed)
        const scoreRows = await readDb
            .select({
                scores: rankingScoreTable.scores,
                participantCounts: rankingScoreTable.participantCounts,
            })
            .from(rankingScoreTable)
            .where(eq(rankingScoreTable.id, currentScoreId));

        if (scoreRows.length > 0) {
            const cachedScores = z
                .array(zodSolidagoEntityScore)
                .parse(scoreRows[0].scores);
            const cachedParticipantCounts = z
                .record(z.string(), z.number())
                .parse(scoreRows[0].participantCounts);

            scored = cachedScores
                .filter((s) => itemSlugIds.has(s.entityId))
                .map((s, idx) => ({
                    itemSlugId: s.entityId,
                    avgRank: idx + 1,
                    score: s.score,
                    participantCount: cachedParticipantCounts[s.entityId] ?? 0,
                }));
            scored = normalizeScores(scored);
        } else {
            scored = [];
        }
    } else {
        scored = [];
    }

    // No cached scores yet: ensure the conversation is in the dirty set
    // so the scoring worker picks it up. Frontend handles empty results.
    if (
        scored.length === 0 &&
        items.length >= 2 &&
        allResults.length > 0 &&
        valkey !== undefined
    ) {
        const member = `${String(conversationId)}:${conversationSlugId}`;
        valkey
            .zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, {
                [member]: allResults.length,
            })
            .catch((error: unknown) => {
                log.error(
                    error,
                    `[MaxDiff] Failed to ZADD for cache-miss re-queue of ${member}`,
                );
            });
    }

    const contentMap = new Map(
        itemRows.map((r) => [
            r.slugId,
            {
                displayContent: displayContentBySlugId.get(r.slugId),
                lifecycleStatus: r.lifecycleStatus,
                externalUrl: r.externalUrl,
            },
        ]),
    );

    const scoredSlugIds = new Set(scored.map((s) => s.itemSlugId));

    const rankings: MaxDiffResultItem[] = scored.map((s) => {
        const content = contentMap.get(s.itemSlugId);
        if (content?.displayContent === undefined) {
            throw httpErrors.internalServerError(
                "Failed to locate ranking item display content",
            );
        }
        return {
            itemSlugId: s.itemSlugId,
            displayContent: content.displayContent,
            avgRank: s.avgRank,
            score: s.score,
            participantCount: s.participantCount,
            lifecycleStatus: content.lifecycleStatus,
            externalUrl: content.externalUrl,
        };
    });

    // Append unscored active items at the end (never appeared in comparisons)
    for (const slugId of items) {
        if (scoredSlugIds.has(slugId)) continue;
        const content = contentMap.get(slugId);
        if (content?.displayContent === undefined) {
            throw httpErrors.internalServerError(
                "Failed to locate ranking item display content",
            );
        }
        rankings.push({
            itemSlugId: slugId,
            displayContent: content.displayContent,
            avgRank: null,
            score: null,
            participantCount: 0,
            lifecycleStatus: content.lifecycleStatus,
            externalUrl: content.externalUrl,
        });
    }

    return { rankings };
}

export async function fetchRankingStatsCheckpoints({
    db,
    conversationSlugId,
    requestedRankingStatsSnapshotId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    requestedRankingStatsSnapshotId: number | undefined;
}): Promise<RankingStatsCheckpointsResponse> {
    const metadata = await useCommonPost().getPostMetadataFromSlugId({
        db,
        conversationSlugId,
    });
    if (
        metadata.conversationType !== "ranking" ||
        metadata.rankingMode !== "bws"
    ) {
        throw httpErrors.badRequest(
            "This conversation is not a BWS conversation",
        );
    }
    const readDb = await resolveRankingReadDatabase({
        db,
        conversationId: metadata.id,
        requestedRankingStatsSnapshotId,
    });
    const earliestRows = await readDb
        .select()
        .from(rankingConversationStatsSnapshotTable)
        .where(
            eq(
                rankingConversationStatsSnapshotTable.conversationId,
                metadata.id,
            ),
        )
        .orderBy(
            rankingConversationStatsSnapshotTable.createdAt,
            rankingConversationStatsSnapshotTable.id,
        )
        .limit(1);
    const checkpointRows = await readDb
        .select({
            snapshot: rankingConversationStatsSnapshotTable,
            reason: rankingConversationStatsCheckpointTable.reason,
            participantMilestone:
                rankingConversationStatsCheckpointTable.participantMilestone,
            voteMilestone:
                rankingConversationStatsCheckpointTable.voteMilestone,
        })
        .from(rankingConversationStatsCheckpointTable)
        .innerJoin(
            rankingConversationStatsSnapshotTable,
            eq(
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsCheckpointTable.statsSnapshotId,
            ),
        )
        .where(
            eq(
                rankingConversationStatsSnapshotTable.conversationId,
                metadata.id,
            ),
        )
        .orderBy(
            rankingConversationStatsSnapshotTable.createdAt,
            rankingConversationStatsSnapshotTable.id,
            rankingConversationStatsCheckpointTable.id,
        );

    const checkpointsById = new Map<
        number,
        RankingStatsCheckpointsResponse[number]
    >();
    const earliest = earliestRows.at(0);
    if (earliest !== undefined) {
        checkpointsById.set(earliest.id, {
            rankingStatsSnapshotId: earliest.id,
            createdAt: earliest.createdAt,
            itemCount: earliest.itemCount,
            voteCount: earliest.voteCount,
            participantCount: earliest.participantCount,
            totalItemCount: earliest.totalItemCount,
            totalVoteCount: earliest.totalVoteCount,
            totalParticipantCount: earliest.totalParticipantCount,
            isClosed: earliest.isClosed,
            reasons: [],
        });
    }
    for (const row of checkpointRows) {
        const checkpoint = checkpointsById.get(row.snapshot.id) ?? {
            rankingStatsSnapshotId: row.snapshot.id,
            createdAt: row.snapshot.createdAt,
            itemCount: row.snapshot.itemCount,
            voteCount: row.snapshot.voteCount,
            participantCount: row.snapshot.participantCount,
            totalItemCount: row.snapshot.totalItemCount,
            totalVoteCount: row.snapshot.totalVoteCount,
            totalParticipantCount: row.snapshot.totalParticipantCount,
            isClosed: row.snapshot.isClosed,
            reasons: [],
        };
        let reason: RankingStatsCheckpointReason;
        switch (row.reason) {
            case "major_participation_milestone":
                reason = Dto.rankingStatsCheckpointReason.parse({
                    reason: row.reason,
                    participantCount: row.snapshot.participantCount,
                    participantMilestone: row.participantMilestone,
                });
                break;
            case "major_vote_milestone":
                reason = Dto.rankingStatsCheckpointReason.parse({
                    reason: row.reason,
                    voteCount: row.snapshot.voteCount,
                    voteMilestone: row.voteMilestone,
                });
                break;
            case "conversation_closed":
                reason = { reason: row.reason };
                break;
        }
        checkpoint.reasons.push(reason);
        checkpointsById.set(row.snapshot.id, checkpoint);
    }
    const checkpoints = Dto.rankingStatsCheckpointsResponse.parse(
        Array.from(checkpointsById.values()).sort(
            (a, b) =>
                new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime() ||
                a.rankingStatsSnapshotId - b.rankingStatsSnapshotId,
        ),
    );
    return checkpoints;
}

// --- Snapshot scores for lifecycle transitions ---

interface ComputeSnapshotProps {
    db: PostgresDatabase;
    conversationId: number;
    itemSlugId: string;
}

export async function lockRankingScoringConfig({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<void> {
    // Lifecycle snapshots are read-for-write and must serialize with worker publication.
    await db
        .select({ id: rankingConversationConfigTable.id })
        .from(conversationTable)
        .innerJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(eq(conversationTable.id, conversationId))
        .for("update", { of: rankingConversationConfigTable });
}

/**
 * Read the current score and rank for a specific item from the
 * pre-computed ranking_score table. Returns snapshot values to freeze
 * on the item row during lifecycle transitions.
 */
export async function computeItemSnapshot({
    db,
    conversationId,
    itemSlugId,
}: ComputeSnapshotProps): Promise<{
    snapshotScore: number | null;
    snapshotRank: number | null;
    snapshotParticipantCount: number | null;
}> {
    // Read latest scores from ranking_score table
    const convRows = await db
        .select({
            currentRankingScoreId:
                rankingConversationConfigTable.currentRankingScoreId,
        })
        .from(conversationTable)
        .innerJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(eq(conversationTable.id, conversationId));

    const currentScoreId =
        convRows.length > 0 ? convRows[0].currentRankingScoreId : null;

    if (currentScoreId === null) {
        return {
            snapshotScore: null,
            snapshotRank: null,
            snapshotParticipantCount: null,
        };
    }

    const scoreRows = await db
        .select({
            scores: rankingScoreTable.scores,
            participantCounts: rankingScoreTable.participantCounts,
        })
        .from(rankingScoreTable)
        .where(eq(rankingScoreTable.id, currentScoreId));

    if (scoreRows.length === 0) {
        return {
            snapshotScore: null,
            snapshotRank: null,
            snapshotParticipantCount: null,
        };
    }

    const cachedScores = z
        .array(zodSolidagoEntityScore)
        .parse(scoreRows[0].scores);
    const cachedParticipantCounts = z
        .record(z.string(), z.number())
        .parse(scoreRows[0].participantCounts);

    const itemScore = cachedScores.find((s) => s.entityId === itemSlugId);
    if (itemScore === undefined) {
        return {
            snapshotScore: null,
            snapshotRank: null,
            snapshotParticipantCount: null,
        };
    }

    // Rank = position in sorted scores (1-based)
    const rank = cachedScores.filter((s) => s.score >= itemScore.score).length;

    const normalizedScores = normalizeScores(
        cachedScores.map((score) => ({
            entityId: score.entityId,
            score: score.score,
        })),
    );
    const normalizedItemScore = normalizedScores.find(
        (score) => score.entityId === itemSlugId,
    );

    return {
        snapshotScore: normalizedItemScore?.score ?? null,
        snapshotRank: rank,
        snapshotParticipantCount: cachedParticipantCounts[itemSlugId] ?? 0,
    };
}
