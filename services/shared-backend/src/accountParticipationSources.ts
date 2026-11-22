import { and, eq, isNull } from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import {
    comparisonResponseTable,
    conversationParticipantTable,
    qvResponseTable,
    surveyResponseTable,
    voteTable,
    gatheringResponseTable,
} from "./schema.js";

type AccountParticipationSource =
    | "polis_vote"
    | "survey_response"
    | "comparison_response"
    | "qv_response"
    | "gathering_response";

/** Caller holds the account lock. These are identity-linked working sources,
 * not retained result-owned evidence. Logical account deletion is not permission
 * to remove them or unlink their owner before the retention handoff is complete.
 */
export async function findAccountParticipationSource({
    db,
    userId,
}: {
    db: PostgresTransaction;
    userId: string;
}): Promise<AccountParticipationSource | undefined> {
    const gathering = await db
        .select({ id: gatheringResponseTable.id })
        .from(gatheringResponseTable)
        .where(eq(gatheringResponseTable.authorId, userId))
        .limit(1);
    if (gathering.length > 0) return "gathering_response";
    const votes = await db
        .select({ id: voteTable.id })
        .from(voteTable)
        .where(eq(voteTable.authorId, userId))
        .limit(1);
    if (votes.length > 0) return "polis_vote";

    const surveys = await db
        .select({ id: surveyResponseTable.id })
        .from(surveyResponseTable)
        .where(eq(surveyResponseTable.participantId, userId))
        .limit(1);
    if (surveys.length > 0) return "survey_response";

    const comparisons = await db
        .select({ id: comparisonResponseTable.id })
        .from(comparisonResponseTable)
        .where(eq(comparisonResponseTable.participantId, userId))
        .limit(1);
    if (comparisons.length > 0) return "comparison_response";

    const allocations = await db
        .select({ id: qvResponseTable.id })
        .from(qvResponseTable)
        .innerJoin(
            conversationParticipantTable,
            eq(conversationParticipantTable.id, qvResponseTable.participantId),
        )
        .where(
            and(
                eq(conversationParticipantTable.userId, userId),
                isNull(qvResponseTable.deletedAt),
            ),
        )
        .limit(1);
    return allocations.length > 0 ? "qv_response" : undefined;
}
