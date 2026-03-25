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
import { bradleyTerryFromBWS } from "./bradleyTerry.js";
import { log } from "@/app.js";

// --- Pure scoring functions (exported for testing) ---

export interface RankedItem {
    itemSlugId: string;
    avgRank: number;
    score: number;
    participantCount: number;
}

/**
 * Compute scores from pooled comparisons using Bradley-Terry MLE.
 * Pools all users' raw comparisons and runs BT directly.
 * No DB access, fully testable.
 */
export function computeScores({
    allComparisons,
    items,
    participantCounts,
}: {
    allComparisons: MaxDiffComparison[];
    items: string[];
    participantCounts: Map<string, number>;
}): RankedItem[] {
    const n = items.length;
    if (n === 0) return [];

    const { items: scoredItems, converged } = bradleyTerryFromBWS({
        comparisons: allComparisons,
        items,
    });

    if (!converged) {
        log.warn(
            `[computeScores] BT MLE did not converge for ${items.length} items`,
        );
    }

    return scoredItems.map((s, idx) => ({
        itemSlugId: s.item,
        avgRank: idx + 1,
        score: s.score,
        participantCount: participantCounts.get(s.item) ?? 0,
    }));
}

/**
 * Extract all comparisons from raw JSONB result rows, filtering to active items.
 * Also counts how many users compared each item (for participant counts).
 * Pure function, no DB access.
 */
export function parseResultRows({
    rows,
    items,
}: {
    rows: { ranking: unknown; comparisons: unknown }[];
    items: string[];
}): {
    allComparisons: MaxDiffComparison[];
    participantCounts: Map<string, number>;
} {
    const itemSet = new Set(items);
    const allComparisons: MaxDiffComparison[] = [];
    // Track which items each user compared (for participant counts)
    const itemParticipants = new Map<string, Set<number>>();
    for (const item of items) {
        itemParticipants.set(item, new Set());
    }

    for (let userIdx = 0; userIdx < rows.length; userIdx++) {
        const row = rows[userIdx];
        const comparisons = z
            .array(zodMaxdiffComparison)
            .parse(row.comparisons);

        for (const comp of comparisons) {
            if (!itemSet.has(comp.best) || !itemSet.has(comp.worst)) continue;
            const filteredSet = comp.set.filter((id) => itemSet.has(id));
            if (filteredSet.length < 2) continue;

            allComparisons.push({
                best: comp.best,
                worst: comp.worst,
                set: filteredSet,
            });

            for (const item of filteredSet) {
                itemParticipants.get(item)?.add(userIdx);
            }
        }
    }

    const participantCounts = new Map<string, number>();
    for (const [item, participants] of itemParticipants) {
        participantCounts.set(item, participants.size);
    }

    return { allComparisons, participantCounts };
}

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

    const now = new Date();

    log.info(
        `[MaxDiff Save] user=${userId} conv=${conversationSlugId} comparisons=${comparisons.length} isComplete=${isComplete}`,
    );
    for (const comp of comparisons) {
        log.info(
            `[MaxDiff Save]   best=${comp.best} worst=${comp.worst} set=[${comp.set.join(",")}]`,
        );
    }

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

    await updateMaxdiffCounters({ db, conversationId });
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

    // For active/all: compute live scores from pooled comparisons via BT MLE
    const { allComparisons, participantCounts } = parseResultRows({
        rows: allResults,
        items,
    });

    log.info(
        `[MaxDiff Results] conv=${conversationSlugId} rows=${allResults.length} items=${items.length} comparisons=${allComparisons.length}`,
    );
    for (const comp of allComparisons) {
        log.info(
            `[MaxDiff Results]   best=${comp.best} worst=${comp.worst} set=[${comp.set.join(",")}]`,
        );
    }

    const scored = computeScores({ allComparisons, items, participantCounts });

    log.info(
        `[MaxDiff Results] BT scores: ${scored.map((s) => `${s.itemSlugId}=${s.score.toFixed(3)}`).join(", ")}`,
    );

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

    const { allComparisons, participantCounts } = parseResultRows({
        rows: allResults,
        items,
    });
    const scored = computeScores({ allComparisons, items, participantCounts });

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
