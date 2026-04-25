/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
/**
 * Conversation Counter Management
 *
 * Provides modular functions for updating and reconciling conversation counters:
 * - voteCount / totalVoteCount: Active votes (unmoderated / all)
 * - opinionCount / totalOpinionCount: Active opinions (unmoderated / all)
 * - participantCount / totalParticipantCount: Unique voters (unmoderated / all)
 * - moderatedOpinionCount / hiddenOpinionCount: Opinions by moderation action
 *
 * Each counter has:
 * - reconcile function: Recalculates accurate count from database
 * - update function: Applies delta changes (+1/-1)
 *
 * Uses PostgreSQL FILTER clauses to compute unmoderated and total counts
 * in the same query (3 queries total, same as before).
 */

import { eq, inArray, isNotNull, isNull, and, count, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    opinionTable,
    voteTable,
    userTable,
    opinionModerationTable,
    conversationUpdateQueueTable,
} from "./schema.js";
import { getEligibleParticipantIdsForAnalysis } from "./surveyAnalysis.js";
import { nowZeroMs } from "./util.js";

interface AllConversationCounters {
    opinionCount: number;
    totalOpinionCount: number;
    moderatedOpinionCount: number;
    hiddenOpinionCount: number;
    voteCount: number;
    totalVoteCount: number;
    participantCount: number;
    totalParticipantCount: number;
}

/**
 * Reconcile all conversation counters from actual database records (internal helper).
 * Returns both unmoderated and total counts using FILTER clauses — 3 queries total.
 */
