import {
    and,
    asc,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
    rankingConversationStatsItemTable,
    rankingScoreEntityTable,
    rankingItemTable,
    comparisonResponseTable,
    comparisonAnswerTable,
    userTable,
} from "../src/shared-backend/schema.js";
import type { RankingDiagnosticsRequest } from "../src/shared-backend/rankingDiagnosticsProtocol.js";
import { buildComparisonAppearanceCountQuery } from "../src/service/comparisonQueries.js";

// The no-op predicate gives observer queries a separate fingerprint from normal
// application reads; the marker excludes them from query-cost attribution.
const observerPredicate = sql`true /* ranking-performance-monitor */`;

export function buildRankingDiagnosticsQuery({
    db,
    request,
}: {
    db: PostgresJsDatabase;
    request: Exclude<RankingDiagnosticsRequest, { operation: "query-stats" }>;
}) {
    switch (request.operation) {
        case "revisions": {
            const latest = db
                .select({
                    id: rankingConversationStatsSnapshotTable.id,
                    createdAt: rankingConversationStatsSnapshotTable.createdAt,
                })
                .from(rankingConversationStatsSnapshotTable)
                .where(
                    eq(
                        rankingConversationStatsSnapshotTable.conversationId,
                        conversationTable.id,
                    ),
                )
                .orderBy(
                    desc(rankingConversationStatsSnapshotTable.createdAt),
                    desc(rankingConversationStatsSnapshotTable.id),
                )
                .limit(1)
                .as("latest_snapshot");
            return db
                .select({
                    id: conversationTable.id,
                    slug_id: conversationTable.slugId,
                    scoring_input_revision: sql<string>`${rankingConversationConfigTable.scoringInputRevision}::text`,
                    processed_scoring_input_revision: sql<string>`${rankingConversationConfigTable.processedScoringInputRevision}::text`,
                    vote_count: rankingConversationConfigTable.voteCount,
                    participant_count:
                        rankingConversationConfigTable.participantCount,
                    snapshot_id: latest.id,
                    published_at: latest.createdAt,
                })
                .from(conversationTable)
                .innerJoin(
                    rankingConversationConfigTable,
                    eq(
                        rankingConversationConfigTable.id,
                        conversationTable.rankingConfigId,
                    ),
                )
                .leftJoinLateral(latest, sql`true`)
                .where(
                    and(
                        observerPredicate,
                        inArray(conversationTable.slugId, request.slugs),
                        isNotNull(conversationTable.currentContentId),
                    ),
                )
                .orderBy(asc(conversationTable.id));
        }
        case "history":
            return db
                .select({
                    slug_id: conversationTable.slugId,
                    active_comparisons:
                        sql<number>`count(*) filter (where ${isNull(comparisonAnswerTable.deletedAt)})`.mapWith(
                            Number,
                        ),
                    soft_deleted_comparisons:
                        sql<number>`count(*) filter (where ${isNotNull(comparisonAnswerTable.deletedAt)})`.mapWith(
                            Number,
                        ),
                })
                .from(conversationTable)
                .innerJoin(
                    comparisonResponseTable,
                    eq(
                        comparisonResponseTable.conversationId,
                        conversationTable.id,
                    ),
                )
                .innerJoin(
                    comparisonAnswerTable,
                    eq(
                        comparisonAnswerTable.comparisonResponseId,
                        comparisonResponseTable.id,
                    ),
                )
                .where(
                    and(
                        observerPredicate,
                        inArray(conversationTable.slugId, request.slugs),
                    ),
                )
                .groupBy(conversationTable.slugId);
        case "scores":
            return db
                .select({
                    itemSlugId: rankingItemTable.slugId,
                    score: rankingScoreEntityTable.displayScore,
                    participantCount:
                        rankingConversationStatsItemTable.participantCount,
                })
                .from(rankingConversationStatsItemTable)
                .innerJoin(
                    rankingItemTable,
                    eq(
                        rankingItemTable.id,
                        rankingConversationStatsItemTable.rankingItemId,
                    ),
                )
                .innerJoin(
                    rankingConversationStatsSnapshotTable,
                    eq(
                        rankingConversationStatsSnapshotTable.id,
                        rankingConversationStatsItemTable.statsSnapshotId,
                    ),
                )
                .leftJoin(
                    rankingScoreEntityTable,
                    and(
                        eq(
                            rankingScoreEntityTable.rankingScoreId,
                            rankingConversationStatsSnapshotTable.rankingScoreId,
                        ),
                        eq(
                            rankingScoreEntityTable.entitySlugId,
                            rankingItemTable.slugId,
                        ),
                    ),
                )
                .where(
                    and(
                        observerPredicate,
                        eq(
                            rankingConversationStatsItemTable.statsSnapshotId,
                            request.snapshotId,
                        ),
                        inArray(
                            rankingConversationStatsItemTable.lifecycleStatus,
                            ["active", "in_progress"],
                        ),
                    ),
                );
        case "plan": {
            if (request.kind === "comparisons") {
                return db
                    .select({
                        conversationId: comparisonResponseTable.conversationId,
                        resultId: comparisonAnswerTable.comparisonResponseId,
                        participantId: comparisonResponseTable.participantId,
                        best: comparisonAnswerTable.bestSlugId,
                        worst: comparisonAnswerTable.worstSlugId,
                        candidateSet: comparisonAnswerTable.candidateSet,
                        position: comparisonAnswerTable.position,
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
                            observerPredicate,
                            eq(
                                comparisonResponseTable.conversationId,
                                request.conversationId,
                            ),
                            isNull(comparisonAnswerTable.deletedAt),
                            eq(userTable.isDeleted, false),
                        ),
                    )
                    .orderBy(
                        comparisonResponseTable.conversationId,
                        comparisonAnswerTable.comparisonResponseId,
                        comparisonAnswerTable.position,
                    );
            }
            return buildComparisonAppearanceCountQuery({
                db,
                conversationId: request.conversationId,
                additionalFilter: observerPredicate,
            });
        }
    }
}
