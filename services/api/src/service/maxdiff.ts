import {
    conversationTable,
    maxdiffResultTable,
    opinionTable,
    opinionContentTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { eq, and } from "drizzle-orm";
import type {
    MaxDiffLoadResponse,
    MaxDiffResultsResponse,
} from "@/shared/types/dto.js";
import { z } from "zod";
import { zodMaxdiffComparison, type MaxDiffComparison } from "@/shared/types/zod.js";

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

    // Fetch all completed rankings for this conversation
    const allResults = await db
        .select({
            ranking: maxdiffResultTable.ranking,
        })
        .from(maxdiffResultTable)
        .where(
            and(
                eq(maxdiffResultTable.conversationId, conversationId),
                eq(maxdiffResultTable.isComplete, true),
            ),
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

    // Parse and aggregate rankings
    const parsedRankings: string[][] = [];
    for (const row of allResults) {
        if (row.ranking !== null) {
            const ranking = z.array(z.string()).parse(row.ranking);
            parsedRankings.push(ranking);
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
        totalParticipants: parsedRankings.length,
    };
}
