/**
 * Vote Buffer Service
 *
 * ============================================================================
 * ARCHITECTURE RATIONALE
 * ============================================================================
 *
 * This service buffers votes in Valkey before flushing them to PostgreSQL.
 * The goal is to reduce database write pressure during heavy voting periods
 * by batching votes and updating opinion counters once per flush instead of
 * once per vote.
 *
 * DATA STRUCTURE: Sorted Set + Hash
 * ---------------------------------
 * We use TWO Valkey structures working together:
 *
 * 1. Sorted Set (queue:votes:index):
 *    - Member: "userId:opinionId" (dedup key)
 *    - Score: timestamp in milliseconds
 *    - Purpose: Ordering for fair processing, deduplication, batch limiting
 *
 * 2. Hash (queue:votes:data):
 *    - Field: "userId:opinionId" (same as sorted set member)
 *    - Value: Full vote JSON data
 *    - Purpose: Store complete vote information
 *
 * WHY NOT A SINGLE STRUCTURE?
 * ---------------------------
 * - Hash alone: No ordering, HSCAN count is just a hint (can't guarantee batch size)
 * - Sorted Set alone: Can only store score (number), not arbitrary JSON data
 * - Streams: More complex, designed for different use cases (consumer groups, etc.)
 *
 * LUA SCRIPTS FOR ATOMICITY
 * -------------------------
 * Using two structures creates a sync risk: if ZADD succeeds but HSET fails,
 * data is inconsistent. Lua scripts solve this by executing atomically.
 *
 * But the MAIN reason we need Lua is the RACE CONDITION ON DELETE:
 *
 * Problem scenario:
 *   1. Flush reads vote A (timestamp 100) from Valkey
 *   2. User submits vote B (timestamp 200) - overwrites vote A in Valkey
 *   3. Flush completes DB write for vote A
 *   4. Flush deletes from Valkey - BUT NOW IT DELETES VOTE B!
 *   5. Vote B is lost forever - terrible UX, user's vote disappeared
 *
 * Solution: Conditional delete with score check
 *   - CLEANUP_VOTES_SCRIPT only deletes if current score == expected score
 *   - In the scenario above, score is now 200 (vote B), expected is 100 (vote A)
 *   - Delete is skipped, vote B survives and gets processed next flush
 *
 * We could have used Hash alone with a compare-and-delete Lua script, but since
 * we need Lua anyway, we might as well use Sorted Set + Hash for proper ordering
 * and guaranteed batch size limits.
 *
 * AT-LEAST-ONCE DELIVERY
 * ----------------------
 * - Votes are deleted from Valkey ONLY after successful PostgreSQL transaction
 * - On flush error: votes remain in Valkey, will be retried on next flush
 * - PostgreSQL handles duplicates via onConflictDoNothing - if a vote was
 *   partially written before a crash, the retry will skip already-inserted rows
 *
 * MEMORY MANAGEMENT
 * -----------------
 * Script objects from valkey-glide must call release() on shutdown to prevent
 * memory leaks. The shutdown() method handles this.
 *
 * ============================================================================
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, sql, inArray, type SQL } from "drizzle-orm";
import {
    voteTable,
    voteContentTable,
    opinionTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import { zodVotingAction, type VotingOption } from "@/shared/types/zod.js";
import { z } from "zod";
import { log } from "@/app.js";
import { nowZeroMs } from "@/shared/util.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import {
    enqueueConversationForMathWork,
    scheduleAnalysisUpdate,
    type AnalysisSchedule,
} from "@/shared-backend/analysisScheduler.js";
import { Script } from "@valkey/valkey-glide";
import type { ValkeyRef } from "./valkeyRef.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";
import {
    createVoteNotifications,
    getNotificationRecipients,
} from "./notification.js";
import { createConversationViewSnapshotsFromCurrentState } from "./conversationViewSnapshot.js";

// ============================================================================
// Lua Scripts (inline for bundling - no separate files needed)
// ============================================================================

/**
 * Atomic add vote script:
 * - ZADD with GT + CH options (only update if new score > existing, return 1 if changed)
 * - HSET only if ZADD succeeded (newer timestamp)
 *
 * KEYS[1] = sorted set key (index)
 * KEYS[2] = hash key (data)
 * ARGV[1] = member (userId:opinionId)
 * ARGV[2] = score (timestamp in ms)
 * ARGV[3] = data (JSON vote)
 *
 * Returns: 1 if added/updated, 0 if rejected (older timestamp)
 */
