/**
 * Conversation Counter Recalculation
 *
 * This module provides functions to recalculate conversation statistics
 * (opinion_count, vote_count, participant_count) from actual database records.
 *
 * Why this exists:
 * - Counters can drift due to soft deletes (currentContentId set to null)
 * - Atomic increments don't account for deletes/updates
 * - This reconciliation function ensures counters match reality
 */

import { eq, isNotNull, isNull, and, count } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    opinionTable,
    voteTable,
    userTable,
    opinionModerationTable,
} from "./shared-backend/schema.js";
import { nowZeroMs } from "./shared/util.js";

export interface RecalculatedCounters {
    opinionCount: number;
    voteCount: number;
    participantCount: number;
}

/**
 * Recalculate conversation counters from actual database records
 *
 * Copied from services/api/src/service/common.ts to ensure exact same logic
 * Counts: active opinions, votes, and unique participants
 * Excludes: deleted opinions/votes, moderated opinions, deleted users
 */
export async function recalculateConversationCounters(
    db: PostgresJsDatabase,
    conversationId: number,
): Promise<RecalculatedCounters> {
    // Opinion count - copied from getOpinionCountBypassCache
    const whereClauseOpinion = and(
        eq(opinionTable.conversationId, conversationId),
        isNotNull(opinionTable.currentContentId), // only non-deleted opinions count
        isNull(opinionModerationTable.id), // only unmoderated opinions matters
        eq(userTable.isDeleted, false), // we don't count opinions from deleted users
    );

    const opinionResponse = await db
        .select({ count: count() })
        .from(opinionTable)
        .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .where(whereClauseOpinion);

    const opinionCount =
        opinionResponse.length === 0 ? 0 : opinionResponse[0].count;

    // Vote count - copied from getVoteCountBypassCache
    const whereClauseVote = and(
        eq(opinionTable.conversationId, conversationId),
        isNotNull(opinionTable.currentContentId),
        isNotNull(voteTable.currentContentId), // we don't count deleted votes
        eq(userTable.isDeleted, false), // we don't count votes from deleted users
        isNull(opinionModerationTable.id), // only votes on unmoderated opinions matters
    );

    const voteResponse = await db
        .select({ count: count() })
        .from(voteTable)
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .innerJoin(userTable, eq(voteTable.authorId, userTable.id))
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .where(whereClauseVote);

    const voteCount = voteResponse.length === 0 ? 0 : voteResponse[0].count;

    // Participant count - copied from getParticipantCountBypassCache
    const results = await db
        .select({ authorId: voteTable.authorId })
        .from(voteTable)
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .innerJoin(userTable, eq(voteTable.authorId, userTable.id))
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                isNotNull(opinionTable.currentContentId), // we don't count deleted opinions
                isNotNull(voteTable.currentContentId), // we don't count deleted votes
                isNull(opinionModerationTable.id), // we don't count moderated opinions
                eq(userTable.isDeleted, false), // we don't count votes from deleted users
            ),
        );

    const participantUserIds = results.map((result) => result.authorId);
    const uniqueParticipantUserIds = new Set(participantUserIds);
    const participantCount = uniqueParticipantUserIds.size;

    return {
        opinionCount,
        voteCount,
        participantCount,
    };
}

/**
 * Recalculate and update conversation counters in the database
 *
 * This function:
 * 1. Recalculates the counters from actual records
 * 2. Updates the conversation table with the correct values
 * 3. Logs any discrepancies found
 *
 * @param db - Drizzle database instance
 * @param conversationId - The conversation ID to update
 * @param conversationSlugId - The conversation slug (for logging)
 * @param logger - Optional logger function
 * @returns The recalculated counters
 */
export async function recalculateAndUpdateConversationCounters(
    db: PostgresJsDatabase,
    conversationId: number,
    conversationSlugId: string,
    logger?: (message: string, data?: any) => void,
): Promise<RecalculatedCounters> {
    // Get current values from database
    const conversationResult = await db
        .select({
            opinionCount: conversationTable.opinionCount,
            voteCount: conversationTable.voteCount,
            participantCount: conversationTable.participantCount,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    if (conversationResult.length === 0) {
        throw new Error(
            `Conversation not found: ${conversationSlugId} (id: ${conversationId})`,
        );
    }

    const conversation = conversationResult[0];

    // Recalculate from actual records
    const recalculated = await recalculateConversationCounters(
        db,
        conversationId,
    );

    // Check if counters need correction
    const hasDiscrepancy =
        conversation.opinionCount !== recalculated.opinionCount ||
        conversation.voteCount !== recalculated.voteCount ||
        conversation.participantCount !== recalculated.participantCount;

    if (hasDiscrepancy) {
        if (logger) {
            logger(
                `[Counter Reconciliation] Counters drifted for conversation ${conversationSlugId}`,
                {
                    before: {
                        opinionCount: conversation.opinionCount,
                        voteCount: conversation.voteCount,
                        participantCount: conversation.participantCount,
                    },
                    after: recalculated,
                    diff: {
                        opinions:
                            recalculated.opinionCount - conversation.opinionCount,
                        votes: recalculated.voteCount - conversation.voteCount,
                        participants:
                            recalculated.participantCount -
                            conversation.participantCount,
                    },
                },
            );
        }

        // Update both counters and lastReactedAt
        await db
            .update(conversationTable)
            .set({
                opinionCount: recalculated.opinionCount,
                voteCount: recalculated.voteCount,
                participantCount: recalculated.participantCount,
                lastReactedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    } else {
        // Counters are correct but there was activity (offsetting changes like vote + unvote)
        if (logger) {
            logger(
                `[Counter Reconciliation] Counters unchanged for conversation ${conversationSlugId} (offsetting activity)`,
                {
                    counts: recalculated,
                },
            );
        }

        // Only update lastReactedAt (no need to write unchanged counter values)
        await db
            .update(conversationTable)
            .set({
                lastReactedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    }

    return recalculated;
}
