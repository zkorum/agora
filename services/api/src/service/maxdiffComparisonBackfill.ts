import {
    conversationTable,
    maxdiffComparisonTable,
    maxdiffResultTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { zodMaxdiffComparison } from "@/shared/types/zod.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { log } from "@/app.js";

interface LegacyMaxdiffResultCandidateRow extends Record<string, unknown> {
    resultId: number;
    conversationId: number;
    conversationSlugId: string;
    comparisons: unknown;
    activeComparisonCount: string | number;
}

interface BackfillComparisonInsertRow {
    maxdiffResultId: number;
    position: number;
    bestSlugId: string;
    worstSlugId: string;
    candidateSet: string[];
}

interface AffectedConversation {
    conversationId: number;
    conversationSlugId: string;
}

export interface PreparedLegacyMaxdiffComparisonBackfill {
    insertRows: BackfillComparisonInsertRow[];
    backfilledResultIds: number[];
    affectedConversations: AffectedConversation[];
    invalidResultIds: number[];
}

interface DirtyQueueClient {
    zadd: (
        key: string,
        members: Record<string, number>,
    ) => Promise<unknown>;
}

const legacyComparisonSchema = z.array(zodMaxdiffComparison);
const backfillInsertChunkSize = 1000;

function chunkItems<T>({
    items,
    chunkSize,
}: {
    items: T[];
    chunkSize: number;
}): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
}

export function prepareLegacyMaxdiffComparisonBackfill({
    candidates,
}: {
    candidates: LegacyMaxdiffResultCandidateRow[];
}): PreparedLegacyMaxdiffComparisonBackfill {
    const insertRows: BackfillComparisonInsertRow[] = [];
    const backfilledResultIds: number[] = [];
    const affectedConversationMap = new Map<number, AffectedConversation>();
    const invalidResultIds: number[] = [];

    for (const candidate of candidates) {
        const parsedComparisons = legacyComparisonSchema.safeParse(
            candidate.comparisons,
        );
        if (!parsedComparisons.success) {
            invalidResultIds.push(candidate.resultId);
            continue;
        }

        if (parsedComparisons.data.length === 0) {
            continue;
        }

        if (
            Number(candidate.activeComparisonCount) >=
            parsedComparisons.data.length
        ) {
            continue;
        }

        backfilledResultIds.push(candidate.resultId);
        affectedConversationMap.set(candidate.conversationId, {
            conversationId: candidate.conversationId,
            conversationSlugId: candidate.conversationSlugId,
        });

        parsedComparisons.data.forEach((comparison, position) => {
            insertRows.push({
                maxdiffResultId: candidate.resultId,
                position,
                bestSlugId: comparison.best,
                worstSlugId: comparison.worst,
                candidateSet: comparison.set,
            });
        });
    }

    return {
        insertRows,
        backfilledResultIds,
        affectedConversations: Array.from(affectedConversationMap.values()),
        invalidResultIds,
    };
}

async function fetchLegacyMaxdiffResultCandidates({
    db,
}: {
    db: PostgresDatabase;
}): Promise<LegacyMaxdiffResultCandidateRow[]> {
    const rows = await db.execute<LegacyMaxdiffResultCandidateRow>(sql`
        SELECT
            ${maxdiffResultTable.id} AS "resultId",
            ${maxdiffResultTable.conversationId} AS "conversationId",
            ${conversationTable.slugId} AS "conversationSlugId",
            ${maxdiffResultTable.comparisons} AS "comparisons",
            COUNT(${maxdiffComparisonTable.id})
                FILTER (WHERE ${maxdiffComparisonTable.deletedAt} IS NULL)::text
                AS "activeComparisonCount"
        FROM ${maxdiffResultTable}
        INNER JOIN ${conversationTable}
            ON ${conversationTable.id} = ${maxdiffResultTable.conversationId}
        LEFT JOIN ${maxdiffComparisonTable}
            ON ${maxdiffComparisonTable.maxdiffResultId} = ${maxdiffResultTable.id}
        WHERE ${conversationTable.conversationType} = 'maxdiff'
        GROUP BY
            ${maxdiffResultTable.id},
            ${maxdiffResultTable.conversationId},
            ${conversationTable.slugId},
            ${maxdiffResultTable.comparisons}
        HAVING jsonb_array_length(${maxdiffResultTable.comparisons}) > 0
           AND COUNT(${maxdiffComparisonTable.id})
               FILTER (WHERE ${maxdiffComparisonTable.deletedAt} IS NULL)
               < jsonb_array_length(${maxdiffResultTable.comparisons})
    `);

    return rows;
}

