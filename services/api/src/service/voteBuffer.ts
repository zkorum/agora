import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, sql, isNotNull, isNull, type SQL } from "drizzle-orm";
import {
    voteTable,
    voteContentTable,
    voteProofTable,
    opinionTable,
    conversationTable,
    conversationUpdateQueueTable,
    opinionModerationTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { VotingOption } from "@/shared/types/zod.js";
import { log } from "@/app.js";
import { nowZeroMs } from "@/shared/util.js";
import type { Redis } from "ioredis";

export interface BufferedVote {
    userId: string;
    opinionId: number;
    opinionContentId: number;
    conversationId: number;
    vote: VotingOption | "cancel";
    didWrite: string;
    proof: string;
    timestamp: Date;
}

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
    redis?: Redis;
    redisVoteBufferKey: string;
    flushIntervalMs?: number;
}

/**
 * Create vote buffer with encapsulated state
 *
 * Architecture:
 * - In-memory mode: Fastest, but lost on restart (single instance)
 * - Redis mode: Persistent, works across instances (production)
 *
 * Batching reduces opinion UPDATE frequency from 100x/sec to 1x/sec
 * during heavy voting periods, eliminating hot row contention.
 *
 * Pattern: Closure-based immutable API (Zustand-style)
 * - State encapsulated in closure
 * - Exposed functions never mutate external parameters
 * - Pure functional interface
 *
 * TODO: Evaluate Redis key strategy - per-opinion vs global queue
 */
