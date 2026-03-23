import {
    conversationTable,
    maxdiffResultTable,
    maxdiffItemTable,
    maxdiffItemContentTable,
    maxdiffItemExternalSourceTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { updateMaxdiffCounters } from "@/shared-backend/conversationCounters.js";
import { eq, and, inArray, isNotNull, sql } from "drizzle-orm";
import type {
    MaxDiffLoadResponse,
    MaxDiffResultsResponse,
    MaxDiffResultItem,
} from "@/shared/types/dto.js";
import { z } from "zod";
import {
    zodMaxdiffComparison,
    type MaxDiffComparison,
    type MaxdiffLifecycleStatus,
} from "@/shared/types/zod.js";

// --- Pure scoring functions (exported for testing) ---

/**
 * Derive a partial ranking from comparisons.
 * Builds a "beats" relation with transitive closure, then sorts
 * by win count. Only includes items that appeared in comparisons
 * AND are in the provided items list.
 */
export function derivePartialRanking({
    comparisons,
    items,
}: {
    comparisons: MaxDiffComparison[];
    items: string[];
}): string[] {
    if (comparisons.length === 0) return [];

    const itemSet = new Set(items);

    // Filter comparisons to only include items in the active set
    const filteredComparisons = comparisons
        .filter(
            (c) => itemSet.has(c.best) && itemSet.has(c.worst),
        )
        .map((c) => ({
            ...c,
            set: c.set.filter((item) => itemSet.has(item)),
        }));

    const comparedItems = new Set<string>();
    for (const { set } of filteredComparisons) {
        for (const item of set) comparedItems.add(item);
    }

    const comparedList = items.filter((item) => comparedItems.has(item));
    if (comparedList.length < 2) return comparedList;

    const beats = new Map<string, Set<string>>();
    for (const item of comparedList) beats.set(item, new Set());

    for (const { best, worst, set } of filteredComparisons) {
        for (const other of set) {
            if (other !== best) beats.get(best)?.add(other);
        }
        for (const other of set) {
            if (other !== worst) beats.get(other)?.add(worst);
        }
    }

    // Transitive closure (Floyd-Warshall)
    for (const k of comparedList) {
        for (const i of comparedList) {
            for (const j of comparedList) {
                if (beats.get(i)?.has(k) && beats.get(k)?.has(j)) {
                    beats.get(i)?.add(j);
                }
            }
        }
    }

    return [...comparedList].sort((a, b) => {
        const aWins = beats.get(a)?.size ?? 0;
        const bWins = beats.get(b)?.size ?? 0;
        return bWins - aWins;
    });
}

export interface RankedItem {
    itemSlugId: string;
    avgRank: number;
    score: number;
    participantCount: number;
}

/**
 * Pure function: compute scores from parsed rankings and an item list.
 * No DB access, fully testable.
 */
export function computeScores({
    parsedRankings,
    items,
}: {
    parsedRankings: string[][];
    items: string[];
}): RankedItem[] {
    const n = items.length;
    if (n === 0) return [];

    const rankSums = new Map<string, { total: number; count: number }>();
    for (const item of items) {
        rankSums.set(item, { total: 0, count: 0 });
    }

    for (const ranking of parsedRankings) {
        for (let i = 0; i < ranking.length; i++) {
            const entry = rankSums.get(ranking[i]);
            if (entry) {
                entry.total += i + 1; // 1-based rank
                entry.count += 1;
            }
        }
    }

    return items
        .map((item) => {
            const entry = rankSums.get(item);
            const avgRank =
                entry !== undefined && entry.count > 0
                    ? entry.total / entry.count
                    : n;
            const score = n > 1 ? (n - avgRank) / (n - 1) : 1;
            return {
                itemSlugId: item,
                avgRank,
                score,
                participantCount: entry?.count ?? 0,
            };
        })
        .sort((a, b) => a.avgRank - b.avgRank);
}

/**
 * Parse raw JSONB result rows into rankings, deriving partial rankings
 * for incomplete sessions. Pure function, no DB access.
 */
export function parseResultRows({
    rows,
    items,
}: {
    rows: { ranking: unknown; comparisons: unknown }[];
    items: string[];
}): string[][] {
    const parsedRankings: string[][] = [];
    for (const row of rows) {
        if (row.ranking !== null) {
            const ranking = z.array(z.string()).parse(row.ranking);
            // Filter to only items in the active set
            const filtered = ranking.filter((id) => items.includes(id));
            if (filtered.length > 0) {
                parsedRankings.push(filtered);
            }
        } else {
            const comparisons = z
                .array(zodMaxdiffComparison)
                .parse(row.comparisons);
            if (comparisons.length > 0) {
                const partialRanking = derivePartialRanking({
                    comparisons,
                    items,
                });
                if (partialRanking.length > 0) {
                    parsedRankings.push(partialRanking);
                }
            }
        }
    }
    return parsedRankings;
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
}

export async function saveMaxdiffResult({
    db,
    conversationSlugId,
    userId,
    ranking,
    comparisons,
    isComplete,
    isMaxdiffOrgOnly,
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

    // Check previous state (fast PK lookup) to avoid
    // unnecessary counter recalculation on every comparison round
    const previousState = await db
        .select({
            isComplete: maxdiffResultTable.isComplete,
            comparisonCount:
                sql<number>`jsonb_array_length(${maxdiffResultTable.comparisons})`,
        })
        .from(maxdiffResultTable)
        .where(
            and(
                eq(maxdiffResultTable.participantId, userId),
                eq(maxdiffResultTable.conversationId, conversationId),
            ),
        );
    const wasComplete = previousState[0]?.isComplete ?? false;
    const hadComparisons = (previousState[0]?.comparisonCount ?? 0) > 0;
    const hasComparisons = comparisons.length > 0;

    const now = new Date();

    await db
        .insert(maxdiffResultTable)
        .values({
            participantId: userId,
            conversationId,
            ranking: ranking,
            comparisons: comparisons,
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
                ranking: ranking,
                comparisons: comparisons,
                isComplete,
                updatedAt: now,
            },
        });

    // Reconcile counters when completion status changes OR when
    // participant joins/leaves (comparisons transition to/from empty)
    if (isComplete !== wasComplete || hasComparisons !== hadComparisons) {
        await updateMaxdiffCounters({ db, conversationId });
    }
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
}

export async function getMaxdiffResults({
    db,
    conversationSlugId,
    lifecycleFilter = "active",
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

    // For active/all: compute live scores from comparisons
    const parsedRankings = parseResultRows({
        rows: allResults,
        items,
    });

    const scored = computeScores({ parsedRankings, items });

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

// --- Snapshot scores for lifecycle transitions ---

interface ComputeSnapshotProps {
    db: PostgresDatabase;
    conversationId: number;
    itemSlugId: string;
}

/**
 * Compute the current score and rank for a specific item
 * by running the full scoring algorithm on all active items.
 * Returns the snapshot values to freeze on the item row.
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
    // Get all active items for this conversation
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

    // If the item isn't in the active set (already removed), can't snapshot
    if (!items.includes(itemSlugId)) {
        return {
            snapshotScore: null,
            snapshotRank: null,
            snapshotParticipantCount: null,
        };
    }

    const allResults = await db
        .select({
            ranking: maxdiffResultTable.ranking,
            comparisons: maxdiffResultTable.comparisons,
        })
        .from(maxdiffResultTable)
        .where(eq(maxdiffResultTable.conversationId, conversationId));

    const parsedRankings = parseResultRows({ rows: allResults, items });
    const scored = computeScores({ parsedRankings, items });

    const itemScore = scored.find((s) => s.itemSlugId === itemSlugId);
    if (itemScore === undefined) {
        return {
            snapshotScore: null,
            snapshotRank: null,
            snapshotParticipantCount: null,
        };
    }

    const rank = scored.indexOf(itemScore) + 1;
    return {
        snapshotScore: itemScore.score,
        snapshotRank: rank,
        snapshotParticipantCount: itemScore.participantCount,
    };
}
