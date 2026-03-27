/**
 * Ranking Comparison Buffer Service
 *
 * ============================================================================
 * ARCHITECTURE
 * ============================================================================
 *
 * Same pattern as voteBuffer.ts: comparisons go to Valkey first, then
 * are flushed to PostgreSQL periodically. Scoring happens asynchronously
 * after each flush via python-bridge's /ranking-score-batch endpoint.
 *
 * DATA STRUCTURE: Sorted Set + Hash (identical to voteBuffer)
 * -----------------------------------------------------------
 * 1. Sorted Set (queue:ranking-comparisons:index):
 *    - Member: "userId:conversationId" (dedup key)
 *    - Score: timestamp in ms
 *    - Purpose: Ordering, dedup, batch limiting
 *
 * 2. Hash (queue:ranking-comparisons:data):
 *    - Field: "userId:conversationId"
 *    - Value: Full comparison JSON (ranking, comparisons[], isComplete)
 *    - Purpose: Store complete comparison state
 *
 * FLUSH + ASYNC SCORING
 * ---------------------
 * Flush (fast, ~100ms): drain buffer → write to DB → cleanup Valkey
 * Scoring (async, non-blocking): build payloads → POST /ranking-score-batch
 *
 * This separation keeps flushes fast so new votes are never blocked.
 * Scoring uses two Sets for dedup:
 * - pendingScoring: conversations that need scoring (added by flush)
 * - scoringInProgress: conversations currently being scored (prevents duplicates)
 *
 * A while loop in scoreAllPending drains new entries that arrive during scoring,
 * ensuring eventual consistency with a ~0.7s stale window per conversation.
 *
 * AT-LEAST-ONCE DELIVERY
 * ----------------------
 * - In-memory Map is ALWAYS written (primary)
 * - Valkey is ALSO written (durable backup, cross-instance)
 * - Flush merges both sources (latest timestamp wins)
 * - Entries deleted from Valkey only after successful DB write
 * - Same Lua scripts as voteBuffer for atomic operations
 *
 * ============================================================================
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AxiosInstance } from "axios";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import {
    maxdiffResultTable,
    maxdiffItemTable,
    rankingScoreTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import { zodMaxdiffComparison } from "@/shared/types/zod.js";
import { z } from "zod";
import { log } from "@/app.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { Script } from "@valkey/valkey-glide";
import { updateMaxdiffCounters } from "@/shared-backend/conversationCounters.js";

// ============================================================================
// Lua Scripts (same as voteBuffer)
// ============================================================================

const ADD_COMPARISON_SCRIPT = `
local indexKey = KEYS[1]
local dataKey = KEYS[2]
local member = ARGV[1]
local score = tonumber(ARGV[2])
local data = ARGV[3]

local changed = redis.call('ZADD', indexKey, 'GT', 'CH', score, member)
if changed == 1 then
    redis.call('HSET', dataKey, member, data)
end
return changed
`;

const CLEANUP_COMPARISONS_SCRIPT = `
local indexKey = KEYS[1]
local dataKey = KEYS[2]
local deleted = 0

for i = 1, #ARGV, 2 do
    local member = ARGV[i]
    local expectedScore = tonumber(ARGV[i + 1])
    local currentScore = redis.call('ZSCORE', indexKey, member)

    if currentScore and tonumber(currentScore) == expectedScore then
        redis.call('ZREM', indexKey, member)
        redis.call('HDEL', dataKey, member)
        deleted = deleted + 1
    end
end
return deleted
`;

// ============================================================================
// Types
// ============================================================================

const zodBufferedComparison = z.object({
    userId: z.string(),
    conversationId: z.number(),
    conversationSlugId: z.string(),
    ranking: z.array(z.string()).nullable(),
    comparisons: z.array(zodMaxdiffComparison),
    isComplete: z.boolean(),
    timestamp: z.coerce.date(),
});
type BufferedComparison = z.infer<typeof zodBufferedComparison>;

export interface RankingComparisonBuffer {
    add: (params: { comparison: BufferedComparison }) => void;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
}

interface CreateRankingComparisonBufferParams {
    db: PostgresJsDatabase;
    valkey?: Valkey;
    axiosPythonBridge?: AxiosInstance;
    flushIntervalMs: number;
    valkeyBatchLimit: number;
}

// ============================================================================
// Scoring payload builder (extracted from scoreConversation)
// ============================================================================

const _zodScoringPayload = z.object({
    conversation_slug_id: z.string(),
    entity_ids: z.array(z.string()),
    bws_comparisons: z.array(
        z.object({
            user_id: z.number(),
            best: z.string(),
            worst: z.string(),
            candidate_set: z.array(z.string()),
        }),
    ),
});
type ScoringPayload = z.infer<typeof _zodScoringPayload>;

async function buildScoringPayload({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<
    | { type: "payload"; conversationId: number; payload: ScoringPayload }
    | { type: "clear_scores"; conversationId: number }
    | { type: "skip" }
> {
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

    const entityIds = activeItems.map((r) => r.slugId);

    if (entityIds.length < 2) {
        log.info(
            `[RankingScoring] Conversation ${String(conversationId)}: <2 active items (${String(entityIds.length)}), clearing stale scores`,
        );
        return { type: "clear_scores", conversationId };
    }

    const allResults = await db
        .select({ comparisons: maxdiffResultTable.comparisons })
        .from(maxdiffResultTable)
        .where(eq(maxdiffResultTable.conversationId, conversationId));

    if (allResults.length === 0) {
        log.info(
            `[RankingScoring] Conversation ${String(conversationId)}: no result rows in DB, clearing stale scores`,
        );
        return { type: "clear_scores", conversationId };
    }

    const entityIdSet = new Set(entityIds);
    const bwsComparisons: ScoringPayload["bws_comparisons"] = [];

    for (let userIdx = 0; userIdx < allResults.length; userIdx++) {
        const comparisons = z
            .array(zodMaxdiffComparison)
            .parse(allResults[userIdx].comparisons);

        for (const comp of comparisons) {
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

    if (bwsComparisons.length === 0) {
        log.info(
            `[RankingScoring] Conversation ${String(conversationId)}: 0 valid BWS comparisons after filtering, clearing stale scores`,
        );
        return { type: "clear_scores", conversationId };
    }

    const convRows = await db
        .select({ slugId: conversationTable.slugId })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));
    if (convRows.length === 0) return { type: "skip" };

    log.info(
        `[RankingScoring] Conversation ${String(conversationId)}: ${String(bwsComparisons.length)} BWS comparisons, ${String(entityIds.length)} entities`,
    );

    return {
        type: "payload",
        conversationId,
        payload: {
            conversation_slug_id: convRows[0].slugId,
            entity_ids: entityIds,
            bws_comparisons: bwsComparisons,
        },
    };
}

// ============================================================================
// Score result writer
// ============================================================================

const zodScoreResult = z.object({
    conversation_slug_id: z.string().nullable().optional(),
    scores: z
        .array(
            z.object({
                entity_id: z.string(),
                score: z.number(),
                uncertainty_left: z.number(),
                uncertainty_right: z.number(),
            }),
        )
        .optional(),
    error: z.string().optional(),
});

const zodBatchResponse = z.object({
    results: z.array(zodScoreResult),
});

async function writeScoringResult({
    db,
    conversationId,
    scores,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    scores: {
        entity_id: string;
        score: number;
        uncertainty_left: number;
        uncertainty_right: number;
    }[];
}): Promise<void> {
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
            participantCounts: {},
            groupSourcesSnapshot: null,
            userWeightsSnapshot: null,
            pipelineConfig: {
                preferenceLearning: "LBFGSUniformGBT",
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
}

// ============================================================================
// Implementation
// ============================================================================

export function createRankingComparisonBuffer({
    db,
    valkey,
    axiosPythonBridge,
    flushIntervalMs,
    valkeyBatchLimit,
}: CreateRankingComparisonBufferParams): RankingComparisonBuffer {
    const pendingComparisons = new Map<string, BufferedComparison>();
    let isShuttingDown = false;
    let isFlushing = false;

    // Async scoring state
    const pendingScoring = new Set<number>();
    let isScoringRunning = false;
    let activeScoringPromise: Promise<void> | null = null;

    let addScript: Script | undefined;
    let cleanupScript: Script | undefined;

    if (valkey !== undefined) {
        addScript = new Script(ADD_COMPARISON_SCRIPT);
        cleanupScript = new Script(CLEANUP_COMPARISONS_SCRIPT);
    }

    const getKey = (userId: string, conversationId: number): string =>
        `${userId}:${String(conversationId)}`;

    // ------------------------------------------------------------------
    // add
    // ------------------------------------------------------------------

    const add = ({ comparison }: { comparison: BufferedComparison }): void => {
        if (isShuttingDown) {
            throw new Error(
                "[RankingBuffer] Cannot add comparisons during shutdown",
            );
        }

        const key = getKey(comparison.userId, comparison.conversationId);

        // In-memory: always written (primary, at-least-once)
        pendingComparisons.set(key, comparison);

        // Valkey: also written (durable backup)
        if (valkey !== undefined && addScript !== undefined) {
            const score = comparison.timestamp.getTime();
            const data = JSON.stringify(comparison);

            valkey
                .invokeScript(addScript, {
                    keys: [
                        VALKEY_QUEUE_KEYS.RANKING_COMPARISONS_INDEX,
                        VALKEY_QUEUE_KEYS.RANKING_COMPARISONS_DATA,
                    ],
                    args: [key, String(score), data],
                })
                .catch((error: unknown) => {
                    log.error(
                        error,
                        "[RankingBuffer] Failed to add to Valkey",
                    );
                });
        }
    };

    // ------------------------------------------------------------------
    // scoreAllPending (async, non-blocking)
    // ------------------------------------------------------------------

    const scoreAllPending = async (): Promise<void> => {
        if (axiosPythonBridge === undefined) return;
        if (isScoringRunning) return;
        isScoringRunning = true;
        try {
            // Loop drains new entries that arrive (via flush) during scoring.
            // isScoringRunning prevents concurrent runs, so no interleaving
            // between the synchronous drain and the async HTTP call.
            while (pendingScoring.size > 0) {
                const toScore = Array.from(pendingScoring);
                pendingScoring.clear();

                try {
                    const payloads: {
                        conversationId: number;
                        payload: ScoringPayload;
                    }[] = [];
                    const clearScoreIds: number[] = [];

                    for (const conversationId of toScore) {
                        const result = await buildScoringPayload({
                            db,
                            conversationId,
                        });
                        if (result.type === "payload") {
                            payloads.push({
                                conversationId: result.conversationId,
                                payload: result.payload,
                            });
                        } else if (result.type === "clear_scores") {
                            clearScoreIds.push(result.conversationId);
                        }
                    }

                    for (const conversationId of clearScoreIds) {
                        await db
                            .update(conversationTable)
                            .set({ currentRankingScoreId: null })
                            .where(eq(conversationTable.id, conversationId));
                    }

                    if (payloads.length === 0) continue;

                    const slugToConversationId = new Map<string, number>();
                    for (const p of payloads) {
                        slugToConversationId.set(
                            p.payload.conversation_slug_id,
                            p.conversationId,
                        );
                    }

                    log.info(
                        `[RankingBuffer] Batch scoring ${String(payloads.length)} conversation(s)`,
                    );

                    const response = await axiosPythonBridge.post(
                        "/ranking-score-batch",
                        {
                            conversations: payloads.map((p) => p.payload),
                        },
                    );

                    const { results } = zodBatchResponse.parse(response.data);

                    for (const result of results) {
                        const slugId = result.conversation_slug_id;
                        if (slugId === undefined || slugId === null) continue;

                        const conversationId =
                            slugToConversationId.get(slugId);
                        if (conversationId === undefined) continue;

                        if (result.error !== undefined) {
                            log.error(
                                `[RankingBuffer] Scoring failed for ${slugId}: ${result.error}`,
                            );
                            continue;
                        }

                        if (
                            result.scores !== undefined &&
                            result.scores.length > 0
                        ) {
                            await writeScoringResult({
                                db,
                                conversationId,
                                scores: result.scores,
                            });
                            log.info(
                                `[RankingBuffer] Scored ${slugId}: ${String(result.scores.length)} entities`,
                            );
                        }
                    }
                } catch (error: unknown) {
                    log.error(
                        error,
                        "[RankingBuffer] Async batch scoring failed",
                    );
                }
            }
        } finally {
            isScoringRunning = false;
            activeScoringPromise = null;
        }
    };

    // ------------------------------------------------------------------
    // flush
    // ------------------------------------------------------------------

    const flush = async (): Promise<void> => {
        if (isFlushing) {
            return;
        }
        isFlushing = true;
        try {
            await flushInternal();
        } finally {
            isFlushing = false;
        }
    };

    const flushInternal = async (): Promise<void> => {
        // 1. Collect from in-memory
        const localComparisons = Array.from(pendingComparisons.values());
        pendingComparisons.clear();

        const comparisonMap = new Map<string, BufferedComparison>();
        for (const comp of localComparisons) {
            const result = zodBufferedComparison.safeParse(comp);
            if (result.success) {
                comparisonMap.set(
                    getKey(result.data.userId, result.data.conversationId),
                    result.data,
                );
            }
        }

        // 2. Collect from Valkey
        const processedValkeyEntries: { member: string; score: number }[] = [];

        if (valkey !== undefined) {
            try {
                const members = await valkey.zrange(
                    VALKEY_QUEUE_KEYS.RANKING_COMPARISONS_INDEX,
                    { start: 0, end: valkeyBatchLimit - 1 },
                );

                if (members.length > 0) {
                    const membersWithScores = await valkey.zrangeWithScores(
                        VALKEY_QUEUE_KEYS.RANKING_COMPARISONS_INDEX,
                        { start: 0, end: valkeyBatchLimit - 1 },
                    );

                    const dataList = await valkey.hmget(
                        VALKEY_QUEUE_KEYS.RANKING_COMPARISONS_DATA,
                        members,
                    );

                    for (let i = 0; i < members.length; i++) {
                        const member = String(members[i]);
                        const dataJson = dataList[i];
                        const scoreEntry = membersWithScores[i];

                        processedValkeyEntries.push({
                            member,
                            score: scoreEntry.score,
                        });

                        if (dataJson === null) continue;

                        try {
                            const parsed: unknown = JSON.parse(
                                String(dataJson),
                            );
                            const result =
                                zodBufferedComparison.safeParse(parsed);
                            if (result.success) {
                                const key = getKey(
                                    result.data.userId,
                                    result.data.conversationId,
                                );
                                const existing = comparisonMap.get(key);
                                if (
                                    existing === undefined ||
                                    result.data.timestamp > existing.timestamp
                                ) {
                                    comparisonMap.set(key, result.data);
                                }
                            }
                        } catch {
                            log.warn(
                                `[RankingBuffer] Skipping malformed JSON: ${member}`,
                            );
                        }
                    }
                }
            } catch (error: unknown) {
                log.error(
                    error,
                    "[RankingBuffer] Failed to fetch from Valkey",
                );
            }
        }

        const batch = Array.from(comparisonMap.values());
        if (batch.length === 0) return;

        log.info(
            `[RankingBuffer] Flushing ${String(batch.length)} comparison(s)`,
        );

        try {
            // 3. Write comparisons to PostgreSQL (upsert per user per conversation)
            const conversationIds = new Set<number>();

            for (const comp of batch) {
                const now = new Date();
                now.setMilliseconds(0);

                await db
                    .insert(maxdiffResultTable)
                    .values({
                        participantId: comp.userId,
                        conversationId: comp.conversationId,
                        ranking: comp.ranking,
                        comparisons: comp.comparisons,
                        isComplete: comp.isComplete,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .onConflictDoUpdate({
                        target: [
                            maxdiffResultTable.participantId,
                            maxdiffResultTable.conversationId,
                        ],
                        set: {
                            ranking: comp.ranking,
                            comparisons: comp.comparisons,
                            isComplete: comp.isComplete,
                            updatedAt: now,
                        },
                    });

                conversationIds.add(comp.conversationId);
            }

            // 4. Update counters per conversation
            for (const conversationId of conversationIds) {
                await updateMaxdiffCounters({ db, conversationId });
            }

            log.info(
                `[RankingBuffer] Flushed ${String(batch.length)} comparison(s) across ${String(conversationIds.size)} conversation(s)`,
            );

            // 5. Cleanup Valkey (at-least-once: votes are in DB now)
            if (
                valkey !== undefined &&
                cleanupScript !== undefined &&
                processedValkeyEntries.length > 0
            ) {
                try {
                    const cleanupArgs: string[] = [];
                    for (const entry of processedValkeyEntries) {
                        cleanupArgs.push(entry.member, String(entry.score));
                    }

                    await valkey.invokeScript(cleanupScript, {
                        keys: [
                            VALKEY_QUEUE_KEYS.RANKING_COMPARISONS_INDEX,
                            VALKEY_QUEUE_KEYS.RANKING_COMPARISONS_DATA,
                        ],
                        args: cleanupArgs,
                    });
                } catch (error: unknown) {
                    log.error(
                        error,
                        "[RankingBuffer] Failed to cleanup Valkey (will retry)",
                    );
                }
            }

            // 6. Enqueue conversations for async scoring
            for (const conversationId of conversationIds) {
                pendingScoring.add(conversationId);
            }

            // 7. Trigger async scoring (non-blocking)
            // Only assign if no scoring is already running; otherwise
            // the while loop inside the active run will pick up the new entries.
            activeScoringPromise ??= scoreAllPending();
        } catch (error: unknown) {
            log.error(error, "[RankingBuffer] Failed to flush");
            throw error;
        }
    };

    // ------------------------------------------------------------------
    // shutdown
    // ------------------------------------------------------------------

    const shutdown = async (): Promise<void> => {
        isShuttingDown = true;
        clearInterval(flushInterval);
        await flush();
        if (activeScoringPromise !== null) {
            await activeScoringPromise;
        }
        if (addScript !== undefined) {
            addScript.release();
            addScript = undefined;
        }
        if (cleanupScript !== undefined) {
            cleanupScript.release();
            cleanupScript = undefined;
        }
        log.info("[RankingBuffer] Shutdown complete");
    };

    const flushInterval: NodeJS.Timeout = setInterval(() => {
        flush().catch((error: unknown) => {
            log.error(error, "[RankingBuffer] Flush interval error");
        });
    }, flushIntervalMs);
    flushInterval.unref();

    return { add, flush, shutdown };
}
