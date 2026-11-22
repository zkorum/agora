import {
    and,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    getReplicaDatabase,
    type ReplicaDatabase,
} from "@/shared-backend/db.js";
import type { SqlExpression } from "@/utils/sqlExpression.js";
import { fetchGatheringDisplayCounts } from "./gatheringDisplayCounts.js";
import {
    comparisonAnalysisCloseTable,
    conversationAnalysisCloseTable,
    conversationTable,
    conversationViewSnapshotTable,
    rankingConversationConfigTable,
    qvConfigTable,
    rankingConversationStatsSnapshotTable,
    qvLiveStatsTable,
    qvCalculationStateTable,
    qvCalculationTable,
} from "@/shared-backend/schema.js";
import { currentAnalysisCloseCondition } from "./closedAnalysisQueries.js";
import { selectedComparisonStatsSnapshot } from "./comparisonCloseSelection.js";
import type { z } from "zod";
import type { zodComparisonCloseSelectionVersion } from "@/shared/types/zod.js";

export interface ConversationDisplayCounts {
    gatheringResponseCount?: number;
    conversationId: number;
    isClosed: boolean;
    isClosingFinalized: boolean;
    conversationViewSnapshotId: number | undefined;
    rankingStatsSnapshotId: number | undefined;
    comparisonCloseSelectionVersion?: z.infer<
        typeof zodComparisonCloseSelectionVersion
    >;
    qvStatsRevision: number | undefined;
    qvLifecycle:
        | {
              generation: number;
              calculationStatus:
                  | "queued"
                  | "running"
                  | "ready"
                  | "failed"
                  | undefined;
          }
        | undefined;
    opinionCount: number;
    voteCount: number;
    participantCount: number;
    totalOpinionCount: number;
    totalVoteCount: number;
    totalParticipantCount: number;
    moderatedOpinionCount: number;
    hiddenOpinionCount: number;
}

export function conversationDisplayCount({
    rankingCount,
    snapshotCount,
    qvCount,
}: {
    rankingCount: SqlExpression<number>;
    snapshotCount: SqlExpression<number>;
    qvCount?: SqlExpression<number>;
}) {
    // PostgreSQL CASE/greatest have no Drizzle helpers. Imported ranking counts
    // retain the snapshot baseline only until the first completed scoring pass.
    return sql<number>`case when ${conversationTable.conversationType} = 'gathering' then 0
        when ${conversationTable.prioritizationType} = 'comparisons' then
        case when ${rankingConversationConfigTable.processedScoringInputRevision} >= 0
            then ${rankingCount} else greatest(${rankingCount}, ${snapshotCount}) end
        when ${conversationTable.prioritizationType} = 'qv' then ${qvCount ?? sql`0`}
        else ${snapshotCount} end`.mapWith(Number);
}

