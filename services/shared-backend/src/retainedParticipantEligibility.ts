import { and, eq, inArray } from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import {
    analysisInputParticipantEligibilityTable,
    rankingInputParticipantEligibilityTable,
    qvInputBallotEligibilityTable,
    analysisInputSnapshotTable,
    rankingInputSnapshotTable,
    qvInputSnapshotTable,
    qvCalculationTable,
} from "./schema.js";

/** Caller serializes account deletion/recovery with capture through the account lock.
 * These mutable associations never change sealed numerical input values.
 */
export async function setRetainedParticipantAccountHidden({
    db,
    userId,
    isAccountHidden,
}: {
    db: PostgresTransaction;
    userId: string;
    isAccountHidden: boolean;
}): Promise<void> {
    await db
        .update(analysisInputParticipantEligibilityTable)
        .set({ isAccountHidden })
        .where(eq(analysisInputParticipantEligibilityTable.userId, userId));
    await db
        .update(rankingInputParticipantEligibilityTable)
        .set({ isAccountHidden })
        .where(eq(rankingInputParticipantEligibilityTable.userId, userId));
    await db
        .update(qvInputBallotEligibilityTable)
        .set({ isAccountHidden })
        .where(eq(qvInputBallotEligibilityTable.userId, userId));
}

/** Purge-phase only, under the caller's purging-account and conversation locks.
 * One account has at most one row per input, so each subquery bounds its update.
 */
export async function unlinkRetainedParticipantAccounts({
    db,
    userId,
    limit,
    conversationIds,
}: {
    db: PostgresTransaction;
    userId: string;
    limit: number;
    conversationIds: readonly number[];
}): Promise<number> {
    // A Boolean marker survives unlinking without carrying a cross-conversation
    // account-deletion timestamp or changing any immutable numerical evidence.
    const analysis = await db
        .update(analysisInputParticipantEligibilityTable)
        .set({
            userId: null,
            isAccountHidden: true,
        })
        .where(
            and(
                eq(analysisInputParticipantEligibilityTable.userId, userId),
                inArray(
                    analysisInputParticipantEligibilityTable.inputSnapshotId,
                    db
                        .select({
                            id: analysisInputParticipantEligibilityTable.inputSnapshotId,
                        })
                        .from(analysisInputParticipantEligibilityTable)
                        .innerJoin(
                            analysisInputSnapshotTable,
                            eq(
                                analysisInputSnapshotTable.id,
                                analysisInputParticipantEligibilityTable.inputSnapshotId,
                            ),
                        )
                        .where(
                            and(
                                eq(
                                    analysisInputParticipantEligibilityTable.userId,
                                    userId,
                                ),
                                inArray(
                                    analysisInputSnapshotTable.conversationId,
                                    [...conversationIds],
                                ),
                            ),
                        )
                        .orderBy(
                            analysisInputParticipantEligibilityTable.inputSnapshotId,
                        )
                        .limit(limit),
                ),
            ),
        );
    const ranking = await db
        .update(rankingInputParticipantEligibilityTable)
        .set({
            userId: null,
            isAccountHidden: true,
        })
        .where(
            and(
                eq(rankingInputParticipantEligibilityTable.userId, userId),
                inArray(
                    rankingInputParticipantEligibilityTable.inputSnapshotId,
                    db
                        .select({
                            id: rankingInputParticipantEligibilityTable.inputSnapshotId,
                        })
                        .from(rankingInputParticipantEligibilityTable)
                        .innerJoin(
                            rankingInputSnapshotTable,
                            eq(
                                rankingInputSnapshotTable.id,
                                rankingInputParticipantEligibilityTable.inputSnapshotId,
                            ),
                        )
                        .where(
                            and(
                                eq(
                                    rankingInputParticipantEligibilityTable.userId,
                                    userId,
                                ),
                                inArray(
                                    rankingInputSnapshotTable.conversationId,
                                    [...conversationIds],
                                ),
                            ),
                        )
                        .orderBy(
                            rankingInputParticipantEligibilityTable.inputSnapshotId,
                        )
                        .limit(limit),
                ),
            ),
        );
    const qv = await db
        .update(qvInputBallotEligibilityTable)
        .set({
            userId: null,
            isAccountHidden: true,
        })
        .where(
            and(
                eq(qvInputBallotEligibilityTable.userId, userId),
                inArray(
                    qvInputBallotEligibilityTable.snapshotId,
                    db
                        .select({
                            id: qvInputBallotEligibilityTable.snapshotId,
                        })
                        .from(qvInputBallotEligibilityTable)
                        .innerJoin(
                            qvInputSnapshotTable,
                            eq(
                                qvInputSnapshotTable.id,
                                qvInputBallotEligibilityTable.snapshotId,
                            ),
                        )
                        .innerJoin(
                            qvCalculationTable,
                            eq(
                                qvCalculationTable.id,
                                qvInputSnapshotTable.calculationId,
                            ),
                        )
                        .where(
                            and(
                                eq(
                                    qvInputBallotEligibilityTable.userId,
                                    userId,
                                ),
                                inArray(qvCalculationTable.conversationId, [
                                    ...conversationIds,
                                ]),
                            ),
                        )
                        .orderBy(qvInputBallotEligibilityTable.snapshotId)
                        .limit(limit),
                ),
            ),
        );
    return analysis.count + ranking.count + qv.count;
}
