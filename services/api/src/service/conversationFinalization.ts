import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    analysisSnapshotTable,
    conversationTable,
    conversationViewSnapshotTable,
    opinionGroupSpecTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
    rankingConversationStatsItemTable,
    rankingConversationStatsCheckpointTable,
    realtimeEventOutboxTable,
} from "@/shared-backend/schema.js";
import { createConversationViewSnapshotsFromCurrentState } from "./conversationViewSnapshot.js";

type WriteTransaction = Parameters<
    Parameters<PostgresJsDatabase["transaction"]>[0]
>[0];

/** Finalization shares the caller's lifecycle transaction and conversation lock. */
export async function finalizeCurrentPolisConversation({
    db,
    conversationId,
}: {
    db: WriteTransaction;
    conversationId: number;
}): Promise<boolean> {
    const stateRows = await db
        .select({
            generation: polisConversationConfigTable.analysisDataGeneration,
        })
        .from(conversationTable)
        .innerJoin(
            polisConversationConfigTable,
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
        )
        .where(
            and(
                eq(conversationTable.id, conversationId),
                eq(conversationTable.isClosed, true),
                isNull(conversationTable.closedFinalizedAt),
                eq(conversationTable.voteBufferDrained, true),
            ),
        )
        .for("no key update", { of: conversationTable });
    const state = stateRows.at(0);
    if (state === undefined) return false;
    const specs = await db
        .selectDistinctOn([opinionGroupSpecTable.key], {
            id: opinionGroupSpecTable.id,
        })
        .from(opinionGroupSpecTable)
        .orderBy(
            opinionGroupSpecTable.key,
            desc(opinionGroupSpecTable.version),
        );
    if (specs.length === 0) return false;
    const views = await db
        .selectDistinctOn([conversationViewSnapshotTable.opinionGroupSpecId], {
            specId: conversationViewSnapshotTable.opinionGroupSpecId,
            generation: analysisSnapshotTable.dataGeneration,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            analysisSnapshotTable,
            eq(
                analysisSnapshotTable.id,
                conversationViewSnapshotTable.analysisSnapshotId,
            ),
        )
        .where(
            and(
                eq(
                    conversationViewSnapshotTable.conversationId,
                    conversationId,
                ),
                inArray(
                    conversationViewSnapshotTable.opinionGroupSpecId,
                    specs.map((spec) => spec.id),
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.opinionGroupSpecId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );
    if (
        views.length !== specs.length ||
        views.some((view) => view.generation !== state.generation)
    )
        return false;
    await createConversationViewSnapshotsFromCurrentState({
        db,
        conversationId,
        viewReason: "conversation_lifecycle_updated",
        lifecycleCheckpointReason: "conversation_closed",
        emitRealtimeEvent: true,
    });
    await db
        .update(conversationTable)
        .set({
            closingTargetRevision: state.generation,
            closedFinalizedAt: new Date(),
        })
        .where(eq(conversationTable.id, conversationId));
    return true;
}

/** Closing advances ranking's revision through its existing lifecycle trigger. */
export async function finalizeCurrentRankingConversation({
    db,
    conversationId,
}: {
    db: WriteTransaction;
    conversationId: number;
}): Promise<boolean> {
    const stateRows = await db
        .select({
            configId: rankingConversationConfigTable.id,
            revision: rankingConversationConfigTable.scoringInputRevision,
            processedRevision:
                rankingConversationConfigTable.processedScoringInputRevision,
            slugId: conversationTable.slugId,
        })
        .from(conversationTable)
        .innerJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(
            and(
                eq(conversationTable.id, conversationId),
                eq(conversationTable.isClosed, true),
                isNull(conversationTable.closedFinalizedAt),
            ),
        )
        .for("no key update", { of: conversationTable });
    const state = stateRows.at(0);
    if (state === undefined) return false;
    await db
        .update(conversationTable)
        .set({ closingTargetRevision: state.revision })
        .where(eq(conversationTable.id, conversationId));
    const previousRows = await db
        .select()
        .from(rankingConversationStatsSnapshotTable)
        .where(
            and(
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    conversationId,
                ),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        )
        .orderBy(
            desc(rankingConversationStatsSnapshotTable.createdAt),
            desc(rankingConversationStatsSnapshotTable.id),
        )
        .limit(1);
    const previous = previousRows.at(0);
    if (
        previous?.scoringInputRevision !== state.revision - 1 ||
        state.processedRevision !== previous.scoringInputRevision
    )
        return false;
    const snapshotRows = await db
        .insert(rankingConversationStatsSnapshotTable)
        .values({
            conversationId,
            rankingScoreId: previous.rankingScoreId,
            itemCount: previous.itemCount,
            totalItemCount: previous.totalItemCount,
            voteCount: previous.voteCount,
            totalVoteCount: previous.totalVoteCount,
            participantCount: previous.participantCount,
            totalParticipantCount: previous.totalParticipantCount,
            scoringInputRevision: state.revision,
            isClosed: true,
        })
        .returning({ id: rankingConversationStatsSnapshotTable.id });
    const snapshot = snapshotRows.at(0);
    if (snapshot === undefined) return false;
    const items = await db
        .select()
        .from(rankingConversationStatsItemTable)
        .where(
            and(
                eq(
                    rankingConversationStatsItemTable.statsSnapshotId,
                    previous.id,
                ),
                isNull(rankingConversationStatsItemTable.deletedAt),
            ),
        );
    if (items.length > 0)
        await db.insert(rankingConversationStatsItemTable).values(
            items.map((item) => ({
                statsSnapshotId: snapshot.id,
                conversationId,
                rankingItemId: item.rankingItemId,
                rankingItemContentId: item.rankingItemContentId,
                lifecycleStatus: item.lifecycleStatus,
                score: item.score,
                rank: item.rank,
                participantCount: item.participantCount,
                externalUrl: item.externalUrl,
            })),
        );
    await db.insert(rankingConversationStatsCheckpointTable).values({
        conversationId,
        statsSnapshotId: snapshot.id,
        reason: "conversation_closed",
    });
    await db
        .update(rankingConversationConfigTable)
        .set({ processedScoringInputRevision: state.revision })
        .where(eq(rankingConversationConfigTable.id, state.configId));
    await db
        .update(conversationTable)
        .set({ closedFinalizedAt: new Date() })
        .where(eq(conversationTable.id, conversationId));
    await db.insert(realtimeEventOutboxTable).values({
        eventType: "conversation_ranking_stats_updated",
        payload: {
            conversationSlugId: state.slugId,
            rankingStatsSnapshotId: snapshot.id,
            checkpointChanged: true,
            opinionCount: previous.itemCount,
            totalOpinionCount: previous.totalItemCount,
            voteCount: previous.voteCount,
            totalVoteCount: previous.totalVoteCount,
            participantCount: previous.participantCount,
            totalParticipantCount: previous.totalParticipantCount,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            isClosed: true,
            timestamp: Date.now(),
        },
    });
    return true;
}
