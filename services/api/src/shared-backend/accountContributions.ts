/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { eq, inArray } from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import {
    conversationTable,
    gatheringResponseTable,
    conversationParticipantTable,
    comparisonResponseTable,
    opinionTable,
    opinionContentTable,
    rankingItemTable,
    surveyResponseTable,
    voteTable,
    analysisInputParticipantEligibilityTable,
    analysisInputSnapshotTable,
    rankingInputParticipantEligibilityTable,
    rankingInputSnapshotTable,
    qvInputBallotEligibilityTable,
    qvInputSnapshotTable,
    qvCalculationTable,
} from "./schema.js";

/** Lock the complete contribution scope before changing account/source eligibility. */
export async function lockAccountConversations({
    db,
    userId,
    limit,
}: {
    db: PostgresTransaction;
    userId: string;
    limit?: number;
}): Promise<readonly number[]> {
    const contributions = db
        .select({ conversationId: opinionTable.conversationId })
        .from(voteTable)
        .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
        .where(eq(voteTable.authorId, userId))
        .unionAll(
            db
                .select({
                    conversationId: gatheringResponseTable.conversationId,
                })
                .from(gatheringResponseTable)
                .where(eq(gatheringResponseTable.authorId, userId)),
        )
        .unionAll(
            db
                .select({ conversationId: opinionTable.conversationId })
                .from(opinionTable)
                .where(eq(opinionTable.authorId, userId)),
        )
        .unionAll(
            db
                .select({ conversationId: rankingItemTable.conversationId })
                .from(rankingItemTable)
                .where(eq(rankingItemTable.authorId, userId)),
        )
        .unionAll(
            db
                .select({
                    conversationId: conversationParticipantTable.conversationId,
                })
                .from(conversationParticipantTable)
                .where(eq(conversationParticipantTable.userId, userId)),
        )
        .unionAll(
            db
                .select({ conversationId: opinionTable.conversationId })
                .from(opinionContentTable)
                .innerJoin(
                    opinionTable,
                    eq(opinionTable.id, opinionContentTable.opinionId),
                )
                .where(eq(opinionContentTable.editedByUserId, userId)),
        )
        .unionAll(
            db
                .select({ conversationId: surveyResponseTable.conversationId })
                .from(surveyResponseTable)
                .where(eq(surveyResponseTable.participantId, userId)),
        )
        .unionAll(
            db
                .select({
                    conversationId: comparisonResponseTable.conversationId,
                })
                .from(comparisonResponseTable)
                .where(eq(comparisonResponseTable.participantId, userId)),
        )
        .unionAll(
            db
                .select({
                    conversationId: analysisInputSnapshotTable.conversationId,
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
                    eq(analysisInputParticipantEligibilityTable.userId, userId),
                ),
        )
        .unionAll(
            db
                .select({
                    conversationId: rankingInputSnapshotTable.conversationId,
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
                    eq(rankingInputParticipantEligibilityTable.userId, userId),
                ),
        )
        .unionAll(
            db
                .select({ conversationId: qvCalculationTable.conversationId })
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
                .where(eq(qvInputBallotEligibilityTable.userId, userId)),
        );
    const query = db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .where(inArray(conversationTable.id, contributions))
        .orderBy(conversationTable.id)
        .for("no key update");
    const conversations =
        limit === undefined ? await query : await query.limit(limit);
    return conversations.map((conversation) => conversation.id);
}
