/**
 * Conversation Counter Management
 *
 * Provides modular functions for updating and reconciling conversation counters:
 * - voteCount: Number of active votes in conversation
 * - opinionCount: Number of active opinions in conversation
 * - participantCount: Number of unique users who have voted
 *
 * Each counter has:
 * - reconcile function: Recalculates accurate count from database
 * - update function: Applies delta changes (+1/-1)
 */

import { eq, isNotNull, isNull, and, count, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    opinionTable,
    voteTable,
    userTable,
    opinionModerationTable,
    conversationUpdateQueueTable,
} from "./schema.js";
import { nowZeroMs } from "./util.js";

/**
 * Reconcile all conversation counters from actual database records (internal helper)
 * Returns calculated counters without updating the database
 */
async function calculateConversationCounters({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<{
    opinionCount: number;
    voteCount: number;
    participantCount: number;
}> {
    // Reconcile voteCount
    const voteCountResult = await db
        .select({ count: count() })
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
                isNotNull(opinionTable.currentContentId),
                isNotNull(voteTable.currentContentId), // we don't count deleted votes
                eq(userTable.isDeleted, false), // we don't count votes from deleted users
                isNull(opinionModerationTable.id), // only votes on unmoderated opinions matters
            ),
        );

    // Reconcile opinionCount
    const opinionCountResult = await db
        .select({ count: count() })
        .from(opinionTable)
        .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                isNotNull(opinionTable.currentContentId), // only non-deleted opinions count
                isNull(opinionModerationTable.id), // only unmoderated opinions matters
                eq(userTable.isDeleted, false), // we don't count opinions from deleted users
            ),
        );

    // Reconcile participantCount
    const participantResults = await db
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

    const participantUserIds = participantResults.map(
        (result) => result.authorId,
    );
    const uniqueParticipantUserIds = new Set(participantUserIds);

    return {
        opinionCount:
            opinionCountResult.length === 0 ? 0 : opinionCountResult[0].count,
        voteCount: voteCountResult.length === 0 ? 0 : voteCountResult[0].count,
        participantCount: uniqueParticipantUserIds.size,
    };
}

/**
 * Update voteCount with a delta (+1 or -1)
 *
 * Automatically enqueues math update since clustering depends on vote data
 * Use this for real-time updates when votes are added/removed
 */
export async function updateVoteCount({
    db,
    conversationId,
    delta,
    doUpdateLastReactedAt = false,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    delta: number;
    doUpdateLastReactedAt?: boolean;
}): Promise<void> {
    if (doUpdateLastReactedAt) {
        await db
            .update(conversationTable)
            .set({
                voteCount: sql`${conversationTable.voteCount} + ${delta}`,
                lastReactedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    } else {
        await db
            .update(conversationTable)
            .set({
                voteCount: sql`${conversationTable.voteCount} + ${delta}`,
            })
            .where(eq(conversationTable.id, conversationId));
    }

    // Enqueue math update (voteCount changes affect clustering)
    await enqueueMathUpdate({ db, conversationId });
}

/**
 * Update opinionCount with a delta (+1 or -1)
 *
 * Use this for real-time updates when opinions are added/removed
 */
export async function updateOpinionCount({
    db,
    conversationId,
    delta,
    doUpdateLastReactedAt = false,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    delta: number;
    doUpdateLastReactedAt?: boolean;
}): Promise<void> {
    if (doUpdateLastReactedAt) {
        await db
            .update(conversationTable)
            .set({
                opinionCount: sql`${conversationTable.opinionCount} + ${delta}`,
                lastReactedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    } else {
        await db
            .update(conversationTable)
            .set({
                opinionCount: sql`${conversationTable.opinionCount} + ${delta}`,
            })
            .where(eq(conversationTable.id, conversationId));
    }
}

/**
 * Enqueue conversation for math update (clustering recalculation) (internal helper)
 *
 * Should be called whenever voteCount changes, as math calculations depend on votes
 */
async function enqueueMathUpdate({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<void> {
    const now = nowZeroMs();

    await db
        .insert(conversationUpdateQueueTable)
        .values({
            conversationId: conversationId,
            requestedAt: now,
            processedAt: null,
        })
        .onConflictDoUpdate({
            target: conversationUpdateQueueTable.conversationId,
            set: {
                requestedAt: now,
                processedAt: null,
            },
        });
}

/**
 * Reconcile all conversation counters by recalculating from database
 *
 * Automatically enqueues math update since voteCount changes affect clustering
 * Use this when actions affect multiple counters (e.g., moderation)
 */
export async function reconcileConversationCounters({
    db,
    conversationId,
    doUpdateLastReactedAt = false,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    doUpdateLastReactedAt?: boolean;
}): Promise<void> {
    const counters = await calculateConversationCounters({
        db,
        conversationId,
    });

    if (doUpdateLastReactedAt) {
        await db
            .update(conversationTable)
            .set({
                opinionCount: counters.opinionCount,
                voteCount: counters.voteCount,
                participantCount: counters.participantCount,
                lastReactedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    } else {
        await db
            .update(conversationTable)
            .set({
                opinionCount: counters.opinionCount,
                voteCount: counters.voteCount,
                participantCount: counters.participantCount,
            })
            .where(eq(conversationTable.id, conversationId));
    }

    // Enqueue math update (voteCount changes affect clustering)
    await enqueueMathUpdate({ db, conversationId });
}