async function invalidateCurrentRankingScores({
    db,
    conversationIds,
}: {
    db: PostgresDatabase;
    conversationIds: number[];
}): Promise<void> {
    if (conversationIds.length === 0) {
        return;
    }

    await db
        .update(conversationTable)
        .set({ currentRankingScoreId: null })
        .where(inArray(conversationTable.id, conversationIds));
}

export async function finalizeLegacyMaxdiffComparisonBackfill({
    preparedBackfill,
    valkey,
    invalidateRankingScores,
}: {
    preparedBackfill: PreparedLegacyMaxdiffComparisonBackfill;
    valkey: DirtyQueueClient | undefined;
    invalidateRankingScores: (params: {
        conversationIds: number[];
    }) => Promise<void>;
}): Promise<void> {
    if (preparedBackfill.invalidResultIds.length > 0) {
        log.warn(
            `[MaxDiff Backfill] Skipped ${String(preparedBackfill.invalidResultIds.length)} legacy result(s) with invalid comparison payloads`,
        );
    }

    if (preparedBackfill.affectedConversations.length === 0) {
        log.info("[MaxDiff Backfill] No legacy comparisons need repair");
        return;
    }

    log.info(
        `[MaxDiff Backfill] Restored ${String(preparedBackfill.insertRows.length)} comparison row(s) across ${String(preparedBackfill.backfilledResultIds.length)} result(s) in ${String(preparedBackfill.affectedConversations.length)} conversation(s)`,
    );

    const affectedConversationIds = preparedBackfill.affectedConversations.map(
        (conversation) => conversation.conversationId,
    );

    if (valkey === undefined) {
        await invalidateRankingScores({
            conversationIds: affectedConversationIds,
        });
        log.warn(
            "[MaxDiff Backfill] API Valkey unavailable; cleared current ranking cache so the scoring worker reconciliation can rebuild it once the queue is reachable",
        );
        return;
    }

    const dirtyMembers: Record<string, number> = {};
    for (const conversation of preparedBackfill.affectedConversations) {
        dirtyMembers[
            `${String(conversation.conversationId)}:${conversation.conversationSlugId}`
        ] = 0;
    }

    try {
        await valkey.zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, dirtyMembers);
        log.info(
            `[MaxDiff Backfill] Re-queued ${String(preparedBackfill.affectedConversations.length)} repaired conversation(s) for Solidago recompute`,
        );
    } catch (error: unknown) {
        await invalidateRankingScores({
            conversationIds: affectedConversationIds,
        });
        log.error(
            error,
            "[MaxDiff Backfill] Failed to re-queue repaired conversations; cleared current ranking cache so worker reconciliation can force a rebuild",
        );
    }
}

export async function backfillLegacyMaxdiffComparisons({
    db,
    valkey,
}: {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
}): Promise<void> {
    try {
        let preparedBackfill: PreparedLegacyMaxdiffComparisonBackfill = {
            insertRows: [],
            backfilledResultIds: [],
            affectedConversations: [],
            invalidResultIds: [],
        };

        await db.transaction(async (tx) => {
            const candidates = await fetchLegacyMaxdiffResultCandidates({ db: tx });
            preparedBackfill = prepareLegacyMaxdiffComparisonBackfill({
                candidates,
            });

            if (preparedBackfill.insertRows.length === 0) {
                return;
            }

            for (const chunk of chunkItems({
                items: preparedBackfill.insertRows,
                chunkSize: backfillInsertChunkSize,
            })) {
                await tx
                    .insert(maxdiffComparisonTable)
                    .values(chunk)
                    .onConflictDoNothing({
                        target: [
                            maxdiffComparisonTable.maxdiffResultId,
                            maxdiffComparisonTable.position,
                        ],
                        where: sql`${maxdiffComparisonTable.deletedAt} IS NULL`,
                    });
            }

            const backfillTimestamp = new Date();
            backfillTimestamp.setMilliseconds(0);
            await tx
                .update(maxdiffResultTable)
                .set({ updatedAt: backfillTimestamp })
                .where(
                    inArray(
                        maxdiffResultTable.id,
                        preparedBackfill.backfilledResultIds,
                    ),
                );
        });

        await finalizeLegacyMaxdiffComparisonBackfill({
            preparedBackfill,
            valkey,
            invalidateRankingScores: async ({ conversationIds }) => {
                await invalidateCurrentRankingScores({
                    db,
                    conversationIds,
                });
            },
        });
    } catch (error: unknown) {
        log.error(error, "[MaxDiff Backfill] Failed to repair legacy comparison rows");
    }
}
