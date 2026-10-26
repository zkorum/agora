/**
 * Conversation count calculation and analysis scheduling
 *
 * Provides a calculation helper for conversation_view_snapshot counts:
 * - voteCount / totalVoteCount: Active votes (unmoderated / all)
 * - opinionCount / totalOpinionCount: Active opinions (unmoderated / all)
 * - participantCount / totalParticipantCount: Unique voters (unmoderated / all)
 * - moderatedOpinionCount / hiddenOpinionCount: Opinions by moderation action
 *
 * Aggregates votes once per participant and statements once per conversation;
 * survey eligibility is applied to those participant aggregates.
 */

import { eq, isNotNull, isNull, and, count, sql } from "drizzle-orm";
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
import { currentOpinionSourceCondition } from "./opinionEligibility.js";

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
        .select({
            authorId: voteTable.authorId,
            voteCount: count(),
            // Drizzle has no FILTER aggregate helper; aggregate once per voter
            // instead of repeating the same joins for counts and eligibility.
            unmoderatedVoteCount:
                sql<number>`count(*) FILTER (WHERE ${opinionModerationTable.id} IS NULL)`.mapWith(
                    Number,
                ),
        })
        .from(voteTable)
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                currentOpinionSourceCondition(),
                isNotNull(voteTable.currentContentId),
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
    const eligibleParticipants = activeVoteParticipantRows.filter(
        (row) =>
            eligibleParticipantIdsForAnalysis === undefined ||
            eligibleParticipantIdsForAnalysis.has(row.authorId),
    );
    const totalVoteCount = activeVoteParticipantRows.reduce(
        (total, row) => total + row.voteCount,
        0,
    );
    const voteCount = eligibleParticipants.reduce(
        (total, row) => total + row.unmoderatedVoteCount,
        0,
    );

    // Opinion counts: unmoderated + total + moderated + hidden in one query
    const opinionCountResult = await db
        .select({
            opinionCount:
                sql<number>`count(*) FILTER (WHERE ${opinionModerationTable.id} IS NULL)`
                    .mapWith(Number)
                    .as("opinion_count"),
            totalOpinionCount: count(),
            moderatedOpinionCount:
                sql<number>`count(*) FILTER (WHERE ${opinionModerationTable.moderationAction} = 'move')`
                    .mapWith(Number)
                    .as("moderated_opinion_count"),
            hiddenOpinionCount:
                sql<number>`count(*) FILTER (WHERE ${opinionModerationTable.moderationAction} = 'hide')`
                    .mapWith(Number)
                    .as("hidden_opinion_count"),
        })
        .from(opinionTable)
        .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                currentOpinionSourceCondition(),
            ),
        );

    const totalParticipantCount = activeVoteParticipantRows.length;
    const participantCount = eligibleParticipants.filter(
        (row) => row.unmoderatedVoteCount > 0,
    ).length;
    const opinionRow =
        opinionCountResult.length === 0 ? undefined : opinionCountResult[0];

    return {
        voteCount,
        totalVoteCount,
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
    // Ranking counters are owned by ranking/scoring workers, not the Pol.is math updater.
    const convType = await db
        .select({ conversationType: conversationTable.conversationType })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    if (convType[0]?.conversationType === "ranking") {
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
        {
            event: "analysis_schedule",
            conversationId,
            conversationSlugId: schedule.conversationSlugId,
            dataGeneration: schedule.dataGeneration,
            specCount: schedule.scheduledSpecCount,
            queueStrategy,
        },
        "[ConversationCounters] Scheduled math work",
    );
}
