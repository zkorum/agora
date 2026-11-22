import { and, eq, isNull } from "drizzle-orm";
import type {
    PostgresTransaction,
    ReplicaDatabase,
} from "@/shared-backend/db.js";
import {
    comparisonAnalysisCloseTable,
    rankingConversationStatsSnapshotTable,
    realtimeEventOutboxTable,
} from "@/shared-backend/schema.js";
import type { SSEEventDataByType } from "@/shared/types/dto.js";

/** The selection and its counters always refer to the same immutable result. */
export function selectedComparisonStatsSnapshot(db: ReplicaDatabase) {
    const snapshot = rankingConversationStatsSnapshotTable;
    const native = comparisonAnalysisCloseTable;
    return db
        .select({
            id: snapshot.id,
            itemCount: snapshot.itemCount,
            totalItemCount: snapshot.totalItemCount,
            voteCount: snapshot.voteCount,
            totalVoteCount: snapshot.totalVoteCount,
            participantCount: snapshot.participantCount,
            totalParticipantCount: snapshot.totalParticipantCount,
        })
        .from(snapshot)
        .where(
            and(
                eq(snapshot.id, native.servedStatsSnapshotId),
                isNull(snapshot.deletedAt),
            ),
        )
        .as("selected_comparison_stats_snapshot");
}

export async function queueComparisonSelectionChanged({
    db,
    conversationSlugId,
    snapshot,
    version,
}: {
    db: PostgresTransaction;
    conversationSlugId: string;
    snapshot: typeof rankingConversationStatsSnapshotTable.$inferSelect;
    version: NonNullable<
        SSEEventDataByType["conversation_ranking_stats_updated"]["comparisonCloseSelectionVersion"]
    >;
}): Promise<void> {
    const payload: SSEEventDataByType["conversation_ranking_stats_updated"] = {
        conversationSlugId,
        rankingStatsSnapshotId: snapshot.id,
        checkpointChanged: false,
        closedSelectionChanged: true,
        comparisonCloseSelectionVersion: version,
        opinionCount: snapshot.itemCount,
        totalOpinionCount: snapshot.totalItemCount,
        voteCount: snapshot.voteCount,
        totalVoteCount: snapshot.totalVoteCount,
        participantCount: snapshot.participantCount,
        totalParticipantCount: snapshot.totalParticipantCount,
        moderatedOpinionCount: 0,
        hiddenOpinionCount: 0,
        isClosed: true,
        timestamp: Date.now(),
    };
    await db.insert(realtimeEventOutboxTable).values({
        eventType: "conversation_ranking_stats_updated",
        payload,
    });
}