export const ADD_VOTE_SCRIPT = `
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

/**
 * Atomic cleanup votes script:
 * - Only delete if current score matches expected (vote hasn't been updated)
 * - Removes from both sorted set and hash atomically
 *
 * KEYS[1] = sorted set key (index)
 * KEYS[2] = hash key (data)
 * ARGV = pairs of [member, expectedScore, member, expectedScore, ...]
 *
 * Returns: number of entries deleted
 */
export const CLEANUP_VOTES_SCRIPT = `
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
// Types and Schemas
// ============================================================================

// Zod schema for BufferedVote - used to safely parse data from Valkey and local queue
const zodBufferedVote = z.object({
    userId: z.string(),
    opinionId: z.number(),
    opinionContentId: z.number(),
    conversationId: z.number(),
    vote: zodVotingAction,
    timestamp: z.coerce.date(),
});
type BufferedVote = z.infer<typeof zodBufferedVote>;

interface CounterDelta {
    numAgrees: number;
    numDisagrees: number;
    numPasses: number;
}

export interface VoteBuffer {
    add: (params: { vote: BufferedVote }) => void;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
    getBufferSize: () => number;
}

interface CreateVoteBufferParams {
    db: PostgresJsDatabase;
    valkeyRef: ValkeyRef;
    flushIntervalMs: number;
    valkeyBatchLimit: number;
    realtimeSSEManager?: RealtimeSSEManager;
}

// ============================================================================
// Vote Buffer Implementation
// ============================================================================

/**
 * Create vote buffer with encapsulated state
 *
 * Architecture:
 * - In-memory mode: Fastest, but lost on restart (single instance)
 * - Valkey mode: Persistent, works across instances (production)
 *   - Sorted Set: Orders votes by timestamp for fair processing
 *   - Hash: Stores full vote JSON data
 *   - Lua scripts: Atomic operations to prevent sync issues
 *
 * Batching reduces opinion UPDATE frequency from 100x/sec to 1x/sec
 * during heavy voting periods, eliminating hot row contention.
 *
 * Pattern: Closure-based immutable API (Zustand-style)
 * - State encapsulated in closure
 * - Exposed functions never mutate external parameters
 * - Pure functional interface
 */
