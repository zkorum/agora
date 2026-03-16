import {
    conversationTable,
    maxdiffResultTable,
    opinionTable,
    opinionContentTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { updateMaxdiffCounters } from "@/shared-backend/conversationCounters.js";
import { eq, and } from "drizzle-orm";
import type {
    MaxDiffLoadResponse,
    MaxDiffResultsResponse,
} from "@/shared/types/dto.js";
import { z } from "zod";
import { zodMaxdiffComparison, type MaxDiffComparison } from "@/shared/types/zod.js";

// --- Partial ranking derivation ---

/**
 * Derive a partial ranking from comparisons.
 * Builds a "beats" relation with transitive closure, then sorts
 * by win count. Only includes items that appeared in comparisons.
 */
function derivePartialRanking({
    comparisons,
    items,
}: {
    comparisons: MaxDiffComparison[];
    items: string[];
}): string[] {
    if (comparisons.length === 0) return [];

    const comparedItems = new Set<string>();
    for (const { set } of comparisons) {
        for (const item of set) comparedItems.add(item);
    }

    const comparedList = items.filter((item) => comparedItems.has(item));
    if (comparedList.length < 2) return comparedList;

    const beats = new Map<string, Set<string>>();
    for (const item of comparedList) beats.set(item, new Set());

    for (const { best, worst, set } of comparisons) {
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

    // Check previous isComplete status (fast PK lookup) to avoid
    // unnecessary counter recalculation on every comparison round
    const previousState = await db
        .select({ isComplete: maxdiffResultTable.isComplete })
        .from(maxdiffResultTable)
        .where(
            and(
                eq(maxdiffResultTable.participantId, userId),
                eq(maxdiffResultTable.conversationId, conversationId),
            ),
        );
    const wasComplete = previousState[0]?.isComplete ?? false;

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

    // Only reconcile counters when completion status changes
    // (completion or redo — at most twice per user per conversation)
    if (isComplete !== wasComplete) {
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
    const comparisons = z
        .array(zodMaxdiffComparison)
        .parse(row.comparisons);
    const ranking = row.ranking !== null
        ? z.array(z.string()).parse(row.ranking)
        : null;

    return {
        ranking,
        comparisons,
        isComplete: row.isComplete,
    };
}

// --- Aggregated Results ---

interface GetMaxdiffResultsProps {
    db: PostgresDatabase;
    conversationSlugId: string;
}

export async function getMaxdiffResults({
    db,
    conversationSlugId,
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
        .where(
            eq(maxdiffResultTable.conversationId, conversationId),
        );

    // Fetch all opinion slugIds and content for this conversation
    const opinions = await db
        .select({
            slugId: opinionTable.slugId,
            content: opinionContentTable.content,
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .where(eq(opinionTable.conversationId, conversationId));

    const allItems = opinions.map((o) => o.slugId);
    const contentMap = new Map(
        opinions.map((o) => [o.slugId, o.content]),
    );

    // Parse and aggregate rankings (including partial rankings from comparisons)
    const parsedRankings: string[][] = [];
    for (const row of allResults) {
        if (row.ranking !== null) {
            const ranking = z.array(z.string()).parse(row.ranking);
            parsedRankings.push(ranking);
        } else {
            // Derive partial ranking from comparisons
            const comparisons = z
                .array(zodMaxdiffComparison)
                .parse(row.comparisons);
            if (comparisons.length > 0) {
                const partialRanking = derivePartialRanking({
                    comparisons,
                    items: allItems,
                });
                if (partialRanking.length > 0) {
                    parsedRankings.push(partialRanking);
                }
            }
        }
    }

    // Compute average rank per item
    const rankSums = new Map<string, { total: number; count: number }>();
    for (const item of allItems) {
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

    const n = allItems.length;
    const rankings = allItems
        .map((item) => {
            const entry = rankSums.get(item);
            const avgRank =
                entry !== undefined && entry.count > 0
                    ? entry.total / entry.count
                    : n;
            const score = n > 1 ? (n - avgRank) / (n - 1) : 1;
            return {
                opinionSlugId: item,
                opinionContent: contentMap.get(item) ?? "",
                avgRank,
                score,
                participantCount: entry?.count ?? 0,
            };
        })
        .sort((a, b) => a.avgRank - b.avgRank);

    return {
        rankings,
    };
}
