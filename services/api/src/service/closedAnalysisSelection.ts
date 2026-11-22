import { httpErrors } from "@fastify/sensible";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    hasSwitchablePolisCloseEvidence,
    queuePolisCloseSelectionChanged,
} from "@/shared-backend/analysisScheduler.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationAnalysisCloseTable,
    comparisonAnalysisCloseTable,
    conversationTable,
    polisAnalysisCloseGenerationTable,
    polisConversationConfigTable,
    qvCalculationStateTable,
    qvCalculationTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
} from "@/shared-backend/schema.js";
import type {
    SetClosedAnalysisInputModeRequest,
    SetClosedAnalysisInputModeResponse,
} from "@/shared/types/dto.js";
import {
    currentAnalysisCloseCondition,
    readableAnalysisConversationCondition,
} from "./closedAnalysisQueries.js";
import { publishedPolisLiveView } from "./opinionGroupAnalysis.js";
import { requireConversationCapabilityBySlug } from "./organizationAuthorization.js";
import { queueQvCalculationUpdated } from "./qvLifecycle.js";
import { queueComparisonSelectionChanged } from "./comparisonCloseSelection.js";

export async function setClosedAnalysisInputMode({
    db,
    request,
    userId,
}: {
    db: PostgresJsDatabase;
    request: SetClosedAnalysisInputModeRequest;
    userId: string;
}): Promise<SetClosedAnalysisInputModeResponse> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const { conversationSlugId, closeId, inputMode } = request;
        const closeTable = conversationAnalysisCloseTable;
        const conversation = conversationTable;
        const authorize = async () => {
            await requireConversationCapabilityBySlug({
                db: tx,
                userId,
                conversationSlugId,
                capability: "conversation_edit",
            });
        };
        // Denied callers should not contend on the conversation lock.
        await authorize();
        await tx
            .select({ id: conversation.id })
            .from(conversation)
            .where(
                and(
                    eq(conversation.slugId, conversationSlugId),
                    isNull(conversation.deletedAt),
                ),
            )
            .for("no key update");
        const currentRows = await tx
            .select({
                close: closeTable,
                method: conversation.prioritizationType,
                liveRevision:
                    polisConversationConfigTable.analysisDataGeneration,
            })
            .from(conversation)
            .innerJoin(closeTable, currentAnalysisCloseCondition())
            .leftJoin(
                polisConversationConfigTable,
                eq(polisConversationConfigTable.id, conversation.polisConfigId),
            )
            .where(
                and(
                    eq(conversation.slugId, conversationSlugId),
                    eq(closeTable.id, closeId),
                    readableAnalysisConversationCondition(tx),
                ),
            );
        // Ownership or access may have changed while awaiting the lock.
        await authorize();
        const current = currentRows.at(0);
        if (current === undefined)
            throw httpErrors.conflict(
                "The analysis close is no longer current or switchable",
            );
        const close = current.close;
        if (close.selectedInputMode === inputMode) {
            return {
                closeId,
                selectionRevision: close.selectionRevision,
            };
        }
        if (close.selectionRevision !== request.selectionRevision) {
            throw httpErrors.conflict("The analysis selection changed");
        }
        const selectionRevision = close.selectionRevision + 1;
        const persistSelection = async ({
            requestedResultRevision,
            ready,
        }: {
            requestedResultRevision: number | null;
            ready: boolean;
        }) => {
            await tx
                .update(closeTable)
                .set({
                    selectedInputMode: inputMode,
                    requestedResultRevision,
                    ...(ready && {
                        servedInputMode: inputMode,
                        servedResultRevision: requestedResultRevision,
                    }),
                    selectionRevision,
                })
                .where(eq(closeTable.id, closeId));
        };
        if (current.method === "qv") {
            const calculation = qvCalculationTable;
            const liveRows = await tx
                .select({
                    generation: calculation.generation,
                    status: calculation.status,
                })
                .from(qvCalculationStateTable)
                .innerJoin(
                    calculation,
                    and(
                        eq(
                            calculation.conversationId,
                            qvCalculationStateTable.conversationId,
                        ),
                        eq(
                            calculation.generation,
                            qvCalculationStateTable.generation,
                        ),
                    ),
                )
                .where(
                    eq(
                        qvCalculationStateTable.conversationId,
                        close.conversationId,
                    ),
                );
            const live = liveRows.at(0);
            if (live === undefined)
                throw httpErrors.conflict("No calculation for this close");
            const requestedResultRevision =
                inputMode === "live" ? live.generation : null;
            const ready = inputMode === "closing" || live.status === "ready";
            await persistSelection({ requestedResultRevision, ready });
            await queueQvCalculationUpdated({
                db: tx,
                payload: {
                    conversationSlugId,
                    generation: live.generation,
                    status:
                        live.status === "ready" || live.status === "failed"
                            ? live.status
                            : "calculating",
                    closeId,
                    closedSelectionChanged: true,
                },
            });
            return { closeId, selectionRevision };
        }
        if (current.method === "comparisons") {
            const ranking = rankingConversationConfigTable;
            const snapshot = rankingConversationStatsSnapshotTable;
            const native = comparisonAnalysisCloseTable;
            const bindings = await tx
                .select({
                    closingStatsSnapshotId: native.closingStatsSnapshotId,
                    processedClosingRevision: native.processedClosingRevision,
                    liveStatsSnapshotId: native.liveStatsSnapshotId,
                    servedStatsSnapshotId: native.servedStatsSnapshotId,
                    liveRevision: ranking.scoringInputRevision,
                    processedRevision: ranking.processedScoringInputRevision,
                })
                .from(native)
                .innerJoin(
                    conversation,
                    eq(conversation.id, native.conversationId),
                )
                .innerJoin(
                    ranking,
                    eq(ranking.id, conversation.rankingConfigId),
                )
                .where(eq(native.closeId, closeId));
            const binding = bindings.at(0);
            if (binding === undefined)
                throw httpErrors.conflict(
                    "No retained comparison result for this close",
                );

            const requestedResultRevision =
                inputMode === "live"
                    ? binding.liveRevision
                    : close.minimumClosingResultRevision || null;
            const ready =
                inputMode === "closing"
                    ? binding.processedClosingRevision ===
                      close.minimumClosingResultRevision
                    : binding.processedRevision === binding.liveRevision;
            await persistSelection({ requestedResultRevision, ready });
            const servedId = !ready
                ? binding.servedStatsSnapshotId
                : inputMode === "live"
                  ? binding.liveStatsSnapshotId
                  : binding.closingStatsSnapshotId;
            if (servedId !== binding.servedStatsSnapshotId) {
                await tx
                    .update(native)
                    .set({ servedStatsSnapshotId: servedId })
                    .where(eq(native.closeId, closeId));
            }
            const servedRows = await tx
                .select()
                .from(snapshot)
                .where(
                    and(
                        eq(snapshot.conversationId, close.conversationId),
                        isNull(snapshot.deletedAt),
                        eq(snapshot.id, servedId),
                    ),
                );
            const served = servedRows.at(0);
            if (served === undefined)
                throw httpErrors.conflict("Comparison result unavailable");
            await queueComparisonSelectionChanged({
                db: tx,
                conversationSlugId,
                snapshot: served,
                version: { closeId, selectionRevision },
            });
            return { closeId, selectionRevision };
        }
        if (current.liveRevision === null)
            throw httpErrors.conflict(
                "This close does not support input selection",
            );

        const sources = await tx
            .select({ id: closeTable.id })
            .from(closeTable)
            .where(
                and(
                    eq(closeTable.id, closeId),
                    hasSwitchablePolisCloseEvidence({ db: tx, closeId }),
                ),
            );
        if (sources.length === 0) {
            throw httpErrors.conflict(
                "This close has no complete retained analysis evidence",
            );
        }
        const requestedResultRevision =
            inputMode === "live"
                ? current.liveRevision
                : close.minimumClosingResultRevision || null;
        const generation = polisAnalysisCloseGenerationTable;
        const ready =
            inputMode === "live"
                ? (
                      await publishedPolisLiveView({
                          db: tx,
                          conversationId: close.conversationId,
                          revision: current.liveRevision,
                      })
                  ).length > 0
                : requestedResultRevision === null ||
                  (
                      await tx
                          .select({ revision: generation.dataGeneration })
                          .from(generation)
                          .where(
                              and(
                                  eq(
                                      generation.conversationId,
                                      close.conversationId,
                                  ),
                                  eq(
                                      generation.dataGeneration,
                                      requestedResultRevision,
                                  ),
                                  eq(generation.closeId, closeId),
                                  isNotNull(generation.publishedAt),
                              ),
                          )
                  ).length > 0;
        await persistSelection({ requestedResultRevision, ready });
        await queuePolisCloseSelectionChanged({
            db: tx,
            closeId,
            conversationSlugId,
        });
        return { closeId, selectionRevision };
    });
}