async function calculateConversationCounters({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<AllConversationCounters> {
    const activeVoteParticipantRows = await db
        .select({ authorId: voteTable.authorId })
        .from(voteTable)
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .innerJoin(userTable, eq(voteTable.authorId, userTable.id))
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                isNotNull(opinionTable.currentContentId),
                isNotNull(voteTable.currentContentId),
                eq(userTable.isDeleted, false),
            ),
        )
        .groupBy(voteTable.authorId);

    const eligibleParticipantIdsForAnalysis =
        await getEligibleParticipantIdsForAnalysis({
            db,
            conversationId,
            candidateParticipantIds: activeVoteParticipantRows.map(
                (row) => row.authorId,
            ),
        });
    const shouldFilterAnalysisVotes =
        eligibleParticipantIdsForAnalysis !== undefined;
    const analysisEligibleParticipantIds = shouldFilterAnalysisVotes
        ? Array.from(eligibleParticipantIdsForAnalysis)
        : [];

    // Vote counts: total (COUNT) across all active votes
    const voteCountResult = await db
        .select({
            totalVoteCount: count(),
        })
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
                isNotNull(voteTable.currentContentId),
                eq(userTable.isDeleted, false),
            ),
        );

    const voteCount =
        shouldFilterAnalysisVotes && analysisEligibleParticipantIds.length === 0
            ? 0
            : (
                  await db
                      .select({ voteCount: count() })
                      .from(voteTable)
                      .innerJoin(
                          opinionTable,
                          eq(voteTable.opinionId, opinionTable.id),
                      )
                      .innerJoin(userTable, eq(voteTable.authorId, userTable.id))
                      .leftJoin(
                          opinionModerationTable,
                          eq(opinionModerationTable.opinionId, opinionTable.id),
                      )
                      .where(
                          and(
                              eq(opinionTable.conversationId, conversationId),
                              isNotNull(opinionTable.currentContentId),
                              isNotNull(voteTable.currentContentId),
                              eq(userTable.isDeleted, false),
                              isNull(opinionModerationTable.id),
                              shouldFilterAnalysisVotes
                                  ? inArray(
                                        voteTable.authorId,
                                        analysisEligibleParticipantIds,
                                    )
                                  : sql`true`,
                          ),
                      )
              )[0]?.voteCount ?? 0;

    // Opinion counts: unmoderated + total + moderated + hidden in one query
    const opinionCountResult = await db
        .select({
            opinionCount:
                sql<number>`count(*) FILTER (WHERE ${opinionModerationTable.id} IS NULL)`.as(
                    "opinion_count",
                ),
            totalOpinionCount: count(),
            moderatedOpinionCount:
                sql<number>`count(*) FILTER (WHERE ${opinionModerationTable.moderationAction} = 'move')`.as(
                    "moderated_opinion_count",
                ),
            hiddenOpinionCount:
                sql<number>`count(*) FILTER (WHERE ${opinionModerationTable.moderationAction} = 'hide')`.as(
                    "hidden_opinion_count",
                ),
        })
        .from(opinionTable)
        .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                isNotNull(opinionTable.currentContentId),
                eq(userTable.isDeleted, false),
            ),
        );

    // Participant counts: GROUP BY authorId, then split by moderation status
    const participantResults = await db
        .select({
            authorId: voteTable.authorId,
            hasUnmoderatedVote:
                sql<boolean>`bool_or(${opinionModerationTable.id} IS NULL)`.as(
                    "has_unmoderated_vote",
                ),
        })
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
                isNotNull(voteTable.currentContentId),
                eq(userTable.isDeleted, false),
                shouldFilterAnalysisVotes
                    ? analysisEligibleParticipantIds.length === 0
                        ? sql`false`
                        : inArray(voteTable.authorId, analysisEligibleParticipantIds)
                    : sql`true`,
            ),
        )
        .groupBy(voteTable.authorId);

    const totalParticipantCount = activeVoteParticipantRows.length;
    const participantCount = participantResults.filter(
        (row) => row.hasUnmoderatedVote,
    ).length;

    const voteRow =
        voteCountResult.length === 0 ? undefined : voteCountResult[0];
    const opinionRow =
        opinionCountResult.length === 0 ? undefined : opinionCountResult[0];

    return {
        voteCount,
        totalVoteCount: voteRow?.totalVoteCount ?? 0,
        opinionCount: opinionRow?.opinionCount ?? 0,
        totalOpinionCount: opinionRow?.totalOpinionCount ?? 0,
        moderatedOpinionCount: opinionRow?.moderatedOpinionCount ?? 0,
        hiddenOpinionCount: opinionRow?.hiddenOpinionCount ?? 0,
        participantCount,
        totalParticipantCount,
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
 * Update opinionCount and totalOpinionCount with a delta (+1 or -1)
 *
 * Both counters receive the same delta because new/deleted opinions are always
 * unmoderated. Moderation actions use reconcileConversationCounters instead.
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
                totalOpinionCount: sql`${conversationTable.totalOpinionCount} + ${delta}`,
                lastReactedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    } else {
        await db
            .update(conversationTable)
            .set({
                opinionCount: sql`${conversationTable.opinionCount} + ${delta}`,
                totalOpinionCount: sql`${conversationTable.totalOpinionCount} + ${delta}`,
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
 * Sets both unmoderated and total counts in a single UPDATE.
 * Automatically enqueues math update since voteCount changes affect clustering.
 * Use this when actions affect multiple counters (e.g., moderation).
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
    // MaxDiff counters are owned by the scoring worker (Python).
    // Skip here -- the worker updates counters alongside scoring.
    const convType = await db
        .select({ conversationType: conversationTable.conversationType })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    if (convType[0]?.conversationType === "maxdiff") {
        return;
    }

    const counters = await calculateConversationCounters({
        db,
        conversationId,
    });

    const counterColumns = {
        opinionCount: counters.opinionCount,
        voteCount: counters.voteCount,
        participantCount: counters.participantCount,
        totalOpinionCount: counters.totalOpinionCount,
        totalVoteCount: counters.totalVoteCount,
        totalParticipantCount: counters.totalParticipantCount,
        moderatedOpinionCount: counters.moderatedOpinionCount,
        hiddenOpinionCount: counters.hiddenOpinionCount,
    };

    if (doUpdateLastReactedAt) {
        await db
            .update(conversationTable)
            .set({
                ...counterColumns,
                lastReactedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    } else {
        await db
            .update(conversationTable)
            .set(counterColumns)
            .where(eq(conversationTable.id, conversationId));
    }

    // Enqueue math update (voteCount changes affect clustering)
    await enqueueMathUpdate({ db, conversationId });
}