export function latestConversationDisplaySnapshot(db: ReplicaDatabase) {
    return db
        .select({
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            opinionCount: conversationViewSnapshotTable.opinionCount,
            voteCount: conversationViewSnapshotTable.voteCount,
            participantCount: conversationViewSnapshotTable.participantCount,
            totalOpinionCount: conversationViewSnapshotTable.totalOpinionCount,
            totalVoteCount: conversationViewSnapshotTable.totalVoteCount,
            totalParticipantCount:
                conversationViewSnapshotTable.totalParticipantCount,
            moderatedOpinionCount:
                conversationViewSnapshotTable.moderatedOpinionCount,
            hiddenOpinionCount:
                conversationViewSnapshotTable.hiddenOpinionCount,
        })
        .from(conversationViewSnapshotTable)
        .where(
            and(
                eq(
                    conversationViewSnapshotTable.conversationId,
                    conversationTable.id,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        )
        .limit(1)
        .as("latest_conversation_display_snapshot");
}

function buildConversationDisplayCountsQuery({
    db,
    conversationIds,
}: {
    db: ReplicaDatabase;
    conversationIds: readonly number[];
}) {
    const latestSnapshot = latestConversationDisplaySnapshot(db);
    const closingRankingSnapshot = selectedComparisonStatsSnapshot(db);
    const latestRankingSnapshot = db
        .select({
            rankingStatsSnapshotId: rankingConversationStatsSnapshotTable.id,
        })
        .from(rankingConversationStatsSnapshotTable)
        .where(
            and(
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    conversationTable.id,
                ),
                eq(conversationTable.prioritizationType, "comparisons"),
                isNull(closingRankingSnapshot.id),
                isNull(rankingConversationStatsSnapshotTable.derivedFromCloseId),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        )
        .orderBy(
            desc(rankingConversationStatsSnapshotTable.createdAt),
            desc(rankingConversationStatsSnapshotTable.id),
        )
        .limit(1)
        .as("latest_ranking_stats_snapshot");
    return db
        .select({
            conversationId: conversationTable.id,
            conversationType: conversationTable.conversationType,
            isClosed: conversationTable.isClosed,
            closedFinalizedAt: conversationTable.closedFinalizedAt,
            conversationViewSnapshotId:
                latestSnapshot.conversationViewSnapshotId,
            rankingStatsSnapshotId: sql<
                number | null
            >`coalesce(${closingRankingSnapshot.id}, ${latestRankingSnapshot.rankingStatsSnapshotId})`,
            comparisonCloseId: comparisonAnalysisCloseTable.closeId,
            comparisonSelectionRevision:
                conversationAnalysisCloseTable.selectionRevision,
            qvStatsRevision: qvLiveStatsTable.revision,
            qvCalculationStatus: qvCalculationTable.status,
            qvGeneration: qvCalculationStateTable.generation,
            opinionCount: conversationDisplayCount({
                rankingCount: sql<number>`coalesce(${closingRankingSnapshot.itemCount}, ${rankingConversationConfigTable.itemCount})`,
                snapshotCount: latestSnapshot.opinionCount,
                qvCount: qvConfigTable.itemCount,
            }),
            voteCount: conversationDisplayCount({
                rankingCount: sql<number>`coalesce(${closingRankingSnapshot.voteCount}, ${rankingConversationConfigTable.voteCount})`,
                snapshotCount: latestSnapshot.voteCount,
            }),
            participantCount: conversationDisplayCount({
                rankingCount: sql<number>`coalesce(${closingRankingSnapshot.participantCount}, ${rankingConversationConfigTable.participantCount})`,
                snapshotCount: latestSnapshot.participantCount,
                qvCount:
                    sql<number>`coalesce(${qvLiveStatsTable.participantCount}, 0)`.mapWith(
                        Number,
                    ),
            }),
            totalOpinionCount: conversationDisplayCount({
                rankingCount: sql<number>`coalesce(${closingRankingSnapshot.totalItemCount}, ${rankingConversationConfigTable.totalItemCount})`,
                snapshotCount: latestSnapshot.totalOpinionCount,
                qvCount: qvConfigTable.itemCount,
            }),
            totalVoteCount: conversationDisplayCount({
                rankingCount: sql<number>`coalesce(${closingRankingSnapshot.totalVoteCount}, ${rankingConversationConfigTable.totalVoteCount})`,
                snapshotCount: latestSnapshot.totalVoteCount,
            }),
            totalParticipantCount: conversationDisplayCount({
                rankingCount: sql<number>`coalesce(${closingRankingSnapshot.totalParticipantCount}, ${rankingConversationConfigTable.totalParticipantCount})`,
                snapshotCount: latestSnapshot.totalParticipantCount,
                qvCount:
                    sql<number>`coalesce(${qvLiveStatsTable.participantCount}, 0)`.mapWith(
                        Number,
                    ),
            }),
            moderatedOpinionCount:
                sql<number>`case when ${conversationTable.conversationType} = 'polis' then ${latestSnapshot.moderatedOpinionCount} else 0 end`.mapWith(
                    Number,
                ),
            hiddenOpinionCount:
                sql<number>`case when ${conversationTable.conversationType} = 'polis' then ${latestSnapshot.hiddenOpinionCount} else 0 end`.mapWith(
                    Number,
                ),
        })
        .from(conversationTable)
        .leftJoinLateral(latestSnapshot, sql`true`)
        .leftJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .leftJoin(
            conversationAnalysisCloseTable,
            and(
                eq(conversationTable.prioritizationType, "comparisons"),
                currentAnalysisCloseCondition(),
            ),
        )
        .leftJoin(
            comparisonAnalysisCloseTable,
            eq(
                comparisonAnalysisCloseTable.closeId,
                conversationAnalysisCloseTable.id,
            ),
        )
        .leftJoinLateral(closingRankingSnapshot, sql`true`)
        .leftJoinLateral(latestRankingSnapshot, sql`true`)
        .leftJoin(
            qvCalculationStateTable,
            and(
                eq(
                    qvCalculationStateTable.conversationId,
                    conversationTable.id,
                ),
                eq(conversationTable.prioritizationType, "qv"),
            ),
        )
        .leftJoin(
            qvCalculationTable,
            and(
                eq(qvCalculationTable.conversationId, conversationTable.id),
                eq(
                    qvCalculationTable.generation,
                    qvCalculationStateTable.generation,
                ),
            ),
        )
        .leftJoin(
            qvLiveStatsTable,
            eq(qvLiveStatsTable.conversationId, conversationTable.id),
        )
        .leftJoin(
            qvConfigTable,
            eq(qvConfigTable.id, conversationTable.creditVotingConfigId),
        )
        .where(
            and(
                inArray(conversationTable.id, conversationIds),
                or(
                    eq(conversationTable.conversationType, "gathering"),
                    isNotNull(latestSnapshot.conversationViewSnapshotId),
                ),
            ),
        );
}

export async function fetchConversationDisplayCountsByConversationId({
    db,
    conversationIds,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationIds: number[];
    userId?: string;
}): Promise<Map<number, ConversationDisplayCounts>> {
    const uniqueConversationIds = Array.from(new Set(conversationIds));
    if (uniqueConversationIds.length === 0) return new Map();
    const rows = await buildConversationDisplayCountsQuery({
        db: getReplicaDatabase(db),
        conversationIds: uniqueConversationIds,
    });

    const countsByConversationId = new Map<number, ConversationDisplayCounts>();
    const gatheringCounts = await fetchGatheringDisplayCounts({
        db,
        conversationIds: rows
            .filter((row) => row.conversationType === "gathering")
            .map((row) => row.conversationId),
        userId,
    });
    for (const row of rows) {
        const {
            qvGeneration,
            qvCalculationStatus,
            conversationType,
            comparisonCloseId,
            comparisonSelectionRevision,
            closedFinalizedAt,
            ...counts
        } = row;
        const gathering =
            conversationType === "gathering"
                ? gatheringCounts.get(row.conversationId)
                : undefined;
        countsByConversationId.set(row.conversationId, {
            ...counts,
            isClosingFinalized: closedFinalizedAt !== null,
            conversationViewSnapshotId:
                row.conversationViewSnapshotId ?? undefined,
            ...(gathering === undefined
                ? {}
                : {
                      gatheringResponseCount: gathering.responseCount,
                      participantCount: gathering.participantCount,
                      totalParticipantCount: gathering.participantCount,
                  }),
            rankingStatsSnapshotId: row.rankingStatsSnapshotId ?? undefined,
            comparisonCloseSelectionVersion:
                comparisonCloseId === null ||
                comparisonSelectionRevision === null
                    ? undefined
                    : {
                          closeId: comparisonCloseId,
                          selectionRevision: comparisonSelectionRevision,
                      },
            qvStatsRevision: row.qvStatsRevision ?? undefined,
            qvLifecycle:
                qvGeneration === null
                    ? undefined
                    : {
                          generation: qvGeneration,
                          calculationStatus: qvCalculationStatus ?? undefined,
                      },
        });
    }
    return countsByConversationId;
}
