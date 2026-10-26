import { and, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    opinionModerationTable,
    opinionTable,
    userTable,
    voteContentTable,
    voteTable,
} from "@/shared-backend/schema.js";
import { getEligibleParticipantIdsForAnalysis } from "@/shared-backend/surveyAnalysis.js";

export async function getAnalysisEligibleOpinionVotes({
    db,
    conversationId,
    opinionIds,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    opinionIds: readonly number[];
}) {
    // Current participant eligibility determines validity. Editing preserves old
    // vote-content links rather than invalidating votes on previous wording.
    const activeVotes = db
        .select({
            opinionId: opinionTable.id,
            authorId: voteTable.authorId,
            vote: voteContentTable.vote,
        })
        .from(voteTable)
        .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
        .innerJoin(userTable, eq(userTable.id, voteTable.authorId))
        .innerJoin(
            voteContentTable,
            eq(voteContentTable.id, voteTable.currentContentId),
        )
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
                inArray(opinionTable.id, [...opinionIds]),
                isNotNull(opinionTable.currentContentId),
                eq(userTable.isDeleted, false),
                isNull(opinionModerationTable.id),
            ),
        )
        .as("activeOpinionVotes");
    const eligibleParticipantIds = await getEligibleParticipantIdsForAnalysis({
        db,
        conversationId,
        candidateParticipantIds: async () => {
            const voters = await db
                .selectDistinct({ authorId: activeVotes.authorId })
                .from(activeVotes);
            return voters.map((voter) => voter.authorId);
        },
    });
    return db
        .select()
        .from(activeVotes)
        .where(
            eligibleParticipantIds === undefined
                ? undefined
                : inArray(activeVotes.authorId, [...eligibleParticipantIds]),
        )
        .as("analysisEligibleOpinionVotes");
}

export async function getOpinionIdsWithBlockingVotes({
    db,
    conversationId,
    opinionIds,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    opinionIds: readonly number[];
}): Promise<ReadonlySet<number>> {
    if (opinionIds.length === 0) return new Set();
    const votes = await getAnalysisEligibleOpinionVotes({
        db,
        conversationId,
        opinionIds,
    });
    const rows = await db
        .selectDistinct({ opinionId: votes.opinionId })
        .from(votes)
        .innerJoin(opinionTable, eq(opinionTable.id, votes.opinionId))
        .where(
            or(
                eq(opinionTable.isSeed, true),
                ne(votes.authorId, opinionTable.authorId),
            ),
        );
    return new Set(rows.map((row) => row.opinionId));
}
