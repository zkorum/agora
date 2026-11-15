import { and, eq, inArray, isNotNull, isNull, notExists } from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import {
    comparisonAnswerTable,
    comparisonResponseTable,
    comparisonUserEntityScoreTable,
    conversationTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
    rankingInputSnapshotTable,
    userTable,
} from "./schema.js";
import { hasUnclassifiedComparisonAccountContext } from "./comparisonRetention.js";

/** Bounded purge-phase handoff, not an executor or user-facing deletion action.
 * Result-owned ranking_input_* rows have no dependency on this private graph.
 */
export async function retireComparisonAccountInputs({
    db,
    userId,
    limit = 1000,
}: {
    db: PostgresTransaction;
    userId: string;
    limit?: number;
}): Promise<
    | {
          status: "blocked";
          reason:
              | "account_not_purging"
              | "legacy_comparison_evidence_missing"
              | "unfinished_comparison_calculation"
              | "legacy_comparison_account_context";
      }
    | {
          status: "progress";
          responses: number;
          answers: number;
          personalScores: number;
      }
> {
    const account = (
        await db
            .select({ purgeStartedAt: userTable.purgeStartedAt })
            .from(userTable)
            .where(
                and(
                    eq(userTable.id, userId),
                    eq(userTable.isDeleted, true),
                    isNotNull(userTable.purgeStartedAt),
                ),
            )
            .for("no key update")
    ).at(0);
    const now = account?.purgeStartedAt;
    if (now == null)
        return { status: "blocked", reason: "account_not_purging" };
    if (await hasUnclassifiedComparisonAccountContext(db))
        return {
            status: "blocked",
            reason: "legacy_comparison_account_context",
        };
    const responses = await db
        .select({
            id: comparisonResponseTable.id,
            conversationId: comparisonResponseTable.conversationId,
        })
        .from(comparisonResponseTable)
        .where(eq(comparisonResponseTable.participantId, userId))
        .orderBy(comparisonResponseTable.id)
        .limit(limit);
    if (responses.length === 0)
        return {
            status: "progress",
            responses: 0,
            answers: 0,
            personalScores: 0,
        };
    const conversationIds = [
        ...new Set(responses.map((response) => response.conversationId)),
    ];
    const conversations = await db
        .select({
            id: conversationTable.id,
            isClosed: conversationTable.isClosed,
            finalizedAt: conversationTable.closedFinalizedAt,
        })
        .from(conversationTable)
        .where(inArray(conversationTable.id, conversationIds))
        .orderBy(conversationTable.id)
        .for("no key update");
    // Private-source retirement must not move an unfinished close's input fence.
    // Let its existing worker finish before the future purge executor detaches.
    if (
        conversations.some(
            (conversation) =>
                conversation.isClosed && conversation.finalizedAt === null,
        )
    )
        return {
            status: "blocked",
            reason: "unfinished_comparison_calculation",
        };

    // Old results cannot be reconstructed from a mutable current session. Keep
    // their sources blocked rather than claim that an invented capture is exact.
    const legacySnapshots = await db
        .select({ id: rankingConversationStatsSnapshotTable.id })
        .from(rankingConversationStatsSnapshotTable)
        .leftJoin(
            rankingInputSnapshotTable,
            eq(
                rankingInputSnapshotTable.statsSnapshotId,
                rankingConversationStatsSnapshotTable.id,
            ),
        )
        .where(
            and(
                inArray(
                    rankingConversationStatsSnapshotTable.conversationId,
                    conversationIds,
                ),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
                isNull(rankingInputSnapshotTable.statsSnapshotId),
            ),
        )
        .limit(1);
    const legacyCurrentScores = await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .innerJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(
            and(
                inArray(conversationTable.id, conversationIds),
                isNotNull(rankingConversationConfigTable.currentRankingScoreId),
                notExists(
                    db
                        .select({
                            id: rankingInputSnapshotTable.statsSnapshotId,
                        })
                        .from(rankingInputSnapshotTable)
                        .innerJoin(
                            rankingConversationStatsSnapshotTable,
                            eq(
                                rankingConversationStatsSnapshotTable.id,
                                rankingInputSnapshotTable.statsSnapshotId,
                            ),
                        )
                        .where(
                            and(
                                eq(
                                    rankingConversationStatsSnapshotTable.rankingScoreId,
                                    rankingConversationConfigTable.currentRankingScoreId,
                                ),
                                eq(
                                    rankingConversationStatsSnapshotTable.conversationId,
                                    conversationTable.id,
                                ),
                                isNull(
                                    rankingConversationStatsSnapshotTable.deletedAt,
                                ),
                            ),
                        ),
                ),
            ),
        )
        .limit(1);
    if (legacySnapshots.length > 0 || legacyCurrentScores.length > 0)
        return {
            status: "blocked",
            reason: "legacy_comparison_evidence_missing",
        };

    const ids = responses.map((response) => response.id);
    // Limit children independently: a single resumable session can be very large.
    const answers = await db
        .update(comparisonAnswerTable)
        .set({ deletedAt: now })
        .where(
            inArray(
                comparisonAnswerTable.id,
                db
                    .select({ id: comparisonAnswerTable.id })
                    .from(comparisonAnswerTable)
                    .where(
                        and(
                            inArray(
                                comparisonAnswerTable.comparisonResponseId,
                                ids,
                            ),
                            isNull(comparisonAnswerTable.deletedAt),
                        ),
                    )
                    .orderBy(comparisonAnswerTable.id)
                    .limit(limit),
            ),
        );
    const personalScores = await db
        .update(comparisonUserEntityScoreTable)
        .set({ deletedAt: now })
        .where(
            inArray(
                comparisonUserEntityScoreTable.id,
                db
                    .select({ id: comparisonUserEntityScoreTable.id })
                    .from(comparisonUserEntityScoreTable)
                    .where(
                        and(
                            inArray(
                                comparisonUserEntityScoreTable.comparisonResponseId,
                                ids,
                            ),
                            isNull(comparisonUserEntityScoreTable.deletedAt),
                        ),
                    )
                    .orderBy(comparisonUserEntityScoreTable.id)
                    .limit(limit),
            ),
        );
    const detached = await db
        .update(comparisonResponseTable)
        .set({
            participantId: null,
            detachedAt: now,
            comparisons: [],
            ranking: null,
            isComplete: false,
            updatedAt: now,
        })
        .where(
            and(
                inArray(comparisonResponseTable.id, ids),
                eq(comparisonResponseTable.participantId, userId),
                notExists(
                    db
                        .select({ id: comparisonAnswerTable.id })
                        .from(comparisonAnswerTable)
                        .where(
                            and(
                                eq(
                                    comparisonAnswerTable.comparisonResponseId,
                                    comparisonResponseTable.id,
                                ),
                                isNull(comparisonAnswerTable.deletedAt),
                            ),
                        ),
                ),
                notExists(
                    db
                        .select({ id: comparisonUserEntityScoreTable.id })
                        .from(comparisonUserEntityScoreTable)
                        .where(
                            and(
                                eq(
                                    comparisonUserEntityScoreTable.comparisonResponseId,
                                    comparisonResponseTable.id,
                                ),
                                isNull(
                                    comparisonUserEntityScoreTable.deletedAt,
                                ),
                            ),
                        ),
                ),
            ),
        );
    return {
        status: "progress",
        responses: detached.count,
        answers: answers.count,
        personalScores: personalScores.count,
    };
}
