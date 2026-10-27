/**
 * Acceptance means the action reached Valkey, not durable PostgreSQL storage.
 * Batch persistence fences source/lifecycle changes and older concurrent flushes.
 * All cache I/O remains outside the batch's database transaction.
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, or, sql, inArray, isNull, type SQL } from "drizzle-orm";
import {
    voteTable,
    voteContentTable,
    opinionTable,
    opinionContentTable,
    conversationTable,
    opinionModerationTable,
    userTable,
} from "@/shared-backend/schema.js";
import { getEligibleParticipantIdsForAnalysis } from "@/shared-backend/surveyAnalysis.js";
import type { VotingOption } from "@/shared/types/zod.js";
import { z } from "zod";
import { log } from "@/app.js";
import { logApiError } from "@/logging/privacy.js";
import type { LogContext } from "@/shared-backend/logPrivacy.js";
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
import { queueOpinionVoteCountsUpdatedEvent } from "./realtimeEventOutbox.js";
import { createVoteBufferProgress } from "./voteBufferProgress.js";
import { partitionVoteBatches } from "./voteBatches.js";
import { currentOpinionSourceCondition } from "@/shared-backend/opinionEligibility.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import { httpErrors } from "@fastify/sensible";
import {
    getBufferedVoteKey,
    parseBufferedVote,
    type BufferedVote,
    type VoteBufferInput,
} from "./voteBufferTypes.js";
import { finalizeCurrentPolisConversation } from "./conversationFinalization.js";
import { sealVoteBuffer } from "./voteBufferLifecycle.js";
import { buildClosingVoteDrainQuery } from "./voteQueries.js";

// ============================================================================
// Lua Scripts (inline for bundling - no separate files needed)
// ============================================================================

/**
 * Atomic acceptance/coalescing, with a cache sequence fencing concurrent flushes.
 * Client sequences suppress delayed retries even after queue cleanup. Ordering
 * guards share Valkey's accepted-loss contract and expire after one idle day.
 *
 * KEYS[1] = sorted set key (index)
 * KEYS[2] = hash key (data)
 * ARGV[1] = member (userId:epoch:opinionId)
 * ARGV[2] = score (timestamp in ms)
 * ARGV[3] = data (JSON vote)
 *
 * KEYS[3..7] = opinion, conversation, lifecycle gate, client order, sequence prefixes
 * ARGV[4] = last persisted sequence (repairs a missing cache counter)
 * Returns: 1 accepted, 0 closed, 2 already superseded by this client's action.
 */
export const ADD_VOTE_SCRIPT = `
local indexKey = KEYS[1]
local dataKey = KEYS[2]
local member = ARGV[1]
local score = tonumber(ARGV[2])
local vote = cjson.decode(ARGV[3])
local orderKey = nil
local gate = redis.call('GET', KEYS[5] .. vote.voteBufferEpoch)
if gate == 'closed' then
    return 0
end
if vote.clientAction then
    orderKey = KEYS[6] .. member .. ':' .. vote.clientAction.sessionId
    local previous = tonumber(redis.call('GET', orderKey) or '0')
    if previous >= vote.clientAction.sequence then return 2 end
end
local sequenceKey = KEYS[7] .. vote.voteBufferEpoch
local sequence = tonumber(redis.call('GET', sequenceKey) or '0')
local baseline = tonumber(ARGV[4] or '0')
if sequence < baseline then redis.call('SET', sequenceKey, baseline) end
vote.bufferSequence = redis.call('INCR', sequenceKey)
redis.call('EXPIRE', sequenceKey, 86400)
local data = cjson.encode(vote)
redis.call('ZADD', indexKey, score, member)
redis.call('HSET', dataKey, member, data)
local opinionId = string.match(member, ':([^:]+)$')
redis.call('HSET', KEYS[3] .. opinionId, member, data)
redis.call('HSET', KEYS[4] .. vote.conversationId, member, '1')
if orderKey then redis.call('SET', orderKey, vote.clientAction.sequence, 'EX', 86400) end
return 1
`;