export function createVoteBuffer({
    db,
    valkeyRef,
    flushIntervalMs,
    valkeyBatchLimit,
    realtimeSSEManager,
}: CreateVoteBufferParams): VoteBuffer {
    // Encapsulated mutable state (private to closure)
    const pendingVotes = new Map<string, BufferedVote>();
    let isShuttingDown = false;
    let flushInProgress: Promise<void> | null = null;

    // Lua script objects (created once, reused for all calls)
    // IMPORTANT: Must call release() on shutdown to prevent memory leaks
    let addVoteScript: Script | undefined = new Script(ADD_VOTE_SCRIPT);
    let cleanupVotesScript: Script | undefined = new Script(
        CLEANUP_VOTES_SCRIPT,
    );

    const getValkey = (): Valkey | undefined => valkeyRef.current;

    // Helper functions
    const getVoteKey = (userId: string, opinionId: number): string =>
        `${userId}:${String(opinionId)}`;

    const calculateCounterDelta = (
        existingVote: VotingOption | null,
        newVote: VotingOption | "cancel",
    ): CounterDelta => {
        const delta: CounterDelta = {
            numAgrees: 0,
            numDisagrees: 0,
            numPasses: 0,
        };

        // Remove existing vote
        if (existingVote === "agree") {
            delta.numAgrees = -1;
        } else if (existingVote === "disagree") {
            delta.numDisagrees = -1;
        } else if (existingVote === "pass") {
            delta.numPasses = -1;
        }

        // Add new vote
        if (newVote === "agree") {
            delta.numAgrees += 1;
        } else if (newVote === "disagree") {
            delta.numDisagrees += 1;
        } else if (newVote === "pass") {
            delta.numPasses += 1;
        }
        // cancel: no addition

        return delta;
    };

    /**
     * Add vote to buffer (or update existing buffered vote)
     * Uses Lua script for atomic ZADD GT + HSET in Valkey
     */
    const add = ({ vote }: { vote: BufferedVote }): void => {
        if (isShuttingDown) {
            throw new Error("[VoteBuffer] Cannot add votes during shutdown");
        }

        const key = getVoteKey(vote.userId, vote.opinionId);

        // In-memory: Deduplicate by key (last write wins)
        const wasExisting = pendingVotes.has(key);
        pendingVotes.set(key, vote);

        // Valkey: Atomic add using Lua script
        const valkey = getValkey();
        if (valkey !== undefined && addVoteScript !== undefined) {
            const score = vote.timestamp.getTime();
            const data = JSON.stringify(vote);

            valkey
                .invokeScript(addVoteScript, {
                    keys: [
                        VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                        VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                    ],
                    args: [key, String(score), data],
                })
                .catch((error: unknown) => {
                    log.error(
                        error,
                        "[VoteBuffer] Failed to add vote to Valkey buffer",
                    );
                });
        }

        // Log vote addition/update
        if (wasExisting) {
            log.info(
                `[VoteBuffer] Updated buffered vote (${vote.vote}) for user ${vote.userId} on opinion ${String(vote.opinionId)} (duplicate within flush window)`,
            );
        } else {
            log.info(
                `[VoteBuffer] Added vote (${vote.vote}) for user ${vote.userId} on opinion ${String(vote.opinionId)} (buffer size: ${String(pendingVotes.size)})`,
            );
        }
    };

    /**
     * Flush all buffered votes to database
     * Groups votes by opinion to UPDATE each opinion counter only once
     */
    const flush = async (): Promise<void> => {
        // Get votes from in-memory buffer and validate with safeParse
        const localVotes = Array.from(pendingVotes.values());
        pendingVotes.clear();

        // Validate local votes with safeParse (skip invalid entries)
        const validLocalVotes: BufferedVote[] = [];
        for (const vote of localVotes) {
            const result = zodBufferedVote.safeParse(vote);
            if (result.success) {
                validLocalVotes.push(result.data);
            } else {
                log.warn(
                    `[VoteBuffer] Skipping invalid local vote: ${result.error.message}`,
                );
            }
        }

        // Build vote map from valid local votes (dedup by key, keep latest timestamp)
        const voteMap = new Map(
            validLocalVotes.map((v) => [getVoteKey(v.userId, v.opinionId), v]),
        );

        // Track processed Valkey entries for cleanup (member + score pairs)
        const processedValkeyEntries: { member: string; score: number }[] = [];

        // Get votes from Valkey sorted set + hash (if configured)
        const valkey = getValkey();
        if (valkey !== undefined) {
            try {
                // Fetch oldest N members from sorted set (ordered by timestamp)
                const members = await valkey.zrange(
                    VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                    { start: 0, end: valkeyBatchLimit - 1 },
                );

                if (members.length > 0) {
                    // Get scores for conditional cleanup
                    const membersWithScores = await valkey.zrangeWithScores(
                        VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                        { start: 0, end: valkeyBatchLimit - 1 },
                    );

                    // Get vote data from hash
                    const voteDataList = await valkey.hmget(
                        VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                        members,
                    );

                    // Process each vote
                    // Note: membersWithScores has same length as members (same ZRANGE query)
                    for (let i = 0; i < members.length; i++) {
                        const member = String(members[i]);
                        const voteJson = voteDataList[i];
                        const scoreEntry = membersWithScores[i];
                        const score = scoreEntry.score;

                        // Always track for cleanup (even if data is invalid/missing)
                        processedValkeyEntries.push({ member, score });

                        if (voteJson === null) {
                            log.warn(
                                `[VoteBuffer] Skipping Valkey vote with missing data: ${member}`,
                            );
                            continue;
                        }

                        try {
                            const parsed: unknown = JSON.parse(
                                String(voteJson),
                            );
                            const result = zodBufferedVote.safeParse(parsed);

                            if (result.success) {
                                const valkeyVote = result.data;
                                const key = getVoteKey(
                                    valkeyVote.userId,
                                    valkeyVote.opinionId,
                                );

                                // Last write wins (prefer newer timestamp)
                                const existing = voteMap.get(key);
                                if (
                                    existing === undefined ||
                                    valkeyVote.timestamp > existing.timestamp
                                ) {
                                    voteMap.set(key, valkeyVote);
                                }
                            } else {
                                log.warn(
                                    `[VoteBuffer] Skipping invalid Valkey vote: ${result.error.message}`,
                                );
                            }
                        } catch {
                            log.warn(
                                `[VoteBuffer] Skipping malformed JSON in Valkey: ${member}`,
                            );
                        }
                    }

                    log.info(
                        `[VoteBuffer] Fetched ${String(members.length)} votes from Valkey`,
                    );
                }
            } catch (error: unknown) {
                log.error(
                    error,
                    "[VoteBuffer] Failed to fetch votes from Valkey",
                );
            }
        }

        const batch = Array.from(voteMap.values());

        if (batch.length === 0) {
            return;
        }

        log.info(`[VoteBuffer] Flushing ${String(batch.length)} votes`);

        // PostgreSQL parameter limit: ~65,535
        // vote_content: 3 columns, vote_table: 3 columns
        // Worst case: 3+3 = 6 params per vote
        const MAX_VOTES_PER_TRANSACTION = 5000;
        const batches: BufferedVote[][] = [];

        for (let i = 0; i < batch.length; i += MAX_VOTES_PER_TRANSACTION) {
            batches.push(batch.slice(i, i + MAX_VOTES_PER_TRANSACTION));
        }

        log.info(
            `[VoteBuffer] Processing ${String(batch.length)} votes in ${String(batches.length)} transaction(s)`,
        );

        // Track genuinely new voters per opinion across all transaction batches.
        // Only first-time voters (no prior vote on the opinion) trigger notifications.
        // Vote changes (agree→disagree) are excluded.
        const newVotersPerOpinion = new Map<
            number,
            { voterIds: Set<string>; conversationId: number }
        >();
        const analysisSchedules: AnalysisSchedule[] = [];

        try {
            for (const [batchIndex, voteBatch] of batches.entries()) {
                log.info(
                    `[VoteBuffer] Processing transaction ${String(batchIndex + 1)}/${String(batches.length)} with ${String(voteBatch.length)} votes`,
                );

                await db.transaction(async (tx) => {
                    const counterDeltas = new Map<number, CounterDelta>();
                    const conversationIds = new Set<number>();

                    // OPTIMIZATION: Bulk check for existing votes (single query)
                    // IMPORTANT: Must happen BEFORE vote INSERTs to detect new participants correctly
                    // Build WHERE clause: (authorId = X AND opinionId = Y) OR (authorId = Z AND opinionId = W) ...
                    const existingVotesMap = new Map<
                        string,
                        {
                            voteTableId: number;
                            existingVote: VotingOption | null;
                        }
                    >();

                    if (voteBatch.length > 0) {
                        const orConditions = voteBatch.map((vote) =>
                            and(
                                eq(voteTable.authorId, vote.userId),
                                eq(voteTable.opinionId, vote.opinionId),
                            ),
                        );

                        const existingVotesResult = await tx
                            .select({
                                userId: voteTable.authorId,
                                opinionId: voteTable.opinionId,
                                voteTableId: voteTable.id,
                                optionChosen: voteContentTable.vote,
                            })
                            .from(voteTable)
                            .leftJoin(
                                voteContentTable,
                                eq(
                                    voteContentTable.id,
                                    voteTable.currentContentId,
                                ),
                            )
                            .where(sql`${sql.join(orConditions, sql` OR `)}`);

                        for (const row of existingVotesResult) {
                            const key = getVoteKey(row.userId, row.opinionId);
                            existingVotesMap.set(key, {
                                voteTableId: row.voteTableId,
                                existingVote: row.optionChosen,
                            });
                        }

                        log.info(
                            `[VoteBuffer] Bulk check: ${String(existingVotesMap.size)} existing votes found out of ${String(voteBatch.length)} in batch`,
                        );
                    }

                    // Step 1: Separate new votes from existing votes
                    const newVotes: BufferedVote[] = [];
                    const existingVotes: {
                        vote: BufferedVote;
                        voteTableId: number;
                        existingVote: VotingOption | null;
                    }[] = [];

                    for (const vote of voteBatch) {
                        const key = getVoteKey(vote.userId, vote.opinionId);
                        const existingVoteData = existingVotesMap.get(key);

                        if (existingVoteData) {
                            // Vote already exists (update case)
                            existingVotes.push({
                                vote,
                                voteTableId: existingVoteData.voteTableId,
                                existingVote: existingVoteData.existingVote,
                            });
                        } else {
                            // Vote doesn't exist (insert case)
                            newVotes.push(vote);
                        }
                    }

                    log.info(
                        `[VoteBuffer] Vote breakdown: ${String(newVotes.length)} new, ${String(existingVotes.length)} updates`,
                    );

                    // Step 2: Bulk INSERT new vote_table rows with conflict handling
                    const successfullyInsertedVotes: {
                        vote: BufferedVote;
                        voteTableId: number;
                    }[] = [];

                    if (newVotes.length > 0) {
                        const newVoteTableResults = await tx
                            .insert(voteTable)
                            .values(
                                newVotes.map((vote) => ({
                                    authorId: vote.userId,
                                    opinionId: vote.opinionId,
                                    currentContentId: null,
                                })),
                            )
                            .onConflictDoNothing()
                            .returning({
                                id: voteTable.id,
                                authorId: voteTable.authorId,
                                opinionId: voteTable.opinionId,
                            });

                        // Check if some votes were skipped due to race condition
                        if (newVoteTableResults.length < newVotes.length) {
                            const conflictCount =
                                newVotes.length - newVoteTableResults.length;
                            log.warn(
                                `[VoteBuffer] Race condition: ${String(conflictCount)} vote(s) skipped (already inserted by concurrent batch)`,
                            );
                        }

                        // Build map of successfully inserted votes
                        const voteTableIdMap = new Map<string, number>();
                        for (const result of newVoteTableResults) {
                            const key = getVoteKey(
                                result.authorId,
                                result.opinionId,
                            );
                            voteTableIdMap.set(key, result.id);
                        }

                        // Filter newVotes (only successfully inserted votes)
                        for (const vote of newVotes) {
                            const key = getVoteKey(vote.userId, vote.opinionId);
                            const voteTableId = voteTableIdMap.get(key);
                            if (voteTableId !== undefined) {
                                successfullyInsertedVotes.push({
                                    vote,
                                    voteTableId,
                                });
                            }
                        }
                    }

                    // Step 3: Combine all vote processing data (existing + new)
                    interface VoteProcessingData {
                        vote: BufferedVote;
                        voteTableId: number;
                        existingVote: VotingOption | null;
                    }

                    const voteProcessingData: VoteProcessingData[] = [
                        ...existingVotes,
                        ...successfullyInsertedVotes.map(
                            ({ vote, voteTableId }) => ({
                                vote,
                                voteTableId,
                                existingVote: null,
                            }),
                        ),
                    ];

                    // Step 4: Calculate counter deltas
                    for (const data of voteProcessingData) {
                        const delta = calculateCounterDelta(
                            data.existingVote,
                            data.vote.vote,
                        );

                        // Accumulate deltas by opinion
                        const currentDelta = counterDeltas.get(
                            data.vote.opinionId,
                        ) ?? {
                            numAgrees: 0,
                            numDisagrees: 0,
                            numPasses: 0,
                        };
                        counterDeltas.set(data.vote.opinionId, {
                            numAgrees: currentDelta.numAgrees + delta.numAgrees,
                            numDisagrees:
                                currentDelta.numDisagrees + delta.numDisagrees,
                            numPasses: currentDelta.numPasses + delta.numPasses,
                        });

                        // Track conversations for queue update
                        conversationIds.add(data.vote.conversationId);
                    }

                    // Step 5: Bulk INSERT vote contents (for non-cancel votes)
                    const voteContentValues: {
                        voteId: number;
                        opinionContentId: number;
                        vote: VotingOption;
                    }[] = [];

                    const voteContentIndexMap = new Map<number, number>(); // Maps vote index to position in voteContentValues

                    for (let i = 0; i < voteProcessingData.length; i++) {
                        const data = voteProcessingData[i];
                        if (data.vote.vote !== "cancel") {
                            voteContentIndexMap.set(
                                i,
                                voteContentValues.length,
                            );
                            voteContentValues.push({
                                voteId: data.voteTableId,
                                opinionContentId: data.vote.opinionContentId,
                                vote: data.vote.vote,
                            });
                        }
                    }

                    let voteContentResults: { id: number }[] = [];
                    if (voteContentValues.length > 0) {
                        voteContentResults = await tx
                            .insert(voteContentTable)
                            .values(voteContentValues)
                            .returning({ id: voteContentTable.id });
                    }

                    // Step 6: Bulk UPDATE vote_table.current_content_id using CASE WHEN
                    if (voteProcessingData.length > 0) {
                        // Build CASE WHEN statement for current_content_id
                        const caseStatements: SQL[] = [];
                        const voteIds: number[] = [];

                        for (let i = 0; i < voteProcessingData.length; i++) {
                            const data = voteProcessingData[i];
                            voteIds.push(data.voteTableId);

                            if (data.vote.vote === "cancel") {
                                caseStatements.push(
                                    sql`WHEN ${voteTable.id} = ${data.voteTableId} THEN NULL`,
                                );
                            } else {
                                const contentIndex = voteContentIndexMap.get(i);
                                if (contentIndex !== undefined) {
                                    const contentId =
                                        voteContentResults[contentIndex].id;
                                    caseStatements.push(
                                        sql`WHEN ${voteTable.id} = ${data.voteTableId} THEN ${contentId}::int`,
                                    );
                                }
                            }
                        }

                        // Only execute UPDATE if we have case statements
                        if (caseStatements.length > 0 && voteIds.length > 0) {
                            // Single UPDATE with CASE WHEN using Drizzle
                            const inClause = sql.join(
                                voteIds.map((id) => sql`${id}`),
                                sql`, `,
                            );

                            await tx
                                .update(voteTable)
                                .set({
                                    currentContentId: sql`(CASE ${sql.join(caseStatements, sql` `)} END)::int`,
                                })
                                .where(sql`${voteTable.id} IN (${inClause})`);
                        }
                    }

                    // Batch UPDATE opinion counters (one UPDATE per opinion)
                    let opinionsUpdated = 0;
                    for (const [opinionId, delta] of counterDeltas.entries()) {
                        if (
                            delta.numAgrees === 0 &&
                            delta.numDisagrees === 0 &&
                            delta.numPasses === 0
                        ) {
                            continue; // No change
                        }

                        await tx
                            .update(opinionTable)
                            .set({
                                numAgrees: sql`${opinionTable.numAgrees} + ${delta.numAgrees}`,
                                numDisagrees: sql`${opinionTable.numDisagrees} + ${delta.numDisagrees}`,
                                numPasses: sql`${opinionTable.numPasses} + ${delta.numPasses}`,
                            })
                            .where(eq(opinionTable.id, opinionId));

                        opinionsUpdated++;
                    }

                    log.info(
                        `[VoteBuffer] Updated opinion counters for ${String(opinionsUpdated)} opinion(s) out of ${String(counterDeltas.size)} with changes`,
                    );

                    if (conversationIds.size > 0) {
                        await tx
                            .update(conversationTable)
                            .set({ lastReactedAt: nowZeroMs() })
                            .where(
                                inArray(
                                    conversationTable.id,
                                    Array.from(conversationIds),
                                ),
                            );

                        log.info(
                            `[VoteBuffer] Updated lastReactedAt for ${String(conversationIds.size)} conversation(s)`,
                        );

                        for (const conversationId of conversationIds) {
                            await createConversationViewSnapshotsFromCurrentState(
                                {
                                    db: tx,
                                    conversationId,
                                    viewReason: "conversation_content_updated",
                                    emitCommentStatsRealtimeEvent: true,
                                },
                            );
                        }
                    }

                    // Schedule opinion-group analysis once per affected conversation.
                    log.info(
                        `[VoteBuffer] Scheduling analysis for ${String(conversationIds.size)} affected conversation(s)`,
                    );
                    for (const conversationId of conversationIds) {
                        const analysisSchedule = await scheduleAnalysisUpdate({
                            db: tx,
                            conversationId,
                            log,
                        });
                        log.info(
                            `[VoteBuffer] Scheduled analysis for conversationId=${String(conversationId)} conversationSlugId=${analysisSchedule.conversationSlugId} dataGeneration=${String(analysisSchedule.dataGeneration)} specs=${String(analysisSchedule.scheduledSpecCount)}`,
                        );
                        analysisSchedules.push(analysisSchedule);
                    }

                    // Track genuinely new voters for notification purposes.
                    // A voter is "new" only if they had no prior vote on this opinion
                    // (existingVotesMap has no entry). Vote changes are excluded.
                    for (const vote of voteBatch) {
                        if (vote.vote === "cancel") continue;
                        const key = getVoteKey(vote.userId, vote.opinionId);
                        const existingVoteData = existingVotesMap.get(key);
                        if (existingVoteData === undefined) {
                            const existing = newVotersPerOpinion.get(
                                vote.opinionId,
                            );
                            if (existing) {
                                existing.voterIds.add(vote.userId);
                            } else {
                                newVotersPerOpinion.set(vote.opinionId, {
                                    voterIds: new Set([vote.userId]),
                                    conversationId: vote.conversationId,
                                });
                            }
                        }
                    }
                });

                log.info(
                    `[VoteBuffer] Transaction ${String(batchIndex + 1)}/${String(batches.length)} completed`,
                );
            }

            log.info(
                `[VoteBuffer] Successfully flushed ${String(batch.length)} votes across ${String(batches.length)} transaction(s)`,
            );

            for (const schedule of analysisSchedules) {
                const valkey = getValkey();
                log.info(
                    `[VoteBuffer] Queueing scheduled math work conversationId=${String(schedule.conversationId)} conversationSlugId=${schedule.conversationSlugId} valkey=${valkey === undefined ? "missing" : "connected"}`,
                );
                enqueueConversationForMathWork({
                    valkey,
                    schedule,
                    log,
                });
            }

            // Create vote notifications AFTER all transactions committed
            // Wrapped in try/catch to never fail the flush
            try {
                // Use newVotersPerOpinion (collected during transactions) instead
                // of re-scanning the batch. This ensures only genuinely first-time
                // voters trigger notifications — vote changes are excluded.
                const votesPerOpinion = newVotersPerOpinion;

                if (votesPerOpinion.size > 0) {
                    // Batch query opinion metadata (authorId + isSeed)
                    const opinionIds = Array.from(votesPerOpinion.keys());
                    const opinionMetadata = await db
                        .select({
                            id: opinionTable.id,
                            authorId: opinionTable.authorId,
                            isSeed: opinionTable.isSeed,
                        })
                        .from(opinionTable)
                        .where(inArray(opinionTable.id, opinionIds));

                    const opinionMetadataMap = new Map(
                        opinionMetadata.map((o) => [o.id, o]),
                    );

                    for (const [
                        opinionId,
                        voteData,
                    ] of votesPerOpinion.entries()) {
                        const opinion = opinionMetadataMap.get(opinionId);
                        if (!opinion) continue;

                        const voterIdsArray = Array.from(voteData.voterIds);

                        if (opinion.isSeed) {
                            // Seed opinion: notify conversation owner + org members
                            const { recipientUserIds } =
                                await getNotificationRecipients({
                                    db,
                                    conversationId: voteData.conversationId,
                                    excludeUserIds: voterIdsArray,
                                });
                            if (recipientUserIds.length > 0) {
                                await createVoteNotifications({
                                    db,
                                    recipientUserIds,
                                    opinionId,
                                    conversationId: voteData.conversationId,
                                    numVotes: voteData.voterIds.size,
                                    isSeed: true,
                                    realtimeSSEManager,
                                });
                            }
                        } else {
                            // Regular opinion: notify opinion author only
                            const selfVoted = voteData.voterIds.has(
                                opinion.authorId,
                            );
                            const externalVoteCount =
                                voteData.voterIds.size - (selfVoted ? 1 : 0);
                            if (externalVoteCount > 0) {
                                await createVoteNotifications({
                                    db,
                                    recipientUserIds: [opinion.authorId],
                                    opinionId,
                                    conversationId: voteData.conversationId,
                                    numVotes: externalVoteCount,
                                    isSeed: false,
                                    realtimeSSEManager,
                                });
                            }
                        }
                    }

                    log.info(
                        `[VoteBuffer] Created vote notifications for ${String(votesPerOpinion.size)} opinion(s)`,
                    );
                }
            } catch (notifError: unknown) {
                log.error(
                    notifError,
                    "[VoteBuffer] Failed to create vote notifications (votes were flushed successfully)",
                );
            }

            // At-least-once: Delete from Valkey only after successful processing
            // Use Lua script for conditional delete (only if score matches)
            const cleanupValkey = getValkey();
            if (
                cleanupValkey !== undefined &&
                cleanupVotesScript !== undefined &&
                processedValkeyEntries.length > 0
            ) {
                try {
                    // Build args array: [member1, score1, member2, score2, ...]
                    const cleanupArgs: string[] = [];
                    for (const entry of processedValkeyEntries) {
                        cleanupArgs.push(entry.member, String(entry.score));
                    }

                    const deletedCount = (await cleanupValkey.invokeScript(
                        cleanupVotesScript,
                        {
                            keys: [
                                VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                                VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                            ],
                            args: cleanupArgs,
                        },
                    )) as number;

                    log.info(
                        `[VoteBuffer] Cleaned up ${String(deletedCount)} entries from Valkey (${String(processedValkeyEntries.length)} attempted)`,
                    );
                } catch (error: unknown) {
                    log.error(
                        error,
                        "[VoteBuffer] Failed to cleanup Valkey entries (will be retried on next flush)",
                    );
                }
            }
        } catch (error: unknown) {
            log.error(error, "[VoteBuffer] Failed to flush votes");
            // At-least-once: Votes remain in Valkey for retry on next flush
            // No need to re-add - Valkey is the source of truth
            throw error;
        }
    };

    /**
     * Graceful shutdown: flush pending votes before exiting
     */
    const shutdown = async (): Promise<void> => {
        isShuttingDown = true;

        log.info("[VoteBuffer] Shutting down, flushing pending votes...");

        clearInterval(flushInterval);

        // Wait for any in-flight flush to complete before the final flush,
        // so no pending Valkey operations remain when the connection is closed.
        if (flushInProgress !== null) {
            await flushInProgress;
        }

        await flush();

        // Release Lua script objects to prevent memory leaks
        if (addVoteScript !== undefined) {
            addVoteScript.release();
            addVoteScript = undefined;
        }
        if (cleanupVotesScript !== undefined) {
            cleanupVotesScript.release();
            cleanupVotesScript = undefined;
        }

        log.info("[VoteBuffer] Shutdown complete");
    };

    /**
     * Get current buffer size (for monitoring)
     */
    const getBufferSize = (): number => {
        return pendingVotes.size;
    };

    // Start automatic flush interval
    const flushInterval: NodeJS.Timeout = setInterval(() => {
        flushInProgress ??= flush()
            .catch((error: unknown) => {
                log.error(error, "[VoteBuffer] Flush interval error");
            })
            .finally(() => {
                flushInProgress = null;
            });
    }, flushIntervalMs);

    // Prevent interval from keeping process alive (Node.js specific)
    flushInterval.unref();

    // Return immutable API (Zustand-style closure pattern)
    return {
        add,
        flush,
        shutdown,
        getBufferSize,
    };
}
