import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    getReplicaDatabase,
    type ReplicaDatabase,
} from "@/shared-backend/db.js";
import type { SqlExpression } from "@/utils/sqlExpression.js";
import {
    conversationTable,
    conversationViewSnapshotTable,
    rankingConversationConfigTable,
    creditVotingConfigTable,
    rankingConversationStatsSnapshotTable,
    qvLiveStatsTable,
    qvCalculationStateTable,
    qvCalculationTable,
} from "@/shared-backend/schema.js";

export interface ConversationDisplayCounts {
    conversationId: number;
    isClosed: boolean;
    conversationViewSnapshotId: number;
    rankingStatsSnapshotId: number | undefined;
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
    return sql<number>`case when ${conversationTable.prioritizationType} = 'comparisons' then
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
            isClosed: conversationTable.isClosed,
            conversationViewSnapshotId:
                latestSnapshot.conversationViewSnapshotId,
            rankingStatsSnapshotId:
                latestRankingSnapshot.rankingStatsSnapshotId,
            qvStatsRevision: qvLiveStatsTable.revision,
            qvCalculationStatus: qvCalculationTable.status,
            qvGeneration: qvCalculationStateTable.generation,
            opinionCount: conversationDisplayCount({
                rankingCount: rankingConversationConfigTable.itemCount,
                snapshotCount: latestSnapshot.opinionCount,
                qvCount: creditVotingConfigTable.itemCount,
            }),
            voteCount: conversationDisplayCount({
                rankingCount: rankingConversationConfigTable.voteCount,
                snapshotCount: latestSnapshot.voteCount,
            }),
            participantCount: conversationDisplayCount({
                rankingCount: rankingConversationConfigTable.participantCount,
                snapshotCount: latestSnapshot.participantCount,
                qvCount:
                    sql<number>`coalesce(${qvLiveStatsTable.participantCount}, 0)`.mapWith(
                        Number,
                    ),
            }),
            totalOpinionCount: conversationDisplayCount({
                rankingCount: rankingConversationConfigTable.totalItemCount,
                snapshotCount: latestSnapshot.totalOpinionCount,
                qvCount: creditVotingConfigTable.itemCount,
            }),
            totalVoteCount: conversationDisplayCount({
                rankingCount: rankingConversationConfigTable.totalVoteCount,
                snapshotCount: latestSnapshot.totalVoteCount,
            }),
            totalParticipantCount: conversationDisplayCount({
                rankingCount:
                    rankingConversationConfigTable.totalParticipantCount,
                snapshotCount: latestSnapshot.totalParticipantCount,
                qvCount:
                    sql<number>`coalesce(${qvLiveStatsTable.participantCount}, 0)`.mapWith(
                        Number,
                    ),
            }),
            moderatedOpinionCount:
                sql<number>`case when ${conversationTable.conversationType} = 'prioritizing' then 0 else ${latestSnapshot.moderatedOpinionCount} end`.mapWith(
                    Number,
                ),
            hiddenOpinionCount:
                sql<number>`case when ${conversationTable.conversationType} = 'prioritizing' then 0 else ${latestSnapshot.hiddenOpinionCount} end`.mapWith(
                    Number,
                ),
        })
        .from(conversationTable)
        .innerJoinLateral(latestSnapshot, sql`true`)
        .leftJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
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
            creditVotingConfigTable,
            eq(
                creditVotingConfigTable.id,
                conversationTable.creditVotingConfigId,
            ),
        )
        .where(inArray(conversationTable.id, conversationIds));
}

export async function fetchConversationDisplayCountsByConversationId({
    db,
    conversationIds,
}: {
    db: PostgresJsDatabase;
    conversationIds: number[];
}): Promise<Map<number, ConversationDisplayCounts>> {
    const uniqueConversationIds = Array.from(new Set(conversationIds));
    if (uniqueConversationIds.length === 0) return new Map();
    const rows = await buildConversationDisplayCountsQuery({
        db: getReplicaDatabase(db),
        conversationIds: uniqueConversationIds,
    });

    const countsByConversationId = new Map<number, ConversationDisplayCounts>();
    for (const row of rows) {
        const { qvGeneration, qvCalculationStatus, ...counts } = row;
        countsByConversationId.set(row.conversationId, {
            ...counts,
            rankingStatsSnapshotId: row.rankingStatsSnapshotId ?? undefined,
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