export const READ_VOTES_SCRIPT = `
local members = redis.call('ZRANGE', KEYS[1], 0, tonumber(ARGV[1]) - 1)
local votes = {}
for _, member in ipairs(members) do
    local data = redis.call('HGET', KEYS[2], member)
    if data then
        table.insert(votes, {member, data})
    else
        redis.call('ZREM', KEYS[1], member)
    end
end
return votes
`;

/**
 * Atomic cleanup votes script:
 * - Only delete the exact payload that was persisted, including for equal timestamps
 * - Removes from both sorted set and hash atomically
 *
 * KEYS[1] = sorted set key (index)
 * KEYS[2] = hash key (data)
 * KEYS[3] = opinion lookup prefix
 * KEYS[4] = conversation lookup prefix
 * ARGV = pairs of [member, expectedData, member, expectedData, ...]
 *
 * Returns: number of entries deleted
 */
export const CLEANUP_VOTES_SCRIPT = `
local indexKey = KEYS[1]
local dataKey = KEYS[2]
local deleted = 0

for i = 1, #ARGV, 2 do
    local member = ARGV[i]
    local expectedData = ARGV[i + 1]
    local currentData = redis.call('HGET', dataKey, member)

    if currentData and currentData == expectedData then
        redis.call('ZREM', indexKey, member)
        redis.call('HDEL', dataKey, member)
        local opinionId = string.match(member, ':([^:]+)$')
        redis.call('HDEL', KEYS[3] .. opinionId, member)
        local ok, vote = pcall(cjson.decode, currentData)
        if ok and type(vote) == 'table' and vote.conversationId then
            redis.call('HDEL', KEYS[4] .. vote.conversationId, member)
        end
        deleted = deleted + 1
    end
end
return deleted
`;

// ============================================================================
// Types and Schemas
// ============================================================================

interface CounterDelta {
    numAgrees: number;
    numDisagrees: number;
    numPasses: number;
}

const enqueueResultSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export interface VoteBuffer {
    add: (params: {
        vote: VoteBufferInput;
    }) => Promise<undefined | "conversation_closed">;
    hasBlockingVotes: (params: {
        db: PostgresJsDatabase;
        opinionId: number;
        authorId: string;
        isSeed: boolean;
    }) => Promise<boolean>;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
}

interface CreateVoteBufferParams {
    db: PostgresJsDatabase;
    valkeyRef: ValkeyRef;
    flushIntervalMs: number;
    valkeyBatchLimit: number;
    stallWarningMs?: number;
    realtimeSSEManager?: RealtimeSSEManager;
}

type VoteTransaction = Parameters<
    Parameters<PostgresJsDatabase["transaction"]>[0]
>[0];

// ============================================================================
// Vote Buffer Implementation
// ============================================================================

