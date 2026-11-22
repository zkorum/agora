import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    analysisSnapshotTable,
    analysisSnapshotResultTable,
    analysisInputBaselineTable,
    analysisInputSnapshotTable,
    comparisonAnalysisCloseTable,
    conversationAnalysisCloseTable,
    conversationTable,
    conversationViewSnapshotTable,
    conversationViewSnapshotCheckpointReasonTable,
    opinionGroupSpecTable,
    polisAnalysisCloseTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
    rankingConversationStatsItemTable,
    rankingConversationStatsCheckpointTable,
    realtimeEventOutboxTable,
} from "@/shared-backend/schema.js";
import { resolveRetainedComparisonBaseline } from "@/shared-backend/comparisonRetention.js";
import { queueConversationAnalysisUpdatedEventsForViewSnapshots } from "./realtimeEventOutbox.js";

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
            configId: polisConversationConfigTable.id,
            closeEpoch: conversationTable.voteBufferEpoch,
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
                isNotNull(conversationTable.currentContentId),
                isNull(conversationTable.deletedAt),
                eq(conversationTable.isImporting, false),
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
    const completeInput = alias(
        analysisInputSnapshotTable,
        "closing_complete_input",
    );
    const views = await db
        .selectDistinctOn([conversationViewSnapshotTable.opinionGroupSpecId], {
            specId: conversationViewSnapshotTable.opinionGroupSpecId,
            generation: analysisSnapshotTable.dataGeneration,
            analysisSnapshotId: analysisSnapshotTable.id,
            surveyAggregateSnapshotId:
                conversationViewSnapshotTable.surveyAggregateSnapshotId,
            conversationContentId:
                conversationViewSnapshotTable.conversationContentId,
            preferredOpinionGroupCount:
                conversationViewSnapshotTable.preferredOpinionGroupCount,
            baselineId: analysisInputBaselineTable.baselineInputSnapshotId,
            effectiveOpinionCount: analysisInputSnapshotTable.opinionCount,
            effectiveVoteCount: analysisInputSnapshotTable.voteCount,
            effectiveParticipantCount:
                analysisInputSnapshotTable.participantCount,
            completeOpinionCount: completeInput.opinionCount,
            sourceVoteCount: analysisInputBaselineTable.sourceVoteCount,
            sourceParticipantCount:
                analysisInputBaselineTable.sourceParticipantCount,
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
        .innerJoin(
            analysisSnapshotTable,
            and(
                eq(
                    analysisSnapshotTable.id,
                    conversationViewSnapshotTable.analysisSnapshotId,
                ),
                eq(analysisSnapshotTable.conversationId, conversationId),
            ),
        )
        .innerJoin(
            analysisSnapshotResultTable,
            and(
                eq(
                    analysisSnapshotResultTable.analysisSnapshotId,
                    analysisSnapshotTable.id,
                ),
                eq(analysisSnapshotResultTable.conversationId, conversationId),
                eq(
                    analysisSnapshotResultTable.opinionGroupSpecId,
                    conversationViewSnapshotTable.opinionGroupSpecId,
                ),
            ),
        )
        .leftJoin(
            analysisInputSnapshotTable,
            eq(
                analysisInputSnapshotTable.id,
                analysisSnapshotTable.inputSnapshotId,
            ),
        )
        .leftJoin(
            analysisInputBaselineTable,
            and(
                eq(
                    analysisInputBaselineTable.inputSnapshotId,
                    analysisSnapshotTable.inputSnapshotId,
                ),
                eq(analysisInputBaselineTable.conversationId, conversationId),
            ),
        )
        .leftJoin(
            completeInput,
            eq(
                completeInput.id,
                analysisInputBaselineTable.baselineInputSnapshotId,
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
    if (
        views.some(
            (view) =>
                view.baselineId === null ||
                view.effectiveOpinionCount !== view.opinionCount ||
                view.effectiveVoteCount !== view.voteCount ||
                view.effectiveParticipantCount !== view.participantCount ||
                view.completeOpinionCount !== view.totalOpinionCount ||
                view.sourceVoteCount !== view.totalVoteCount ||
                view.sourceParticipantCount !== view.totalParticipantCount ||
                // Open results don't retain choice inputs. Capture them with
                // the original closed result in the native worker.
                view.surveyAggregateSnapshotId !== null,
        )
    ) {
        // Old effective-only or voted-only catalogues may already mark this generation completed.
        // Request fresh initial-closing evidence, not a live-data reconstruction of
        // an already-finalized result. A retry sees the new generation and no-ops.
        const refreshed = await db
            .update(polisConversationConfigTable)
            .set({
                analysisDataGeneration: sql`${polisConversationConfigTable.analysisDataGeneration} + 1`,
            })
            .where(eq(polisConversationConfigTable.id, state.configId))
            .returning({
                generation: polisConversationConfigTable.analysisDataGeneration,
            });
        const next = refreshed.at(0);
        if (next !== undefined)
            await db
                .update(conversationTable)
                .set({ closingTargetRevision: next.generation })
                .where(eq(conversationTable.id, conversationId));
        return false;
    }
    const finalizedAt = new Date();
    // Reuse one complete result graph, including its counts and survey provenance.
    // Closing must not mix an accepted analysis with a fresh live counter query.
    const checkpoints = await db
        .insert(conversationViewSnapshotTable)
        .values(
            views.map(
                (view) =>
                    ({
                        conversationId,
                        opinionGroupSpecId: view.specId,
                        analysisSnapshotId: view.analysisSnapshotId,
                        surveyAggregateSnapshotId:
                            view.surveyAggregateSnapshotId,
                        conversationContentId: view.conversationContentId,
                        preferredOpinionGroupCount:
                            view.preferredOpinionGroupCount,
                        viewReason: "conversation_lifecycle_updated",
                        isClosed: true,
                        opinionCount: view.opinionCount,
                        voteCount: view.voteCount,
                        participantCount: view.participantCount,
                        totalOpinionCount: view.totalOpinionCount,
                        totalVoteCount: view.totalVoteCount,
                        totalParticipantCount: view.totalParticipantCount,
                        moderatedOpinionCount: view.moderatedOpinionCount,
                        hiddenOpinionCount: view.hiddenOpinionCount,
                        activatedAt: finalizedAt,
                    }) satisfies typeof conversationViewSnapshotTable.$inferInsert,
            ),
        )
        .returning({
            id: conversationViewSnapshotTable.id,
            specId: conversationViewSnapshotTable.opinionGroupSpecId,
        });
    await db.insert(conversationViewSnapshotCheckpointReasonTable).values(
        checkpoints.map(
            (checkpoint) =>
                ({
                    conversationViewSnapshotId: checkpoint.id,
                    conversationId,
                    opinionGroupSpecId: checkpoint.specId,
                    reason: "conversation_closed",
                }) satisfies typeof conversationViewSnapshotCheckpointReasonTable.$inferInsert,
        ),
    );
    await db
        .update(conversationTable)
        .set({
            closingTargetRevision: state.generation,
            closedFinalizedAt: finalizedAt,
        })
        .where(eq(conversationTable.id, conversationId));
    const close = (
        await db
            .insert(conversationAnalysisCloseTable)
            .values({
                conversationId,
                closeEpoch: state.closeEpoch,
                sourceRevision: state.generation,
                finalizedAt,
            })
            .returning({ id: conversationAnalysisCloseTable.id })
    ).at(0);
    if (close === undefined)
        throw new Error("Closing record was not persisted");
    await db.insert(polisAnalysisCloseTable).values(
        checkpoints.map((checkpoint) => ({
            closeId: close.id,
            conversationId,
            opinionGroupSpecId: checkpoint.specId,
            originalViewSnapshotId: checkpoint.id,
        })),
    );
    await queueConversationAnalysisUpdatedEventsForViewSnapshots({
        db,
        conversationViewSnapshotIds: checkpoints.map(
            (checkpoint) => checkpoint.id,
        ),
    });
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
            comparisonMethod: rankingConversationConfigTable.rankingMode,
            closeEpoch: conversationTable.voteBufferEpoch,
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
                isNotNull(conversationTable.currentContentId),
                isNull(conversationTable.deletedAt),
                eq(conversationTable.isImporting, false),
                eq(conversationTable.prioritizationType, "comparisons"),
                eq(conversationTable.voteBufferDrained, true),
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
                isNull(rankingConversationStatsSnapshotTable.derivedFromCloseId),
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
    // Closing must retain both exact result evidence and a complete restoration
    // baseline. A legacy effective-only capture cannot certify the closing fast path.
    const input = await resolveRetainedComparisonBaseline({
        db,
        conversationId,
        statsSnapshotId: previous.id,
    });
    if (
        input.status !== "available" ||
        input.comparisonMethod !== state.comparisonMethod ||
        input.participantCount !== previous.participantCount ||
        input.itemCount !== previous.itemCount ||
        input.answerCount !== previous.voteCount
    )
        return false;
    const snapshotRows = await db
        .insert(rankingConversationStatsSnapshotTable)
        .values({
            conversationId,
            rankingScoreId: previous.rankingScoreId,
            reusedInputSnapshotId: input.inputSnapshotId,
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
                excludedByModeration: item.excludedByModeration,
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
    const finalizedAt = new Date();
    await db
        .update(conversationTable)
        .set({ closedFinalizedAt: finalizedAt })
        .where(eq(conversationTable.id, conversationId));
    const [close] = await db
        .insert(conversationAnalysisCloseTable)
        .values({
            conversationId,
            closeEpoch: state.closeEpoch,
            sourceRevision: state.revision,
            finalizedAt,
        })
        .returning({ id: conversationAnalysisCloseTable.id });
    await db.insert(comparisonAnalysisCloseTable).values({
        closeId: close.id,
        conversationId,
        originalStatsSnapshotId: snapshot.id,
        closingStatsSnapshotId: snapshot.id,
        liveStatsSnapshotId: snapshot.id,
        servedStatsSnapshotId: snapshot.id,
    });
    await db.insert(realtimeEventOutboxTable).values({
        eventType: "conversation_ranking_stats_updated",
        payload: {
            conversationSlugId: state.slugId,
            rankingStatsSnapshotId: snapshot.id,
            checkpointChanged: true,
            comparisonCloseSelectionVersion: {
                closeId: close.id,
                selectionRevision: 0,
            },
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
