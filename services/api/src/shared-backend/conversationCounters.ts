/**
 * Conversation count calculation and analysis scheduling
 *
 * Provides a calculation helper for conversation_view_snapshot counts:
 * - voteCount / totalVoteCount: Active votes (unmoderated / all)
 * - opinionCount / totalOpinionCount: Active opinions (unmoderated / all)
 * - participantCount / totalParticipantCount: Unique voters (unmoderated / all)
 * - moderatedOpinionCount / hiddenOpinionCount: Opinions by moderation action
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
} from "./schema.js";
import { scheduleAnalysisUpdate } from "./analysisScheduler.js";
import type { BaseLogger } from "pino";
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

type AnalysisQueueStrategy = "caller_will_enqueue" | "db_reconciliation_only";

/**
 * Reconcile all conversation counters from actual database records (internal helper).
 * Returns both unmoderated and total counts using FILTER clauses — 3 queries total.
 */
export async function calculateConversationCounters({
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
            : ((
                  await db
                      .select({ voteCount: count() })
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
              )[0]?.voteCount ?? 0);

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
                        : inArray(
                              voteTable.authorId,
                              analysisEligibleParticipantIds,
                          )
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
 * Schedule analysis after a mutation that changes counts.
 *
 * conversation_view_snapshot is the canonical count store; math-updater writes
 * updated snapshot counts after processing the scheduled work.
 */
export async function scheduleConversationAnalysisRefresh({
    db,
    conversationId,
    log,
    doUpdateLastReactedAt = false,
    queueStrategy = "db_reconciliation_only",
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    log: Pick<BaseLogger, "info" | "error">;
    doUpdateLastReactedAt?: boolean;
    queueStrategy?: AnalysisQueueStrategy;
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

    if (doUpdateLastReactedAt) {
        await db
            .update(conversationTable)
            .set({ lastReactedAt: nowZeroMs() })
            .where(eq(conversationTable.id, conversationId));
    }

    const schedule = await scheduleAnalysisUpdate({ db, conversationId, log });
    log.info(
        `[ConversationCounters] Scheduled math work conversationId=${String(conversationId)} conversationSlugId=${schedule.conversationSlugId} generation=${String(schedule.dataGeneration)} specs=${String(schedule.scheduledSpecCount)} queueStrategy=${queueStrategy}`,
    );
}
