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
    maxdiffComparisonTable,
    maxdiffResultTable,
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
                    participantId: maxdiffResultTable.participantId,
                })
                .from(maxdiffResultTable)
                .innerJoin(
                    maxdiffComparisonTable,
                    eq(
                        maxdiffComparisonTable.maxdiffResultId,
                        maxdiffResultTable.id,
                    ),
                )
                .innerJoin(
                    userTable,
                    eq(userTable.id, maxdiffResultTable.participantId),
                )
                .where(
                    and(
                        eq(maxdiffResultTable.conversationId, conversationId),
                        isNull(maxdiffComparisonTable.deletedAt),
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
            .select({ id: maxdiffComparisonTable.id })
            .from(maxdiffComparisonTable)
            .innerJoin(
                maxdiffResultTable,
                eq(
                    maxdiffResultTable.id,
                    maxdiffComparisonTable.maxdiffResultId,
                ),
            )
            .innerJoin(
                userTable,
                eq(userTable.id, maxdiffResultTable.participantId),
            )
            .where(
                and(
                    eq(maxdiffResultTable.conversationId, conversationId),
                    isNull(maxdiffComparisonTable.deletedAt),
                    eq(userTable.isDeleted, false),
                    eligibleParticipantIds === undefined
                        ? undefined
                        : inArray(maxdiffResultTable.participantId, [
                              ...eligibleParticipantIds,
                          ]),
                    arrayContains(
                        maxdiffComparisonTable.candidateSet,
                        candidate,
                    ),
                ),
            ),
    ).mapWith(Boolean);
}
