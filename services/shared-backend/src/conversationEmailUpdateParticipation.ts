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
    maxdiffComparisonTable,
    maxdiffResultTable,
    opinionModerationTable,
    opinionTable,
    voteContentTable,
    voteTable,
} from "./schema.js";

export type ConversationEmailParticipationScope =
    | { kind: "conversation_ids"; conversationIds: readonly number[] }
    | { kind: "update"; updateId: number };

function participationScopeCondition({
    db,
    conversationId,
    scope,
}: {
    db: PostgresDatabase;
    conversationId: AnyPgColumn;
    scope: ConversationEmailParticipationScope;
}) {
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
    const historicalMaxdiffComparison = alias(
        maxdiffComparisonTable,
        "conversation_email_historical_maxdiff_comparison",
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
                    scope,
                }),
                isNotNull(opinionTable.currentContentId),
                lte(currentVoteContent.createdAt, cutoffAt),
                visibleOpinionModeration,
            ),
        );
    const opinionParticipation = db
        .select({
            userId: opinionTable.authorId,
            conversationId: opinionTable.conversationId,
        })
        .from(opinionTable)
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
                    scope,
                }),
                isNotNull(opinionTable.currentContentId),
                lte(opinionTable.createdAt, cutoffAt),
                visibleOpinionModeration,
            ),
        );
    const maxdiffParticipation = db
        .select({
            userId: maxdiffResultTable.participantId,
            conversationId: maxdiffResultTable.conversationId,
        })
        .from(maxdiffResultTable)
        .where(
            and(
                participationScopeCondition({
                    db,
                    conversationId: maxdiffResultTable.conversationId,
                    scope,
                }),
                exists(
                    db
                        .select({ id: maxdiffComparisonTable.id })
                        .from(maxdiffComparisonTable)
                        .where(
                            and(
                                eq(
                                    maxdiffComparisonTable.maxdiffResultId,
                                    maxdiffResultTable.id,
                                ),
                                isNull(maxdiffComparisonTable.deletedAt),
                            ),
                        ),
                ),
                exists(
                    db
                        .select({ id: historicalMaxdiffComparison.id })
                        .from(historicalMaxdiffComparison)
                        .where(
                            and(
                                eq(
                                    historicalMaxdiffComparison.maxdiffResultId,
                                    maxdiffResultTable.id,
                                ),
                                lte(
                                    historicalMaxdiffComparison.createdAt,
                                    cutoffAt,
                                ),
                            ),
                        ),
                ),
            ),
        );
    return unionAll(
        voteParticipation,
        opinionParticipation,
        maxdiffParticipation,
    );
}
