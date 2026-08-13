import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import pLimit from "p-limit";
import {
    maxdiffComparisonTable,
    maxdiffResultTable,
    opinionModerationTable,
    opinionTable,
    rankingItemTable,
    surveyConfigTable,
    surveyQuestionTable,
    userTable,
    voteTable,
} from "@/shared-backend/schema.js";
import { getEligibleParticipantIdsForAnalysis } from "@/shared-backend/surveyAnalysis.js";

export interface ProjectParticipantCounts {
    participantCount: number;
    participationCount: number;
}

interface ProjectConversation {
    conversationId: number;
    conversationType: "polis" | "ranking";
}

const SURVEY_ELIGIBILITY_CONCURRENCY = 8;

export function calculateProjectParticipantCounts({
    participantIdsByConversationId,
}: {
    participantIdsByConversationId: ReadonlyMap<number, ReadonlySet<string>>;
}): ProjectParticipantCounts {
    const uniqueParticipantIds = new Set<string>();
    let participationCount = 0;

    for (const participantIds of participantIdsByConversationId.values()) {
        participationCount += participantIds.size;
        for (const participantId of participantIds) {
            uniqueParticipantIds.add(participantId);
        }
    }

    return {
        participantCount: uniqueParticipantIds.size,
        participationCount,
    };
}

export async function fetchProjectParticipantCounts({
    db,
    conversations,
}: {
    db: PostgresJsDatabase;
    conversations: readonly ProjectConversation[];
}): Promise<ProjectParticipantCounts> {
    if (conversations.length === 0) {
        return { participantCount: 0, participationCount: 0 };
    }

    const polisConversationIds = conversations
        .filter(({ conversationType }) => conversationType === "polis")
        .map(({ conversationId }) => conversationId);
    const rankingConversationIds = conversations
        .filter(({ conversationType }) => conversationType === "ranking")
        .map(({ conversationId }) => conversationId);
    const conversationIds = conversations.map(
        ({ conversationId }) => conversationId,
    );
    const bestRankingItem = alias(rankingItemTable, "best_ranking_item");
    const worstRankingItem = alias(rankingItemTable, "worst_ranking_item");
    const polisRowsPromise =
        polisConversationIds.length === 0
            ? Promise.resolve([])
            : db
                  .select({
                      conversationId: opinionTable.conversationId,
                      participantId: voteTable.authorId,
                      hasUnmoderatedVote:
                          sql<boolean>`bool_or(${opinionModerationTable.id} IS NULL)`.as(
                              "has_unmoderated_vote",
                          ),
                  })
                  .from(voteTable)
                  .innerJoin(
                      opinionTable,
                      eq(voteTable.opinionId, opinionTable.id),
                  )
                  .innerJoin(userTable, eq(voteTable.authorId, userTable.id))
                  .leftJoin(
                      opinionModerationTable,
                      eq(opinionModerationTable.opinionId, opinionTable.id),
                  )
                  .where(
                      and(
                          inArray(
                              opinionTable.conversationId,
                              polisConversationIds,
                          ),
                          isNotNull(opinionTable.currentContentId),
                          isNotNull(voteTable.currentContentId),
                          eq(userTable.isDeleted, false),
                      ),
                  )
                  .groupBy(opinionTable.conversationId, voteTable.authorId);
    const rankingRowsPromise =
        rankingConversationIds.length === 0
            ? Promise.resolve([])
            : db
                  .select({
                      conversationId: maxdiffResultTable.conversationId,
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
                      eq(maxdiffResultTable.participantId, userTable.id),
                  )
                  .innerJoin(
                      bestRankingItem,
                      and(
                          eq(
                              bestRankingItem.conversationId,
                              maxdiffResultTable.conversationId,
                          ),
                          eq(
                              bestRankingItem.slugId,
                              maxdiffComparisonTable.bestSlugId,
                          ),
                          isNotNull(bestRankingItem.currentContentId),
                          inArray(bestRankingItem.lifecycleStatus, [
                              "active",
                              "in_progress",
                          ]),
                      ),
                  )
                  .innerJoin(
                      worstRankingItem,
                      and(
                          eq(
                              worstRankingItem.conversationId,
                              maxdiffResultTable.conversationId,
                          ),
                          eq(
                              worstRankingItem.slugId,
                              maxdiffComparisonTable.worstSlugId,
                          ),
                          isNotNull(worstRankingItem.currentContentId),
                          inArray(worstRankingItem.lifecycleStatus, [
                              "active",
                              "in_progress",
                          ]),
                      ),
                  )
                  .where(
                      and(
                          inArray(
                              maxdiffResultTable.conversationId,
                              rankingConversationIds,
                          ),
                          isNull(maxdiffComparisonTable.deletedAt),
                          eq(userTable.isDeleted, false),
                      ),
                  )
                  .groupBy(
                      maxdiffResultTable.conversationId,
                      maxdiffResultTable.participantId,
                  );
    const requiredSurveyConversationIdsPromise = db
        .selectDistinct({ conversationId: surveyConfigTable.conversationId })
        .from(surveyConfigTable)
        .innerJoin(
            surveyQuestionTable,
            eq(surveyQuestionTable.surveyConfigId, surveyConfigTable.id),
        )
        .where(
            and(
                inArray(surveyConfigTable.conversationId, conversationIds),
                isNull(surveyConfigTable.deletedAt),
                eq(surveyConfigTable.isOptional, false),
                isNotNull(surveyQuestionTable.currentContentId),
                eq(surveyQuestionTable.isRequired, true),
            ),
        );
    const [polisRows, rankingRows, requiredSurveyConversationRows] =
        await Promise.all([
            polisRowsPromise,
            rankingRowsPromise,
            requiredSurveyConversationIdsPromise,
        ]);

    const candidateIdsByConversationId = new Map<number, Set<string>>();
    const addCandidate = ({
        conversationId,
        participantId,
    }: {
        conversationId: number;
        participantId: string;
    }): void => {
        const participantIds =
            candidateIdsByConversationId.get(conversationId) ??
            new Set<string>();
        participantIds.add(participantId);
        candidateIdsByConversationId.set(conversationId, participantIds);
    };

    for (const row of polisRows) {
        if (row.hasUnmoderatedVote) {
            addCandidate(row);
        }
    }
    for (const row of rankingRows) {
        addCandidate(row);
    }

    const requiredSurveyConversationIds = new Set(
        requiredSurveyConversationRows.map(
            ({ conversationId }) => conversationId,
        ),
    );
    const limitSurveyEligibility = pLimit(SURVEY_ELIGIBILITY_CONCURRENCY);
    const eligibleEntries = await Promise.all(
        [...candidateIdsByConversationId.entries()].map(
            async ([conversationId, candidateIds]) => {
                if (!requiredSurveyConversationIds.has(conversationId)) {
                    return [conversationId, candidateIds] as const;
                }
                const eligibleIds = await limitSurveyEligibility(async () =>
                    getEligibleParticipantIdsForAnalysis({
                        db,
                        conversationId,
                        candidateParticipantIds: [...candidateIds],
                    }),
                );
                return [conversationId, eligibleIds ?? candidateIds] as const;
            },
        ),
    );

    return calculateProjectParticipantCounts({
        participantIdsByConversationId: new Map(eligibleEntries),
    });
}
