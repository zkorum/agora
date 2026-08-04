import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    conversationViewSnapshotTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
} from "@/shared-backend/schema.js";

export interface ConversationDisplayCounts {
    conversationId: number;
    conversationViewSnapshotId: number;
    rankingStatsSnapshotId: number | undefined;
    opinionCount: number;
    voteCount: number;
    participantCount: number;
    totalOpinionCount: number;
    totalVoteCount: number;
    totalParticipantCount: number;
    moderatedOpinionCount: number;
    hiddenOpinionCount: number;
}

export async function fetchConversationDisplayCountsByConversationId({
    db,
    conversationIds,
}: {
    db: PostgresJsDatabase;
    conversationIds: number[];
}): Promise<Map<number, ConversationDisplayCounts>> {
    const uniqueConversationIds = Array.from(new Set(conversationIds));
    if (uniqueConversationIds.length === 0) {
        return new Map();
    }

    const latestSnapshot = db
        .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
            conversationId: conversationViewSnapshotTable.conversationId,
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
                inArray(
                    conversationViewSnapshotTable.conversationId,
                    uniqueConversationIds,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.conversationId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        )
        .as("latest_conversation_display_snapshot");
    const latestRankingSnapshot = db
        .selectDistinctOn(
            [rankingConversationStatsSnapshotTable.conversationId],
            {
                conversationId:
                    rankingConversationStatsSnapshotTable.conversationId,
                rankingStatsSnapshotId:
                    rankingConversationStatsSnapshotTable.id,
            },
        )
        .from(rankingConversationStatsSnapshotTable)
        .where(
            inArray(
                rankingConversationStatsSnapshotTable.conversationId,
                uniqueConversationIds,
            ),
        )
        .orderBy(
            rankingConversationStatsSnapshotTable.conversationId,
            desc(rankingConversationStatsSnapshotTable.createdAt),
            desc(rankingConversationStatsSnapshotTable.id),
        )
        .as("latest_ranking_stats_snapshot");
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            conversationType: conversationTable.conversationType,
            conversationViewSnapshotId:
                latestSnapshot.conversationViewSnapshotId,
            rankingStatsSnapshotId:
                latestRankingSnapshot.rankingStatsSnapshotId,
            snapshotOpinionCount: latestSnapshot.opinionCount,
            snapshotVoteCount: latestSnapshot.voteCount,
            snapshotParticipantCount: latestSnapshot.participantCount,
            snapshotTotalOpinionCount: latestSnapshot.totalOpinionCount,
            snapshotTotalVoteCount: latestSnapshot.totalVoteCount,
            snapshotTotalParticipantCount: latestSnapshot.totalParticipantCount,
            snapshotModeratedOpinionCount: latestSnapshot.moderatedOpinionCount,
            snapshotHiddenOpinionCount: latestSnapshot.hiddenOpinionCount,
            rankingItemCount: rankingConversationConfigTable.itemCount,
            rankingTotalItemCount:
                rankingConversationConfigTable.totalItemCount,
            rankingVoteCount: rankingConversationConfigTable.voteCount,
            rankingTotalVoteCount:
                rankingConversationConfigTable.totalVoteCount,
            rankingParticipantCount:
                rankingConversationConfigTable.participantCount,
            rankingTotalParticipantCount:
                rankingConversationConfigTable.totalParticipantCount,
            rankingProcessedScoringInputRevision:
                rankingConversationConfigTable.processedScoringInputRevision,
        })
        .from(conversationTable)
        .leftJoin(
            latestSnapshot,
            eq(latestSnapshot.conversationId, conversationTable.id),
        )
        .leftJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .leftJoin(
            latestRankingSnapshot,
            eq(latestRankingSnapshot.conversationId, conversationTable.id),
        )
        .where(inArray(conversationTable.id, uniqueConversationIds));

    const countsByConversationId = new Map<number, ConversationDisplayCounts>();
    for (const row of rows) {
        if (row.conversationViewSnapshotId === null) {
            continue;
        }
        if (row.conversationType === "ranking") {
            if (
                row.rankingItemCount === null ||
                row.rankingTotalItemCount === null ||
                row.rankingVoteCount === null ||
                row.rankingTotalVoteCount === null ||
                row.rankingParticipantCount === null ||
                row.rankingTotalParticipantCount === null
            ) {
                continue;
            }
            const hasProcessedRankingCounts =
                row.rankingProcessedScoringInputRevision !== null &&
                row.rankingProcessedScoringInputRevision >= 0;
            countsByConversationId.set(row.conversationId, {
                conversationId: row.conversationId,
                conversationViewSnapshotId: row.conversationViewSnapshotId,
                rankingStatsSnapshotId: row.rankingStatsSnapshotId ?? undefined,
                opinionCount: hasProcessedRankingCounts
                    ? row.rankingItemCount
                    : Math.max(
                          row.rankingItemCount,
                          row.snapshotOpinionCount ?? 0,
                      ),
                totalOpinionCount: hasProcessedRankingCounts
                    ? row.rankingTotalItemCount
                    : Math.max(
                          row.rankingTotalItemCount,
                          row.snapshotTotalOpinionCount ?? 0,
                      ),
                voteCount: hasProcessedRankingCounts
                    ? row.rankingVoteCount
                    : Math.max(row.rankingVoteCount, row.snapshotVoteCount ?? 0),
                totalVoteCount: hasProcessedRankingCounts
                    ? row.rankingTotalVoteCount
                    : Math.max(
                          row.rankingTotalVoteCount,
                          row.snapshotTotalVoteCount ?? 0,
                      ),
                participantCount: hasProcessedRankingCounts
                    ? row.rankingParticipantCount
                    : Math.max(
                          row.rankingParticipantCount,
                          row.snapshotParticipantCount ?? 0,
                      ),
                totalParticipantCount: hasProcessedRankingCounts
                    ? row.rankingTotalParticipantCount
                    : Math.max(
                          row.rankingTotalParticipantCount,
                          row.snapshotTotalParticipantCount ?? 0,
                      ),
                moderatedOpinionCount: 0,
                hiddenOpinionCount: 0,
            });
            continue;
        }
        if (
            row.snapshotOpinionCount === null ||
            row.snapshotVoteCount === null ||
            row.snapshotParticipantCount === null ||
            row.snapshotTotalOpinionCount === null ||
            row.snapshotTotalVoteCount === null ||
            row.snapshotTotalParticipantCount === null ||
            row.snapshotModeratedOpinionCount === null ||
            row.snapshotHiddenOpinionCount === null
        ) {
            continue;
        }
        countsByConversationId.set(row.conversationId, {
            conversationId: row.conversationId,
            conversationViewSnapshotId: row.conversationViewSnapshotId,
            rankingStatsSnapshotId: undefined,
            opinionCount: row.snapshotOpinionCount,
            voteCount: row.snapshotVoteCount,
            participantCount: row.snapshotParticipantCount,
            totalOpinionCount: row.snapshotTotalOpinionCount,
            totalVoteCount: row.snapshotTotalVoteCount,
            totalParticipantCount: row.snapshotTotalParticipantCount,
            moderatedOpinionCount: row.snapshotModeratedOpinionCount,
            hiddenOpinionCount: row.snapshotHiddenOpinionCount,
        });
    }
    return countsByConversationId;
}
