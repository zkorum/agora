import {
    and,
    arrayContains,
    eq,
    exists,
    inArray,
    isNull,
    sql,
    type SQL,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    comparisonAnswerTable,
    comparisonResponseTable,
    rankingItemTable,
    userTable,
} from "@/shared-backend/schema.js";
import { getEligibleParticipantIdsForAnalysis } from "@/shared-backend/surveyAnalysis.js";

export async function rankingSeedHasVotes({
    db,
    conversationId,
    slugId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    slugId: typeof rankingItemTable.slugId;
}): Promise<SQL<boolean>> {
    const eligibleParticipantIds = await getEligibleParticipantIdsForAnalysis({
        db,
        conversationId,
        candidateParticipantIds: async () => {
            const voters = await db
                .selectDistinct({
                    participantId: userTable.id,
                })
                .from(comparisonResponseTable)
                .innerJoin(
                    comparisonAnswerTable,
                    eq(
                        comparisonAnswerTable.comparisonResponseId,
                        comparisonResponseTable.id,
                    ),
                )
                .innerJoin(
                    userTable,
                    eq(userTable.id, comparisonResponseTable.participantId),
                )
                .where(
                    and(
                        eq(
                            comparisonResponseTable.conversationId,
                            conversationId,
                        ),
                        isNull(comparisonAnswerTable.deletedAt),
                        eq(userTable.isDeleted, false),
                    ),
                );
            return voters.map((voter) => voter.participantId);
        },
    });
    // Drizzle needs a PostgreSQL array expression to correlate the candidate set
    // with the outer item row, including items that were neither best nor worst.
    const candidate = sql`ARRAY[${slugId}::text]`;
    return exists(
        db
            .select({ id: comparisonAnswerTable.id })
            .from(comparisonAnswerTable)
            .innerJoin(
                comparisonResponseTable,
                eq(
                    comparisonResponseTable.id,
                    comparisonAnswerTable.comparisonResponseId,
                ),
            )
            .innerJoin(
                userTable,
                eq(userTable.id, comparisonResponseTable.participantId),
            )
            .where(
                and(
                    eq(comparisonResponseTable.conversationId, conversationId),
                    isNull(comparisonAnswerTable.deletedAt),
                    eq(userTable.isDeleted, false),
                    eligibleParticipantIds === undefined
                        ? undefined
                        : inArray(comparisonResponseTable.participantId, [
                              ...eligibleParticipantIds,
                          ]),
                    arrayContains(
                        comparisonAnswerTable.candidateSet,
                        candidate,
                    ),
                ),
            ),
    ).mapWith(Boolean);
}
