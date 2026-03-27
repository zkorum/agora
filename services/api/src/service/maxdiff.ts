import {
    conversationTable,
    maxdiffResultTable,
    maxdiffItemTable,
    maxdiffItemContentTable,
    maxdiffItemExternalSourceTable,
    rankingScoreTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";

import { eq, and, inArray, isNotNull, sql } from "drizzle-orm";
import type {
    MaxDiffLoadResponse,
    MaxDiffResultsResponse,
    MaxDiffResultItem,
} from "@/shared/types/dto.js";
import { z } from "zod";
import {
    zodMaxdiffComparison,
    zodSolidagoEntityScore,
    type MaxDiffComparison,
    type MaxdiffLifecycleStatus,
} from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import type { RankingComparisonBuffer } from "./rankingComparisonBuffer.js";
import { parseResultRows } from "@/utils/maxdiffParsing.js";

// --- Types ---

export interface RankedItem {
    itemSlugId: string;
    avgRank: number;
    score: number;
    participantCount: number;
}

// parseResultRows moved to @/utils/maxdiffParsing.ts (pure function, no DB deps)
export { parseResultRows } from "@/utils/maxdiffParsing.js";

// --- Global Uncertainty (for routing) ---

/**
 * Compute global uncertainty for all active items in a conversation.
 * Uses comparison-count heuristic: uncertainty = 1/sqrt(count + 1).
 * Cheap — no BT MLE, just counts how many comparisons reference each item.
 */
export async function computeGlobalUncertainty({
    db,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
}): Promise<{ items: string[]; uncertainty: Map<string, number> }> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    const activeItems = await db
        .select({ slugId: maxdiffItemTable.slugId })
        .from(maxdiffItemTable)
        .where(
            and(
                eq(maxdiffItemTable.conversationId, conversationId),
                isNotNull(maxdiffItemTable.currentContentId),
                inArray(maxdiffItemTable.lifecycleStatus, [
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
    isMaxdiffOrgOnly: boolean;
    rankingComparisonBuffer: RankingComparisonBuffer;
}

export async function saveMaxdiffResult({
    db,
    conversationSlugId,
    userId,
    ranking,
    comparisons,
    isComplete,
    isMaxdiffOrgOnly,
    rankingComparisonBuffer,
}: SaveMaxdiffResultProps): Promise<void> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    // Verify this is a maxdiff conversation and check org restriction
    const conversationTypeResult = await db
        .select({
            conversationType: conversationTable.conversationType,
            organizationId: conversationTable.organizationId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    if (conversationTypeResult[0]?.conversationType !== "maxdiff") {
        throw httpErrors.badRequest(
            "This conversation is not a MaxDiff conversation",
        );
    }

    if (
        isMaxdiffOrgOnly &&
        conversationTypeResult[0].organizationId === null
    ) {
        throw httpErrors.forbidden(
            "MaxDiff feature is restricted to organization conversations",
        );
    }

    // Push to Valkey buffer (flushed periodically to DB + python-bridge)
    rankingComparisonBuffer.add({
        comparison: {
            userId,
            conversationId,
            conversationSlugId,
            ranking,
            comparisons,
            isComplete,
            timestamp: new Date(),
        },
    });
}

// --- Load ---

interface LoadMaxdiffResultProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

export async function loadMaxdiffResult({
    db,
    conversationSlugId,
    userId,
}: LoadMaxdiffResultProps): Promise<MaxDiffLoadResponse> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    const results = await db
        .select({
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
        };
    }

    const row = results[0];
    // Parse JSONB columns through zod for type safety
    const comparisonsResult = z
        .array(zodMaxdiffComparison)
        .parse(row.comparisons);
    const ranking =
        row.ranking !== null
            ? z.array(z.string()).parse(row.ranking)
            : null;

    return {
        ranking,
        comparisons: comparisonsResult,
        isComplete: row.isComplete,
    };
}

// --- Aggregated Results ---

type LifecycleFilter = MaxdiffLifecycleStatus | "all";

interface GetMaxdiffResultsProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    lifecycleFilter?: LifecycleFilter;
    axiosPythonBridge?: AxiosInstance;
}

export async function getMaxdiffResults({
    db,
    conversationSlugId,
    lifecycleFilter = "active",
    axiosPythonBridge,
}: GetMaxdiffResultsProps): Promise<MaxDiffResultsResponse> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    // Fetch all results (including partial) for this conversation
    const allResults = await db
        .select({
            ranking: maxdiffResultTable.ranking,
            comparisons: maxdiffResultTable.comparisons,
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
    const itemRows = await db
        .select({
            slugId: maxdiffItemTable.slugId,
            title: maxdiffItemContentTable.title,
            body: maxdiffItemContentTable.body,
            lifecycleStatus: maxdiffItemTable.lifecycleStatus,
            snapshotScore: maxdiffItemTable.snapshotScore,
            snapshotRank: maxdiffItemTable.snapshotRank,
            snapshotParticipantCount:
                maxdiffItemTable.snapshotParticipantCount,
            externalUrl: maxdiffItemExternalSourceTable.externalUrl,
        })
        .from(maxdiffItemTable)
        .innerJoin(
            maxdiffItemContentTable,
            eq(
                maxdiffItemContentTable.id,
                maxdiffItemTable.currentContentId,
            ),
        )
        .leftJoin(
            maxdiffItemExternalSourceTable,
            eq(
                maxdiffItemExternalSourceTable.maxdiffItemId,
                maxdiffItemTable.id,
            ),
        )
        .where(
            and(
                eq(maxdiffItemTable.conversationId, conversationId),
                isNotNull(maxdiffItemTable.currentContentId),
                inArray(maxdiffItemTable.lifecycleStatus, activeStatuses),
            ),
        );

    const items = itemRows.map((r) => r.slugId);

    // For completed/canceled items, return snapshot scores if available
    if (
        lifecycleFilter === "completed" ||
        lifecycleFilter === "canceled"
    ) {
        const rankings: MaxDiffResultItem[] = itemRows
            .map((r) => ({
                itemSlugId: r.slugId,
                title: r.title,
                body: r.body,
                avgRank: 0, // not meaningful for snapshots
                score: r.snapshotScore ?? 0,
                participantCount: r.snapshotParticipantCount ?? 0,
                lifecycleStatus: r.lifecycleStatus,
                externalUrl: r.externalUrl,
            }))
            .sort((a, b) => b.score - a.score)
            .map((r, idx) => ({
                ...r,
                avgRank: idx + 1, // use display rank
            }));
        return { rankings };
    }

    // For active/all: read pre-computed Solidago scores from ranking_score table.
    // If no cache, call python-bridge synchronously.
    const cachedScoreRow = await db
        .select({
            currentRankingScoreId: conversationTable.currentRankingScoreId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    const currentScoreId =
        cachedScoreRow.length > 0
            ? cachedScoreRow[0].currentRankingScoreId
            : null;

    let scored: RankedItem[];

    if (currentScoreId !== null) {
        // Read from ranking_score table (Solidago pre-computed)
        const scoreRows = await db
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
                .filter((s) => items.includes(s.entityId))
                .map((s, idx) => ({
                    itemSlugId: s.entityId,
                    avgRank: idx + 1,
                    score: s.score,
                    participantCount:
                        cachedParticipantCounts[s.entityId] ?? 0,
                }));
        } else {
            scored = [];
        }
    } else {
        scored = [];
    }

    // If no cached scores and python-bridge is available, call synchronously.
    // This happens on first load before any flush, or if cache was cleared.
    if (
        scored.length === 0 &&
        items.length >= 2 &&
        allResults.length > 0 &&
        axiosPythonBridge !== undefined
    ) {
        const { perUserComparisons, participantCounts } = parseResultRows({
            rows: allResults,
            items,
        });
        scored = await scoreSynchronouslyViaPythonBridge({
            db,
            conversationId,
            conversationSlugId,
            items,
            perUserComparisons,
            participantCounts,
            axiosPythonBridge,
        });
    }

    const contentMap = new Map(
        itemRows.map((r) => [
            r.slugId,
            {
                title: r.title,
                body: r.body,
                lifecycleStatus: r.lifecycleStatus,
                externalUrl: r.externalUrl,
            },
        ]),
    );

    const rankings: MaxDiffResultItem[] = scored.map((s) => {
        const content = contentMap.get(s.itemSlugId);
        return {
            itemSlugId: s.itemSlugId,
            title: content?.title ?? "",
            body: content?.body ?? null,
            avgRank: s.avgRank,
            score: s.score,
            participantCount: s.participantCount,
            lifecycleStatus: content?.lifecycleStatus ?? "active",
            externalUrl: content?.externalUrl ?? null,
        };
    });

    return { rankings };
}

// --- Synchronous python-bridge scoring (cache miss fallback) ---

async function scoreSynchronouslyViaPythonBridge({
    db,
    conversationId,
    conversationSlugId,
    items,
    perUserComparisons,
    participantCounts,
    axiosPythonBridge,
}: {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
    items: string[];
    perUserComparisons: MaxDiffComparison[][];
    participantCounts: Map<string, number>;
    axiosPythonBridge: AxiosInstance;
}): Promise<RankedItem[]> {
    // Build BWS comparisons for python-bridge
    const entityIdSet = new Set(items);
    const bwsComparisons: {
        user_id: number;
        best: string;
        worst: string;
        candidate_set: string[];
    }[] = [];

    for (let userIdx = 0; userIdx < perUserComparisons.length; userIdx++) {
        for (const comp of perUserComparisons[userIdx]) {
            if (!entityIdSet.has(comp.best) || !entityIdSet.has(comp.worst))
                continue;
            const filteredSet = comp.set.filter((id) => entityIdSet.has(id));
            if (filteredSet.length < 2) continue;
            bwsComparisons.push({
                user_id: userIdx,
                best: comp.best,
                worst: comp.worst,
                candidate_set: filteredSet,
            });
        }
    }

    if (bwsComparisons.length === 0) return [];

    const zodPythonBridgeResponse = z.object({
        scores: z.array(
            z.object({
                entity_id: z.string(),
                score: z.number(),
                uncertainty_left: z.number(),
                uncertainty_right: z.number(),
            }),
        ),
    });

    const response = await axiosPythonBridge.post("/ranking-score", {
        conversation_slug_id: conversationSlugId,
        entity_ids: items,
        bws_comparisons: bwsComparisons,
    });

    const { scores } = zodPythonBridgeResponse.parse(response.data);

    // Also write to ranking_score table so next read is cached
    const now = new Date();
    now.setMilliseconds(0);

    const [insertedScore] = await db
        .insert(rankingScoreTable)
        .values({
            conversationId,
            scores: scores.map((s) => ({
                entityId: s.entity_id,
                score: s.score,
                uncertaintyLeft: s.uncertainty_left,
                uncertaintyRight: s.uncertainty_right,
            })),
            participantCounts: Object.fromEntries(participantCounts),
            groupSourcesSnapshot: null,
            userWeightsSnapshot: null,
            pipelineConfig: {
                preferenceLearning: "UniformGBT",
                votingRights: "AffineOvertrust",
                aggregation: "EntitywiseQrQuantile(quantile=0.5)",
            },
            computedAt: now,
        })
        .returning({ id: rankingScoreTable.id });

    await db
        .update(conversationTable)
        .set({ currentRankingScoreId: insertedScore.id })
        .where(eq(conversationTable.id, conversationId));

    return scores.map((s, idx) => ({
        itemSlugId: s.entity_id,
        avgRank: idx + 1,
        score: s.score,
        participantCount: participantCounts.get(s.entity_id) ?? 0,
    }));
}

// --- Snapshot scores for lifecycle transitions ---

interface ComputeSnapshotProps {
    db: PostgresDatabase;
    conversationId: number;
    itemSlugId: string;
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
            currentRankingScoreId: conversationTable.currentRankingScoreId,
        })
        .from(conversationTable)
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
    const rank =
        cachedScores
            .filter((s) => s.score >= itemScore.score)
            .length;

    return {
        snapshotScore: itemScore.score,
        snapshotRank: rank,
        snapshotParticipantCount:
            cachedParticipantCounts[itemSlugId] ?? 0,
    };
}