/**
 * Create vote buffer with encapsulated state
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
    stallWarningMs = 30_000,
    realtimeSSEManager,
}: CreateVoteBufferParams): VoteBuffer {
    // Encapsulated mutable state (private to closure)
    const opinionBufferPrefix = `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:opinion:`;
    const conversationBufferPrefix = `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:conversation:`;
    const gatePrefix = `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:gate:`;
    let isShuttingDown = false;
    let flushInProgress: Promise<void> | undefined;

    // Lua script objects (created once, reused for all calls)
    // IMPORTANT: Must call release() on shutdown to prevent memory leaks
    let addVoteScript: Script | undefined = new Script(ADD_VOTE_SCRIPT);
    let cleanupVotesScript: Script | undefined = new Script(
        CLEANUP_VOTES_SCRIPT,
    );
    const readVotesScript = new Script(READ_VOTES_SCRIPT);

    const getValkey = (): Valkey | undefined => valkeyRef.current;

    const completeClosingDrains = async (): Promise<void> => {
        const writer = getPrimaryDatabase(db);
        const closing = await buildClosingVoteDrainQuery(writer);
        for (const conversation of closing) {
            const valkey = getValkey();
            if (valkey !== undefined) {
                try {
                    await sealVoteBuffer({
                        valkey,
                        epoch: conversation.epoch,
                    });
                    if (
                        (await valkey.hlen(
                            `${conversationBufferPrefix}${String(conversation.id)}`,
                        )) > 0
                    )
                        continue;
                } catch (error) {
                    // Cache loss is accepted. The durable lifecycle fence still
                    // prevents late batches from changing finalized mathematics.
                    logApiError({
                        logger: log,
                        level: "error",
                        event: {
                            event: "vote_buffer",
                            voteBufferOperation: "fetch",
                        },
                        error,
                    });
                }
            }
            await writer.transaction(async (tx) => {
                const updated = await tx
                    .update(conversationTable)
                    .set({ voteBufferDrained: true })
                    .where(
                        and(
                            eq(conversationTable.id, conversation.id),
                            eq(
                                conversationTable.voteBufferEpoch,
                                conversation.epoch,
                            ),
                            eq(conversationTable.isClosed, true),
                            eq(conversationTable.voteBufferDrained, false),
                        ),
                    )
                    .returning({ id: conversationTable.id });
                if (updated.length === 0) return;
                if (
                    !(await finalizeCurrentPolisConversation({
                        db: tx,
                        conversationId: conversation.id,
                    }))
                ) {
                    await scheduleAnalysisUpdate({
                        db: tx,
                        conversationId: conversation.id,
                        log,
                        advanceGeneration: false,
                    });
                }
            });
        }
    };

    // Helper functions
    const getVoteKey = ({
        userId,
        opinionId,
    }: Pick<BufferedVote, "userId" | "opinionId">): string =>
        `${userId}:${String(opinionId)}`;

    const calculateCounterDelta = ({
        existingVote,
        newVote,
    }: {
        existingVote: VotingOption | null;
        newVote: VotingOption | "cancel";
    }): CounterDelta => {
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
     * Never acknowledge a failed enqueue or silently fall back to local memory.
     */
    const add = async ({
        vote,
    }: {
        vote: VoteBufferInput;
    }): Promise<undefined | "conversation_closed"> => {
        if (isShuttingDown) {
            throw new Error("[VoteBuffer] Cannot add votes during shutdown");
        }

        const valkey = getValkey();
        const { scope: validatedScope, ...action } = vote;
        let voteBufferEpoch = validatedScope?.epoch;
        let minimumSequence = validatedScope?.minimumSequence ?? 0;
        // Normal voting supplies these from its existing source-validation read.
        // Internal statement/seed callers resolve the scope here instead.
        if (voteBufferEpoch === undefined) {
            const rows = await getPrimaryDatabase(db)
                .select({
                    epoch: conversationTable.voteBufferEpoch,
                    isClosed: conversationTable.isClosed,
                    sequence: voteTable.bufferSequence,
                    previousEpoch: voteTable.bufferEpoch,
                })
                .from(conversationTable)
                .leftJoin(
                    voteTable,
                    and(
                        eq(voteTable.opinionId, vote.opinionId),
                        eq(voteTable.authorId, vote.userId),
                    ),
                )
                .where(eq(conversationTable.id, vote.conversationId));
            const scope = rows.at(0);
            if (scope === undefined || scope.isClosed)
                return "conversation_closed";
            voteBufferEpoch = scope.epoch;
            minimumSequence =
                scope.previousEpoch === scope.epoch ? (scope.sequence ?? 0) : 0;
        }
        if (valkey !== undefined && addVoteScript !== undefined) {
            const score = vote.timestamp.getTime();
            const data = JSON.stringify({ ...action, voteBufferEpoch });

            try {
                const accepted = enqueueResultSchema.parse(
                    await valkey.invokeScript(addVoteScript, {
                        keys: [
                            VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                            VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                            opinionBufferPrefix,
                            conversationBufferPrefix,
                            gatePrefix,
                            `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:order:`,
                            `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:sequence:`,
                        ],
                        args: [
                            getBufferedVoteKey({ ...vote, voteBufferEpoch }),
                            String(score),
                            data,
                            String(minimumSequence),
                        ],
                    }),
                );
                return accepted === 0 ? "conversation_closed" : undefined;
            } catch (error: unknown) {
                logApiError({
                    logger: log,
                    level: "error",
                    event: {
                        event: "vote_buffer",
                        voteBufferOperation: "enqueue",
                    },
                    error,
                });
                throw httpErrors.serviceUnavailable(
                    "Vote buffer is unavailable",
                );
            }
        }
        throw httpErrors.serviceUnavailable("Vote buffer is unavailable");
    };

    const hasBlockingVotes = async ({
        db: authoritativeDb,
        opinionId,
        authorId,
        isSeed,
    }: Parameters<VoteBuffer["hasBlockingVotes"]>[0]): Promise<boolean> => {
        const valkey = getValkey();
        if (valkey === undefined)
            throw httpErrors.serviceUnavailable("Vote buffer is unavailable");
        const payloads = await valkey.hvals(
            `${opinionBufferPrefix}${String(opinionId)}`,
        );
        const pending = payloads.flatMap((value) => {
            const vote = parseBufferedVote(String(value));
            return vote?.opinionId === opinionId &&
                vote.vote !== "cancel" &&
                (isSeed || vote.userId !== authorId)
                ? [vote]
                : [];
        });
        if (pending.length === 0) return false;
        const opinions = await authoritativeDb
            .select({
                conversationId: opinionTable.conversationId,
                contentId: opinionTable.currentContentId,
                epoch: conversationTable.voteBufferEpoch,
            })
            .from(opinionTable)
            .innerJoin(
                conversationTable,
                eq(conversationTable.id, opinionTable.conversationId),
            )
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            .leftJoin(
                opinionModerationTable,
                and(
                    eq(opinionModerationTable.opinionId, opinionTable.id),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(opinionTable.id, opinionId),
                    currentOpinionSourceCondition(),
                    isNull(opinionModerationTable.id),
                ),
            );
        const opinion = opinions.at(0);
        if (opinion === undefined) return false;
        const candidates = pending.filter(
            (vote) =>
                vote.opinionContentId === opinion.contentId &&
                vote.voteBufferEpoch === opinion.epoch,
        );
        if (candidates.length === 0) return false;
        const eligibleParticipantIds =
            await getEligibleParticipantIdsForAnalysis({
                db: authoritativeDb,
                conversationId: opinion.conversationId,
                candidateParticipantIds: candidates.map((vote) => vote.userId),
            });
        return candidates.some(
            (vote) =>
                eligibleParticipantIds === undefined ||
                eligibleParticipantIds.has(vote.userId),
        );
    };

    /**
     * Flush all buffered votes to database
     * Groups votes by opinion to UPDATE each opinion counter only once
     */
    const flushBatch = async (
        progress: ReturnType<typeof createVoteBufferProgress>,
    ): Promise<void> => {
        const processedValkeyEntries: { member: string; data: string }[] = [];
        const batch: BufferedVote[] = [];

        // Get votes from Valkey sorted set + hash (if configured)
        const valkey = getValkey();
        if (valkey !== undefined) {
            progress.enterStage("fetch_votes");
            try {
                const entries = z
                    .array(z.tuple([z.string(), z.string()]))
                    .parse(
                        await valkey.invokeScript(readVotesScript, {
                            keys: [
                                VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                                VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                            ],
                            args: [String(valkeyBatchLimit)],
                        }),
                    );
                progress.completeStage();

                if (entries.length > 0) {
                    for (const [member, voteJson] of entries) {
                        processedValkeyEntries.push({ member, data: voteJson });
                        const parsed = parseBufferedVote(voteJson);
                        if (
                            parsed !== undefined &&
                            member === getBufferedVoteKey(parsed)
                        )
                            batch.push(parsed);
                    }

                    log.info(
                        {
                            event: "vote_buffer",
                            voteCount: entries.length,
                        } satisfies LogContext,
                        "[VoteBuffer] Fetched votes from Valkey",
                    );
                }
            } catch (error: unknown) {
                logApiError({
                    logger: log,
                    level: "error",
                    event: {
                        event: "vote_buffer",
                        voteBufferOperation: "fetch",
                        ...progress.context(),
                    },
                    error,
                });
            } finally {
                progress.stop();
            }
        }

        if (batch.length === 0) {
            const cleanupValkey = getValkey();
            if (
                cleanupValkey !== undefined &&
                cleanupVotesScript !== undefined &&
                processedValkeyEntries.length > 0
            ) {
                await cleanupValkey.invokeScript(cleanupVotesScript, {
                    keys: [
                        VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                        VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                        opinionBufferPrefix,
                        conversationBufferPrefix,
                    ],
                    args: processedValkeyEntries.flatMap(({ member, data }) => [
                        member,
                        data,
                    ]),
                });
            }
            return;
        }

        const flushStartedAt = performance.now();
        log.info(
            {
                event: "vote_buffer",
                voteCount: batch.length,
            } satisfies LogContext,
            "[VoteBuffer] Flushing votes",
        );

        const batches = partitionVoteBatches(batch);
        const capturedPayloads = new Map(
            processedValkeyEntries.map(({ member, data }) => [member, data]),
        );

        log.info(
            {
                event: "vote_buffer",
                voteCount: batch.length,
                transactionCount: batches.length,
            } satisfies LogContext,
            "[VoteBuffer] Processing vote transactions",
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
            for (const [
                batchIndex,
                { conversationId, votes: voteBatch },
            ] of batches.entries()) {
                const transactionStartedAt = performance.now();
                log.info(
                    {
                        event: "vote_buffer",
                        transactionIndex: batchIndex + 1,
                        transactionCount: batches.length,
                        voteCount: voteBatch.length,
                    } satisfies LogContext,
                    "[VoteBuffer] Processing transaction",
                );

                progress.enterStage("begin_transaction");
                // Recheck coalesced payloads before taking any PostgreSQL locks.
                const currentPayloads =
                    valkey === undefined
                        ? []
                        : await valkey.hmget(
                              VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                              voteBatch.map(getBufferedVoteKey),
                          );
                const currentVotes = voteBatch.filter((vote, index) => {
                    const payload = currentPayloads[index];
                    return (
                        payload != null &&
                        String(payload) ===
                            capturedPayloads.get(getBufferedVoteKey(vote))
                    );
                });
                if (currentVotes.length === 0) continue;
                const persistVoteBatch = async (
                    tx: VoteTransaction,
                ): Promise<void> => {
                    progress.enterStage("lock_conversations");
                    const scopes = await tx
                        .select({
                            epoch: conversationTable.voteBufferEpoch,
                            drained: conversationTable.voteBufferDrained,
                            isClosed: conversationTable.isClosed,
                            finalized: conversationTable.closedFinalizedAt,
                            contentId: conversationTable.currentContentId,
                        })
                        .from(conversationTable)
                        .where(eq(conversationTable.id, conversationId))
                        .for("no key update");
                    progress.enterStage("recheck_votes");
                    const scope = scopes.at(0);
                    if (
                        scope?.contentId == null ||
                        scope.finalized !== null ||
                        (scope.isClosed && scope.drained)
                    )
                        return;
                    const sources = await tx
                        .select({
                            id: opinionTable.id,
                            contentId: opinionTable.currentContentId,
                        })
                        .from(opinionTable)
                        .innerJoin(
                            userTable,
                            eq(userTable.id, opinionTable.authorId),
                        )
                        .leftJoin(
                            opinionModerationTable,
                            and(
                                eq(
                                    opinionModerationTable.opinionId,
                                    opinionTable.id,
                                ),
                                isNull(opinionModerationTable.deletedAt),
                            ),
                        )
                        .where(
                            and(
                                inArray(
                                    opinionTable.id,
                                    currentVotes.map((vote) => vote.opinionId),
                                ),
                                currentOpinionSourceCondition(),
                                isNull(opinionModerationTable.id),
                            ),
                        )
                        .for("share", { of: opinionTable });
                    const sourceVersions = new Map(
                        sources.map((source) => [source.id, source.contentId]),
                    );
                    const candidates = currentVotes.filter(
                        (vote) =>
                            vote.voteBufferEpoch === scope.epoch &&
                            (vote.vote === "cancel" ||
                                sourceVersions.get(vote.opinionId) ===
                                    vote.opinionContentId),
                    );
                    if (candidates.length === 0) {
                        progress.enterStage("commit_transaction");
                        return;
                    }
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
                            bufferEpoch: string | null;
                            bufferSequence: number;
                        }
                    >();

                    if (candidates.length > 0) {
                        const orConditions = candidates.map((vote) =>
                            and(
                                eq(voteTable.authorId, vote.userId),
                                eq(voteTable.opinionId, vote.opinionId),
                            ),
                        );

                        progress.enterStage("read_existing_votes");
                        const existingVotesResult = await tx
                            .select({
                                userId: voteTable.authorId,
                                opinionId: voteTable.opinionId,
                                voteTableId: voteTable.id,
                                optionChosen: voteContentTable.vote,
                                bufferEpoch: voteTable.bufferEpoch,
                                bufferSequence: voteTable.bufferSequence,
                            })
                            .from(voteTable)
                            .leftJoin(
                                voteContentTable,
                                eq(
                                    voteContentTable.id,
                                    voteTable.currentContentId,
                                ),
                            )
                            .where(or(...orConditions));

                        for (const row of existingVotesResult) {
                            const key = getVoteKey(row);
                            existingVotesMap.set(key, {
                                voteTableId: row.voteTableId,
                                existingVote: row.optionChosen,
                                bufferEpoch: row.bufferEpoch,
                                bufferSequence: row.bufferSequence,
                            });
                        }

                        log.info(
                            {
                                event: "vote_buffer",
                                count: existingVotesMap.size,
                                voteCount: voteBatch.length,
                            } satisfies LogContext,
                            "[VoteBuffer] Checked existing votes",
                        );
                    }

                    const applicableVotes = candidates.filter((vote) => {
                        const previous = existingVotesMap.get(getVoteKey(vote));
                        return (
                            previous?.bufferEpoch !== scope.epoch ||
                            previous.bufferSequence < vote.bufferSequence
                        );
                    });
                    if (applicableVotes.length === 0) return;
                    progress.enterStage("persist_votes");
                    // Step 1: Separate new votes from existing votes
                    const newVotes: BufferedVote[] = [];
                    const existingVotes: {
                        vote: BufferedVote;
                        voteTableId: number;
                        existingVote: VotingOption | null;
                    }[] = [];

                    for (const vote of applicableVotes) {
                        const key = getVoteKey(vote);
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
                        {
                            event: "vote_buffer",
                            newVoteCount: newVotes.length,
                            updatedVoteCount: existingVotes.length,
                        } satisfies LogContext,
                        "[VoteBuffer] Vote breakdown",
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
                                {
                                    event: "vote_buffer",
                                    voteCount: conflictCount,
                                } satisfies LogContext,
                                "[VoteBuffer] Concurrent vote inserts skipped",
                            );
                        }

                        // Build map of successfully inserted votes
                        const voteTableIdMap = new Map<string, number>();
                        for (const result of newVoteTableResults) {
                            const key = getVoteKey({
                                userId: result.authorId,
                                opinionId: result.opinionId,
                            });
                            voteTableIdMap.set(key, result.id);
                        }

                        // Filter newVotes (only successfully inserted votes)
                        for (const vote of newVotes) {
                            const key = getVoteKey(vote);
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
                        const delta = calculateCounterDelta({
                            existingVote: data.existingVote,
                            newVote: data.vote.vote,
                        });

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
                        const sequenceStatements: SQL[] = [];
                        const voteIds: number[] = [];

                        for (let i = 0; i < voteProcessingData.length; i++) {
                            const data = voteProcessingData[i];
                            voteIds.push(data.voteTableId);
                            sequenceStatements.push(
                                sql`WHEN ${voteTable.id} = ${data.voteTableId} THEN ${data.vote.bufferSequence}::bigint`,
                            );

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
                            await tx
                                .update(voteTable)
                                .set({
                                    currentContentId: sql`(CASE ${sql.join(caseStatements, sql` `)} END)::int`,
                                    bufferEpoch: scope.epoch,
                                    bufferSequence: sql`(CASE ${sql.join(sequenceStatements, sql` `)} END)::bigint`,
                                })
                                .where(inArray(voteTable.id, voteIds));
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
                        {
                            event: "vote_buffer",
                            opinionCount: opinionsUpdated,
                            count: counterDeltas.size,
                        } satisfies LogContext,
                        "[VoteBuffer] Updated opinion counters",
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
                            {
                                event: "vote_buffer",
                                count: conversationIds.size,
                            } satisfies LogContext,
                            "[VoteBuffer] Updated conversation activity",
                        );
                    }

                    // Schedule opinion-group analysis once per affected conversation.
                    log.info(
                        {
                            event: "vote_buffer",
                            count: conversationIds.size,
                        } satisfies LogContext,
                        "[VoteBuffer] Scheduling analysis",
                    );
                    for (const conversationId of conversationIds) {
                        const analysisSchedule = await scheduleAnalysisUpdate({
                            db: tx,
                            conversationId,
                            log,
                        });
                        log.info(
                            {
                                event: "vote_buffer",
                                conversationId,
                                conversationSlugId:
                                    analysisSchedule.conversationSlugId,
                                dataGeneration: analysisSchedule.dataGeneration,
                                specCount: analysisSchedule.scheduledSpecCount,
                            } satisfies LogContext,
                            "[VoteBuffer] Scheduled analysis",
                        );
                        analysisSchedules.push(analysisSchedule);
                        await queueOpinionVoteCountsUpdatedEvent({
                            db: tx,
                            conversationSlugId:
                                analysisSchedule.conversationSlugId,
                            opinionIds: [...counterDeltas.keys()],
                        });
                    }

                    // Track genuinely new voters for notification purposes.
                    // A voter is "new" only if they had no prior vote on this opinion
                    // (existingVotesMap has no entry). Vote changes are excluded.
                    for (const vote of applicableVotes) {
                        if (vote.vote === "cancel") continue;
                        const key = getVoteKey(vote);
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
                    progress.enterStage("commit_transaction");
                };
                await db.transaction(async (tx) => {
                    try {
                        await persistVoteBatch(tx);
                    } catch (error) {
                        // Capture the failed operation before the driver starts
                        // rollback, which is a separate asynchronous wait.
                        logApiError({
                            logger: log,
                            level: "error",
                            event: {
                                event: "vote_buffer",
                                voteBufferOperation: "flush",
                                ...progress.context(),
                            },
                            error,
                        });
                        progress.stop();
                        progress.enterStage("rollback_transaction");
                        throw error;
                    }
                });
                progress.completeStage();

                log.info(
                    {
                        event: "vote_buffer",
                        transactionIndex: batchIndex + 1,
                        transactionCount: batches.length,
                        durationMs: performance.now() - transactionStartedAt,
                    } satisfies LogContext,
                    "[VoteBuffer] Transaction completed",
                );
            }

            log.info(
                {
                    event: "vote_buffer",
                    voteCount: batch.length,
                    transactionCount: batches.length,
                    durationMs: performance.now() - flushStartedAt,
                } satisfies LogContext,
                "[VoteBuffer] Successfully flushed votes",
            );

            for (const schedule of analysisSchedules) {
                const valkey = getValkey();
                log.info(
                    {
                        event: "math_queue",
                        conversationId: schedule.conversationId,
                        conversationSlugId: schedule.conversationSlugId,
                        valkeyAvailable: valkey !== undefined,
                    } satisfies LogContext,
                    "[VoteBuffer] Queueing scheduled math work",
                );
                enqueueConversationForMathWork({
                    valkey,
                    schedule,
                    log,
                });
            }

            // Create vote notifications AFTER all transactions committed
            // Wrapped in try/catch to never fail the flush
            progress.enterStage("notify");
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
                            opinionSlugId: opinionTable.slugId,
                            opinionContent: opinionContentTable.content,
                            conversationSlugId: conversationTable.slugId,
                        })
                        .from(opinionTable)
                        .innerJoin(
                            opinionContentTable,
                            eq(
                                opinionContentTable.id,
                                opinionTable.currentContentId,
                            ),
                        )
                        .innerJoin(
                            conversationTable,
                            eq(
                                conversationTable.id,
                                opinionTable.conversationId,
                            ),
                        )
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
                                    conversationSlugId:
                                        opinion.conversationSlugId,
                                    opinionSlugId: opinion.opinionSlugId,
                                    opinionContent: opinion.opinionContent,
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
                                    conversationSlugId:
                                        opinion.conversationSlugId,
                                    opinionSlugId: opinion.opinionSlugId,
                                    opinionContent: opinion.opinionContent,
                                    numVotes: externalVoteCount,
                                    isSeed: false,
                                    realtimeSSEManager,
                                });
                            }
                        }
                    }

                    log.info(
                        {
                            event: "vote_buffer",
                            opinionCount: votesPerOpinion.size,
                        } satisfies LogContext,
                        "[VoteBuffer] Created vote notifications",
                    );
                }
                progress.completeStage();
            } catch (notifError: unknown) {
                logApiError({
                    logger: log,
                    level: "error",
                    event: {
                        event: "vote_buffer",
                        voteBufferOperation: "notify",
                        ...progress.context(),
                    },
                    error: notifError,
                });
            } finally {
                progress.stop();
            }

            // At-least-once: Delete from Valkey only after successful processing
            // Delete only the exact payload that was persisted.
            const cleanupValkey = getValkey();
            if (
                cleanupValkey !== undefined &&
                cleanupVotesScript !== undefined &&
                processedValkeyEntries.length > 0
            ) {
                progress.enterStage("cleanup");
                try {
                    const cleanupArgs: string[] = [];
                    for (const entry of processedValkeyEntries) {
                        cleanupArgs.push(entry.member, entry.data);
                    }

                    const deletedCount = z.number().parse(
                        await cleanupValkey.invokeScript(cleanupVotesScript, {
                            keys: [
                                VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX,
                                VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA,
                                opinionBufferPrefix,
                                conversationBufferPrefix,
                            ],
                            args: cleanupArgs,
                        }),
                    );
                    progress.completeStage();

                    log.info(
                        {
                            event: "vote_buffer",
                            count: deletedCount,
                            voteCount: processedValkeyEntries.length,
                        } satisfies LogContext,
                        "[VoteBuffer] Cleaned up Valkey entries",
                    );
                } catch (error: unknown) {
                    logApiError({
                        logger: log,
                        level: "error",
                        event: {
                            event: "vote_buffer",
                            voteBufferOperation: "cleanup",
                            ...progress.context(),
                        },
                        error,
                    });
                } finally {
                    progress.stop();
                }
            }
        } catch (error: unknown) {
            logApiError({
                logger: log,
                level: "error",
                event: {
                    event: "vote_buffer",
                    voteBufferOperation: "flush",
                    ...progress.context(),
                },
                error,
            });
            // Shared entries remain available for retry; persistence is replay-safe
            // even if an instance loses the commit response or cache cleanup fails.
            throw error;
        }
    };

    const flush = (): Promise<void> => {
        if (flushInProgress !== undefined) return flushInProgress;
        const run = async (): Promise<void> => {
            const progress = createVoteBufferProgress({
                log,
                stallWarningMs,
            });
            try {
                await flushBatch(progress);
                await completeClosingDrains();
            } finally {
                progress.stop();
                flushInProgress = undefined;
            }
        };
        flushInProgress = run();
        return flushInProgress;
    };

    /**
     * Graceful shutdown: flush pending votes before exiting
     */
    const shutdown = async (): Promise<void> => {
        isShuttingDown = true;

        log.info("[VoteBuffer] Shutting down, flushing pending votes...");

        clearInterval(flushInterval);

        try {
            if (flushInProgress !== undefined) await flushInProgress;
            await flush();
        } finally {
            addVoteScript?.release();
            addVoteScript = undefined;
            cleanupVotesScript?.release();
            cleanupVotesScript = undefined;
            readVotesScript.release();
        }

        log.info("[VoteBuffer] Shutdown complete");
    };

    // Start automatic flush interval
    const scheduledFlush = async (): Promise<void> => {
        // Joining a stuck promise on every tick would accumulate waiters forever.
        if (flushInProgress !== undefined) return;
        try {
            await flush();
        } catch (error: unknown) {
            logApiError({
                logger: log,
                level: "error",
                event: { event: "vote_buffer", voteBufferOperation: "flush" },
                error,
            });
        }
    };
    const flushInterval: NodeJS.Timeout = setInterval(() => {
        void scheduledFlush();
    }, flushIntervalMs);

    // Prevent interval from keeping process alive (Node.js specific)
    flushInterval.unref();

    // Return immutable API (Zustand-style closure pattern)
    return {
        add,
        hasBlockingVotes,
        flush,
        shutdown,
    };
}
