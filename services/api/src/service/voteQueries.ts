import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    opinionTable,
    opinionContentTable,
    opinionModerationTable,
    userTable,
    voteTable,
} from "@/shared-backend/schema.js";
import { currentOpinionSourceCondition } from "@/shared-backend/opinionEligibility.js";

export function buildClosingVoteDrainQuery(db: PostgresJsDatabase) {
    return db
        .select({
            id: conversationTable.id,
            epoch: conversationTable.voteBufferEpoch,
        })
        .from(conversationTable)
        .where(
            and(
                eq(conversationTable.conversationType, "polis"),
                eq(conversationTable.isClosed, true),
                eq(conversationTable.voteBufferDrained, false),
                isNull(conversationTable.closedFinalizedAt),
            ),
        )
        .limit(20);
}

export function buildVoteSourceQuery({
    db,
    opinionSlugId,
    participantId,
}: {
    db: PostgresJsDatabase;
    opinionSlugId: string;
    participantId: string;
}) {
    return db
        .select({
            commentId: opinionTable.id,
            contentId: opinionContentTable.id,
            userId: opinionTable.authorId,
            sourceVersion: opinionContentTable.publicId,
            epoch: conversationTable.voteBufferEpoch,
            isClosed: conversationTable.isClosed,
            sequence: voteTable.bufferSequence,
            previousEpoch: voteTable.bufferEpoch,
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .leftJoin(
            voteTable,
            and(
                eq(voteTable.opinionId, opinionTable.id),
                eq(voteTable.authorId, participantId),
            ),
        )
        .where(
            and(
                eq(opinionTable.slugId, opinionSlugId),
                currentOpinionSourceCondition(),
                isNull(opinionModerationTable.id),
            ),
        )
        .limit(1);
}
