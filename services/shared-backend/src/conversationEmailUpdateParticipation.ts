import {
    and,
    eq,
    exists,
    inArray,
    isNotNull,
    isNull,
    lte,
    ne,
    or,
} from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { alias, unionAll, type AnyPgColumn } from "drizzle-orm/pg-core";
import {
    conversationEmailUpdateConversationTable,
    comparisonAnswerTable,
    comparisonResponseTable,
    opinionModerationTable,
    opinionTable,
    voteContentTable,
    voteTable,
    userTable,
    gatheringResponseTable,
    gatheringResponseContentTable,
} from "./schema.js";

export type ConversationEmailParticipationScope =
    | { kind: "user"; userId: string }
    | { kind: "conversation_ids"; conversationIds: readonly number[] }
    | { kind: "update"; updateId: number };

function participationScopeCondition({
    db,
    conversationId,
    participantId,
    scope,
}: {
    db: PostgresDatabase;
    conversationId: AnyPgColumn;
    participantId: AnyPgColumn;
    scope: ConversationEmailParticipationScope;
}) {
    if (scope.kind === "user") return eq(participantId, scope.userId);
    return scope.kind === "conversation_ids"
        ? inArray(conversationId, scope.conversationIds)
        : exists(
              db
                  .select({
                      updateId:
                          conversationEmailUpdateConversationTable.updateId,
                  })
                  .from(conversationEmailUpdateConversationTable)
                  .where(
                      and(
                          eq(
                              conversationEmailUpdateConversationTable.updateId,
                              scope.updateId,
                          ),
                          eq(
                              conversationEmailUpdateConversationTable.conversationId,
                              conversationId,
                          ),
                      ),
                  ),
          );
}

export function buildConversationEmailParticipationQuery({
    db,
    cutoffAt,
    scope,
}: {
    db: PostgresDatabase;
    cutoffAt: Date;
    scope: ConversationEmailParticipationScope;
}) {
    const currentVoteContent = alias(
        voteContentTable,
        "conversation_email_current_vote_content",
    );
    const historicalComparisonAnswer = alias(
        comparisonAnswerTable,
        "conversation_email_historical_comparison_answer",
    );
    const visibleOpinionModeration = or(
        isNull(opinionModerationTable.id),
        ne(opinionModerationTable.moderationAction, "hide"),
    );
    const voteParticipation = db
        .select({
            userId: voteTable.authorId,
            conversationId: opinionTable.conversationId,
        })
        .from(voteTable)
        .innerJoin(
            currentVoteContent,
            eq(currentVoteContent.id, voteTable.currentContentId),
        )
        .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                participationScopeCondition({
                    db,
                    conversationId: opinionTable.conversationId,
                    participantId: voteTable.authorId,
                    scope,
                }),
                isNotNull(opinionTable.currentContentId),
                lte(currentVoteContent.createdAt, cutoffAt),
                visibleOpinionModeration,
            ),
        );
    const opinionParticipation = db
        .select({
            userId: userTable.id,
            conversationId: opinionTable.conversationId,
        })
        .from(opinionTable)
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, opinionTable.authorId),
                eq(userTable.isDeleted, false),
            ),
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
                participationScopeCondition({
                    db,
                    conversationId: opinionTable.conversationId,
                    participantId: opinionTable.authorId,
                    scope,
                }),
                isNotNull(opinionTable.currentContentId),
                lte(opinionTable.createdAt, cutoffAt),
                visibleOpinionModeration,
            ),
        );
    const comparisonParticipation = db
        .select({
            userId: userTable.id,
            conversationId: comparisonResponseTable.conversationId,
        })
        .from(comparisonResponseTable)
        .innerJoin(
            userTable,
            eq(userTable.id, comparisonResponseTable.participantId),
        )
        .where(
            and(
                participationScopeCondition({
                    db,
                    conversationId: comparisonResponseTable.conversationId,
                    participantId: comparisonResponseTable.participantId,
                    scope,
                }),
                exists(
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
                exists(
                    db
                        .select({ id: historicalComparisonAnswer.id })
                        .from(historicalComparisonAnswer)
                        .where(
                            and(
                                eq(
                                    historicalComparisonAnswer.comparisonResponseId,
                                    comparisonResponseTable.id,
                                ),
                                lte(
                                    historicalComparisonAnswer.createdAt,
                                    cutoffAt,
                                ),
                            ),
                        ),
                ),
            ),
        );
    const gatheringParticipation = db
        .select({
            userId: userTable.id,
            conversationId: gatheringResponseTable.conversationId,
        })
        .from(gatheringResponseTable)
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, gatheringResponseTable.authorId),
                eq(userTable.isDeleted, false),
            ),
        )
        .where(
            and(
                participationScopeCondition({
                    db,
                    conversationId: gatheringResponseTable.conversationId,
                    participantId: gatheringResponseTable.authorId,
                    scope,
                }),
                eq(gatheringResponseTable.isSeed, false),
                isNull(gatheringResponseTable.deletedAt),
                isNull(gatheringResponseTable.accountHiddenAt),
                isNotNull(gatheringResponseTable.currentContentId),
                or(
                    isNull(gatheringResponseTable.moderation),
                    eq(gatheringResponseTable.moderation, "move"),
                ),
                lte(gatheringResponseTable.createdAt, cutoffAt),
                // A facilitator copying a response is not the author's participation/consent.
                or(
                    isNull(gatheringResponseTable.baselineContentId),
                    exists(
                        db
                            .select({ id: gatheringResponseContentTable.id })
                            .from(gatheringResponseContentTable)
                            .where(
                                and(
                                    eq(
                                        gatheringResponseContentTable.responseId,
                                        gatheringResponseTable.id,
                                    ),
                                    ne(
                                        gatheringResponseContentTable.id,
                                        gatheringResponseTable.baselineContentId,
                                    ),
                                    lte(
                                        gatheringResponseContentTable.createdAt,
                                        cutoffAt,
                                    ),
                                ),
                            ),
                    ),
                ),
            ),
        );
    return unionAll(
        voteParticipation,
        opinionParticipation,
        comparisonParticipation,
        gatheringParticipation,
    );
}