export function createVoteBuffer({
    db,
    redis = undefined,
    redisVoteBufferKey,
    flushIntervalMs = 1000,
}: CreateVoteBufferParams): VoteBuffer {
    // Encapsulated mutable state (private to closure)
    const pendingVotes = new Map<string, BufferedVote>();
    let isShuttingDown = false;

    // Helper functions (pure)
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
     * Last write wins for votes within the same flush interval
     */
    const add = ({ vote }: { vote: BufferedVote }): void => {
        if (isShuttingDown) {
            throw new Error("[VoteBuffer] Cannot add votes during shutdown");
        }

        const key = getVoteKey(vote.userId, vote.opinionId);

        // In-memory: Deduplicate by key (last write wins)
        const wasExisting = pendingVotes.has(key);
        pendingVotes.set(key, vote);

        // Redis: Add to queue (if configured)
        if (redis !== undefined) {
            redis
                .rpush(redisVoteBufferKey, JSON.stringify(vote))
                .catch((error: unknown) => {
                    log.error(
                        error,
                        "[VoteBuffer] Failed to push vote to Redis buffer",
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
        // Get votes from in-memory buffer
        let batch = Array.from(pendingVotes.values());
        pendingVotes.clear();

        // Get votes from Redis (if configured)
        if (redis !== undefined) {
            try {
                const redisVotes = await redis.lrange(
                    redisVoteBufferKey,
                    0,
                    -1,
                );
                await redis.del(redisVoteBufferKey);

                const parsedRedisVotes = redisVotes.map((v) =>
                    JSON.parse(v) as BufferedVote,
                );

                // Merge with in-memory votes (deduplicate by key, last write wins)
                const voteMap = new Map(
                    batch.map((v) => [getVoteKey(v.userId, v.opinionId), v]),
                );

                for (const redisVote of parsedRedisVotes) {
                    const key = getVoteKey(
                        redisVote.userId,
                        redisVote.opinionId,
                    );
                    // Last write wins (prefer Redis if timestamp newer)
                    const existing = voteMap.get(key);
                    if (
                        !existing ||
                        new Date(redisVote.timestamp) >
                            new Date(existing.timestamp)
                    ) {
                        voteMap.set(key, redisVote);
                    }
                }

                batch = Array.from(voteMap.values());
            } catch (error: unknown) {
                log.error(
                    error,
                    "[VoteBuffer] Failed to fetch votes from Redis",
                );
            }
        }

        if (batch.length === 0) {
            return;
        }

        log.info(`[VoteBuffer] Flushing ${String(batch.length)} votes`);

        // PostgreSQL parameter limit: ~65,535
        // vote_proof: 5 columns, vote_content: 4 columns, vote_table: 3 columns
        // Worst case: 5+4+3 = 12 params per vote
        // Safe batch size: 5000 votes = ~60,000 params
        const MAX_VOTES_PER_TRANSACTION = 5000;
        const batches: BufferedVote[][] = [];

        for (let i = 0; i < batch.length; i += MAX_VOTES_PER_TRANSACTION) {
            batches.push(batch.slice(i, i + MAX_VOTES_PER_TRANSACTION));
        }

        log.info(
            `[VoteBuffer] Processing ${String(batch.length)} votes in ${String(batches.length)} transaction(s)`,
        );

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

                    // STEP 0: Detect potential new participants BEFORE inserting votes
                    // This must happen before vote INSERTs to correctly identify first-time voters
                    const participantCountDeltas = new Map<
                        number,
                        Set<string>
                    >();

                    for (const vote of voteBatch) {
                        const key = getVoteKey(vote.userId, vote.opinionId);
                        const existingVoteData = existingVotesMap.get(key);

                        // Check if this is a new participant (first active vote in conversation)
                        if (!existingVoteData && vote.vote !== "cancel") {
                            // New vote that's not a cancel - potentially a new participant
                            if (
                                !participantCountDeltas.has(vote.conversationId)
                            ) {
                                participantCountDeltas.set(
                                    vote.conversationId,
                                    new Set(),
                                );
                            }
                            const participantSet = participantCountDeltas.get(vote.conversationId);
                            if (participantSet) {
                                participantSet.add(vote.userId);
                            }
                        } else if (
                            existingVoteData?.existingVote === null &&
                            vote.vote !== "cancel"
                        ) {
                            // Restoring a previously canceled vote - potentially a returning participant
                            if (
                                !participantCountDeltas.has(vote.conversationId)
                            ) {
                                participantCountDeltas.set(
                                    vote.conversationId,
                                    new Set(),
                                );
                            }
                            const participantSet = participantCountDeltas.get(vote.conversationId);
                            if (participantSet) {
                                participantSet.add(vote.userId);
                            }
                        }
                    }

                    log.info(
                        `[VoteBuffer] Detected ${String(participantCountDeltas.size)} conversation(s) with potential new participants`,
                    );

                    // Query existing participants BEFORE inserting new votes
                    const participantDeltasToApply = new Map<
                        number,
                        number
                    >();

                    if (participantCountDeltas.size > 0) {
                        for (const [
                            conversationId,
                            potentialNewUsers,
                        ] of participantCountDeltas.entries()) {
                            // Query: Check if these users already have any active votes in this conversation
                            // Must match exact same WHERE clause as calculateConversationCounters
                            const existingParticipants = await tx
                                .select({ authorId: voteTable.authorId })
                                .from(voteTable)
                                .innerJoin(
                                    opinionTable,
                                    eq(voteTable.opinionId, opinionTable.id),
                                )
                                .innerJoin(
                                    userTable,
                                    eq(voteTable.authorId, userTable.id),
                                )
                                .leftJoin(
                                    opinionModerationTable,
                                    eq(
                                        opinionModerationTable.opinionId,
                                        opinionTable.id,
                                    ),
                                )
                                .where(
                                    and(
                                        eq(
                                            opinionTable.conversationId,
                                            conversationId,
                                        ),
                                        sql`${voteTable.authorId} IN (${sql.join(
                                            Array.from(potentialNewUsers).map(
                                                (userId) => sql`${userId}`,
                                            ),
                                            sql`, `,
                                        )})`,
                                        isNotNull(
                                            opinionTable.currentContentId,
                                        ), // don't count deleted opinions
                                        isNotNull(voteTable.currentContentId), // don't count deleted votes
                                        isNull(opinionModerationTable.id), // don't count moderated opinions
                                        eq(userTable.isDeleted, false), // don't count deleted users
                                    ),
                                );

                            const existingParticipantIds = new Set(
                                existingParticipants.map((row) => row.authorId),
                            );

                            // Count truly new participants (not in existing list)
                            let newParticipantCount = 0;
                            for (const userId of potentialNewUsers) {
                                if (!existingParticipantIds.has(userId)) {
                                    newParticipantCount++;
                                }
                            }

                            if (newParticipantCount > 0) {
                                participantDeltasToApply.set(
                                    conversationId,
                                    newParticipantCount,
                                );
                                log.info(
                                    `[VoteBuffer] Conversation ${String(conversationId)}: ${String(newParticipantCount)} new participant(s) confirmed`,
                                );
                            } else {
                                log.info(
                                    `[VoteBuffer] Conversation ${String(conversationId)}: 0 new participants (${String(potentialNewUsers.size)} user(s) already participating)`,
                                );
                            }
                        }
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

                    // Step 2: Bulk INSERT new vote_table rows
                    let newVoteTableIds: number[] = [];
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
                            .returning({ id: voteTable.id });

                        newVoteTableIds = newVoteTableResults.map((r) => r.id);
                    }

                    // Step 3: Combine all vote processing data (existing + new)
                    interface VoteProcessingData {
                        vote: BufferedVote;
                        voteTableId: number;
                        existingVote: VotingOption | null;
                    }

                    const voteProcessingData: VoteProcessingData[] = [
                        ...existingVotes,
                        ...newVotes.map((vote, index) => ({
                            vote,
                            voteTableId: newVoteTableIds[index],
                            existingVote: null,
                        })),
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

                    // Step 5: Bulk INSERT vote proofs
                    const voteProofValues = voteProcessingData.map((data) => ({
                        type:
                            data.vote.vote === "cancel"
                                ? ("deletion" as const)
                                : ("creation" as const),
                        voteId: data.voteTableId,
                        authorDid: data.vote.didWrite,
                        proof: data.vote.proof,
                        proofVersion: 1,
                    }));

                    const voteProofResults = await tx
                        .insert(voteProofTable)
                        .values(voteProofValues)
                        .returning({ id: voteProofTable.id });

                    // Step 6: Bulk INSERT vote contents (for non-cancel votes)
                    const voteContentValues: {
                        voteId: number;
                        voteProofId: number;
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
                                voteProofId: voteProofResults[i].id,
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

                    // Step 7: Bulk UPDATE vote_table.current_content_id using CASE WHEN
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
                                const contentIndex =
                                    voteContentIndexMap.get(i);
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

                    // Step 8: Update conversation voteCount (delta-based, batched)
                    // Track voteCount changes per conversation
                    const voteCountDeltas = new Map<number, number>();

                    for (const vote of voteBatch) {
                        const key = getVoteKey(vote.userId, vote.opinionId);
                        const existingVoteData = existingVotesMap.get(key);

                        let delta = 0;
                        if (!existingVoteData) {
                            // New vote: +1
                            delta = vote.vote === "cancel" ? 0 : 1;
                        } else {
                            // Existing vote
                            if (
                                vote.vote === "cancel" &&
                                existingVoteData.existingVote !== null
                            ) {
                                // Canceling an active vote: -1
                                delta = -1;
                            } else if (
                                vote.vote !== "cancel" &&
                                existingVoteData.existingVote === null
                            ) {
                                // Restoring a canceled vote: +1
                                delta = 1;
                            }
                            // else: vote change (agree→disagree): delta = 0
                        }

                        if (delta !== 0) {
                            const currentDelta =
                                voteCountDeltas.get(vote.conversationId) ?? 0;
                            voteCountDeltas.set(
                                vote.conversationId,
                                currentDelta + delta,
                            );
                        }
                    }

                    // Apply voteCount deltas in single batched UPDATE
                    if (voteCountDeltas.size > 0) {
                        const caseClauses: SQL[] = [];
                        const conversationIdsToUpdate: number[] = [];

                        for (const [
                            conversationId,
                            delta,
                        ] of voteCountDeltas.entries()) {
                            conversationIdsToUpdate.push(conversationId);
                            caseClauses.push(
                                sql`WHEN ${conversationTable.id} = ${conversationId} THEN ${delta}`,
                            );
                        }

                        const inClause = sql.join(
                            conversationIdsToUpdate.map((id) => sql`${id}`),
                            sql`, `,
                        );

                        await tx
                            .update(conversationTable)
                            .set({
                                voteCount: sql`${conversationTable.voteCount} + (CASE ${sql.join(caseClauses, sql` `)} ELSE 0 END)`,
                            })
                            .where(
                                sql`${conversationTable.id} IN (${inClause})`,
                            );

                        const voteCountChanges = Array.from(
                            voteCountDeltas.entries(),
                        ).map(([id, delta]) => ({
                            conversationId: id,
                            delta,
                        }));
                        log.info(
                            `[VoteBuffer] Updated voteCount for ${String(voteCountDeltas.size)} conversation(s): ${JSON.stringify(voteCountChanges)}`,
                        );
                    } else {
                        log.info("[VoteBuffer] No voteCount changes to apply");
                    }

                    // Step 9: Apply participantCount deltas (calculated earlier in STEP 0)
                    // ParticipantCount detection and querying happened BEFORE vote INSERTs
                    // to correctly identify first-time voters
                    if (participantDeltasToApply.size > 0) {
                            const participantCaseClauses: SQL[] = [];
                            const conversationIdsToUpdateParticipant: number[] =
                                [];

                            for (const [
                                conversationId,
                                delta,
                            ] of participantDeltasToApply.entries()) {
                                conversationIdsToUpdateParticipant.push(
                                    conversationId,
                                );
                                participantCaseClauses.push(
                                    sql`WHEN ${conversationTable.id} = ${conversationId} THEN ${delta}`,
                                );
                            }

                            const participantInClause = sql.join(
                                conversationIdsToUpdateParticipant.map(
                                    (id) => sql`${id}`,
                                ),
                                sql`, `,
                            );

                            await tx
                                .update(conversationTable)
                                .set({
                                    participantCount: sql`${conversationTable.participantCount} + (CASE ${sql.join(participantCaseClauses, sql` `)} ELSE 0 END)`,
                                })
                                .where(
                                    sql`${conversationTable.id} IN (${participantInClause})`,
                                );

                        log.info(
                            `[VoteBuffer] Updated participantCount for ${String(participantDeltasToApply.size)} conversation(s)`,
                        );
                    }

                    // UPDATE conversation queue (one UPSERT per conversation)
                    for (const conversationId of conversationIds) {
                        await tx
                            .insert(conversationUpdateQueueTable)
                            .values({
                                conversationId: conversationId,
                                requestedAt: nowZeroMs(),
                                processedAt: null,
                            })
                            .onConflictDoUpdate({
                                target: conversationUpdateQueueTable.conversationId,
                                set: {
                                    requestedAt: nowZeroMs(),
                                    processedAt: null,
                                },
                            });
                    }
                });

                log.info(
                    `[VoteBuffer] Transaction ${String(batchIndex + 1)}/${String(batches.length)} completed`,
                );
            }

            log.info(
                `[VoteBuffer] Successfully flushed ${String(batch.length)} votes across ${String(batches.length)} transaction(s)`,
            );
        } catch (error: unknown) {
            log.error(error, "[VoteBuffer] Failed to flush votes");
            // Re-add failed votes to buffer for retry
            // Keep only the LATEST vote per user/opinion (last write wins)
            const failedVotesByKey = new Map<string, BufferedVote>();

            for (const vote of batch) {
                const key = getVoteKey(vote.userId, vote.opinionId);
                const existing = failedVotesByKey.get(key);

                // Keep latest timestamp
                if (
                    !existing ||
                    new Date(vote.timestamp) > new Date(existing.timestamp)
                ) {
                    failedVotesByKey.set(key, vote);
                }
            }

            // Merge failed votes back into buffer, preserving newer votes already buffered
            for (const [key, failedVote] of failedVotesByKey) {
                const bufferedVote = pendingVotes.get(key);

                // Only re-add if no vote exists, or failed vote is newer
                if (
                    !bufferedVote ||
                    new Date(failedVote.timestamp) >
                        new Date(bufferedVote.timestamp)
                ) {
                    pendingVotes.set(key, failedVote);
                }
            }

            log.info(
                `[VoteBuffer] Re-added ${String(failedVotesByKey.size)} failed votes to buffer (deduplicated from ${String(batch.length)} events)`,
            );

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

        await flush();

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
        flush().catch((error: unknown) => {
            log.error(error, "[VoteBuffer] Flush interval error");
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
