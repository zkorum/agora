import {
    and,
    count,
    desc,
    eq,
    exists,
    inArray,
    isNotNull,
    isNull,
    sql,
    type SQLWrapper,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BaseLogger } from "pino";
import {
    analysisInputBaselineTable,
    analysisSnapshotTable,
    analysisWorkStateTable,
    conversationAnalysisCloseTable,
    conversationTable,
    conversationViewSnapshotTable,
    opinionTable,
    opinionGroupSpecTable,
    polisAnalysisCloseGenerationTable,
    polisAnalysisCloseTable,
    polisConversationConfigTable,
    realtimeEventOutboxTable,
    surveyResponseTable,
    voteTable,
} from "./schema.js";
import type { Valkey } from "./valkey.js";
import { VALKEY_QUEUE_KEYS } from "./valkeyQueues.js";
import { nowZeroMs } from "./util.js";
import type { LogContext } from "./logPrivacy.js";

export interface AnalysisSchedule {
    conversationId: number;
    conversationSlugId: string;
    dataGeneration: number;
    scheduledSpecCount: number;
}

interface AnalysisScheduleParams {
    db: PostgresJsDatabase;
    conversationId: number;
    log: AnalysisSchedulerLogger;
}

interface ScheduleAnalysisUpdateParams extends AnalysisScheduleParams {
    advanceGeneration?: boolean;
    moderationChanged?: boolean;
}

interface HasActiveVotesForMathWorkParams {
    db: PostgresJsDatabase;
    conversationId: number;
}

interface HasSurveyResponsesForMathWorkParams {
    db: PostgresJsDatabase;
    conversationId: number;
}

interface EnqueueConversationForMathWorkParams {
    valkey: Pick<Valkey, "zadd"> | undefined;
    schedule: Pick<AnalysisSchedule, "conversationId" | "conversationSlugId">;
    log: AnalysisSchedulerLogger;
}

interface EnqueueScheduledConversationForMathWorkParams {
    db: PostgresJsDatabase;
    valkey: Pick<Valkey, "zadd"> | undefined;
    conversationId: number;
    log: AnalysisSchedulerLogger;
}

type AnalysisSchedulerLogger = Pick<BaseLogger, "info" | "error">;

export async function hasActiveVotesForMathWork({
    db,
    conversationId,
}: HasActiveVotesForMathWorkParams): Promise<boolean> {
    const rows = await db
        .select({ voteId: voteTable.id })
        .from(voteTable)
        .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                isNotNull(opinionTable.currentContentId),
                isNotNull(voteTable.currentContentId),
            ),
        )
        .limit(1);

    return rows.length > 0;
}

export async function hasSurveyResponsesForMathWork({
    db,
    conversationId,
}: HasSurveyResponsesForMathWorkParams): Promise<boolean> {
    const rows = await db
        .select({ responseId: surveyResponseTable.id })
        .from(surveyResponseTable)
        .where(
            and(
                eq(surveyResponseTable.conversationId, conversationId),
                isNotNull(surveyResponseTable.completedAt),
                isNull(surveyResponseTable.withdrawnAt),
            ),
        )
        .limit(1);

    return rows.length > 0;
}

function getCurrentOpinionGroupSpecIds(
    specRows: {
        id: number;
        key: string;
    }[],
): number[] {
    const seenKeys = new Set<string>();
    const specIds: number[] = [];

    for (const row of specRows) {
        if (seenKeys.has(row.key)) {
            continue;
        }
        seenKeys.add(row.key);
        specIds.push(row.id);
    }

    return specIds;
}

export function hasSwitchablePolisCloseEvidence({
    db,
    closeId,
}: {
    db: PostgresJsDatabase;
    closeId: number | SQLWrapper;
}) {
    const native = polisAnalysisCloseTable;
    const view = conversationViewSnapshotTable;
    const snapshot = analysisSnapshotTable;
    const certificate = analysisInputBaselineTable;
    return exists(
        db
            .select({ id: native.closeId })
            .from(native)
            .innerJoin(view, eq(view.id, native.originalViewSnapshotId))
            .leftJoin(snapshot, eq(snapshot.id, view.analysisSnapshotId))
            .leftJoin(
                certificate,
                eq(certificate.inputSnapshotId, snapshot.inputSnapshotId),
            )
            .where(eq(native.closeId, closeId))
            .groupBy(native.closeId)
            .having(eq(count(certificate.inputSnapshotId), count())),
    );
}

/** Signal a selection change without asking readers to adopt a snapshot id. */
export async function queuePolisCloseSelectionChanged({
    db,
    closeId,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    closeId: number;
    conversationSlugId: string;
}): Promise<void> {
    const native = polisAnalysisCloseTable;
    const view = conversationViewSnapshotTable;
    const roots = await db
        .select({ viewId: view.id, snapshotId: view.analysisSnapshotId })
        .from(native)
        .innerJoin(view, eq(view.id, native.originalViewSnapshotId))
        .where(
            and(
                eq(native.closeId, closeId),
                isNotNull(view.analysisSnapshotId),
            ),
        )
        .limit(1);
    const root = roots.at(0);
    if (root?.snapshotId == null) return;
    await db.insert(realtimeEventOutboxTable).values({
        eventType: "conversation_analysis_updated",
        payload: {
            conversationSlugId,
            conversationViewSnapshotId: root.viewId,
            analysisSnapshotId: root.snapshotId,
            changeKind: "snapshot",
            checkpointChanged: false,
            displayableGroupCounts: [],
            closedSelectionChanged: true,
            timestamp: Date.now(),
        },
    });
}

export async function scheduleAnalysisUpdate({
    db,
    conversationId,
    log,
    advanceGeneration = true,
    moderationChanged = false,
}: ScheduleAnalysisUpdateParams): Promise<AnalysisSchedule> {
    return await db.transaction(async (tx) => {
        const now = nowZeroMs();

        const conversations = await tx
            .select({
                polisConfigId: conversationTable.polisConfigId,
                conversationSlugId: conversationTable.slugId,
                conversationType: conversationTable.conversationType,
                currentContentId: conversationTable.currentContentId,
                isClosed: conversationTable.isClosed,
                voteBufferDrained: conversationTable.voteBufferDrained,
                closedFinalizedAt: conversationTable.closedFinalizedAt,
                closeEpoch: conversationTable.voteBufferEpoch,
                closingTargetRevision: conversationTable.closingTargetRevision,
                deletedAt: conversationTable.deletedAt,
            })
            .from(conversationTable)
            .where(eq(conversationTable.id, conversationId))
            .for("no key update", { of: conversationTable });

        if (conversations.length === 0) {
            throw new Error(
                `Cannot schedule analysis update for missing conversation ${String(conversationId)}`,
            );
        }

        const conversation = conversations[0];
        const skipped = {
            conversationId,
            conversationSlugId: conversation.conversationSlugId,
            dataGeneration: 0,
            scheduledSpecCount: 0,
        };
        log.info(
            {
                event: "analysis_schedule",
                conversationId,
                conversationSlugId: conversation.conversationSlugId,
            } satisfies LogContext,
            "[AnalysisScheduler] Scheduling analysis start",
        );

        if (
            conversation.currentContentId === null ||
            conversation.deletedAt !== null ||
            conversation.conversationType !== "polis"
        ) {
            log.info(
                {
                    event: "analysis_schedule",
                    conversationId,
                } satisfies LogContext,
                "[AnalysisScheduler] Skipping deleted or non-Polis conversation",
            );
            return skipped;
        }
        // Read the config after acquiring the conversation lock, not in the
        // statement that might have waited for a concurrent scheduler.
        const config =
            conversation.polisConfigId === null
                ? undefined
                : (
                      await tx
                          .select({
                              id: polisConversationConfigTable.id,
                              analysisDataGeneration:
                                  polisConversationConfigTable.analysisDataGeneration,
                          })
                          .from(polisConversationConfigTable)
                          .where(
                              eq(
                                  polisConversationConfigTable.id,
                                  conversation.polisConfigId,
                              ),
                          )
                  ).at(0);
        if (config === undefined) {
            throw new Error(
                `Cannot schedule analysis update for polis conversation ${String(conversationId)} without polis config`,
            );
        }

        log.info(
            { event: "analysis_schedule", conversationId } satisfies LogContext,
            "[AnalysisScheduler] Fetching current opinion-group specs",
        );
        const currentSpecIds = getCurrentOpinionGroupSpecIds(
            await tx
                .select({
                    id: opinionGroupSpecTable.id,
                    key: opinionGroupSpecTable.key,
                })
                .from(opinionGroupSpecTable)
                .orderBy(
                    opinionGroupSpecTable.key,
                    desc(opinionGroupSpecTable.version),
                ),
        );
        log.info(
            {
                event: "analysis_schedule",
                conversationId,
                specCount: currentSpecIds.length,
            } satisfies LogContext,
            "[AnalysisScheduler] Loaded current opinion-group specs",
        );

        const closeTable = conversationAnalysisCloseTable;
        const currentClose =
            conversation.isClosed &&
            conversation.voteBufferDrained &&
            conversation.closedFinalizedAt !== null &&
            conversation.closingTargetRevision !== null
                ? (
                      await tx
                          .select({
                              id: closeTable.id,
                              selectedInputMode: closeTable.selectedInputMode,
                          })
                          .from(closeTable)
                          .where(
                              and(
                                  eq(closeTable.conversationId, conversationId),
                                  eq(
                                      closeTable.closeEpoch,
                                      conversation.closeEpoch,
                                  ),
                                  eq(
                                      closeTable.sourceRevision,
                                      conversation.closingTargetRevision,
                                  ),
                                  eq(
                                      closeTable.finalizedAt,
                                      conversation.closedFinalizedAt,
                                  ),
                              ),
                          )
                  ).at(0)
                : undefined;
        const closingSpecs =
            currentClose !== undefined && moderationChanged
                ? await tx
                      .select({
                          id: polisAnalysisCloseTable.opinionGroupSpecId,
                      })
                      .from(polisAnalysisCloseTable)
                      .where(
                          and(
                              eq(
                                  polisAnalysisCloseTable.closeId,
                                  currentClose.id,
                              ),
                              hasSwitchablePolisCloseEvidence({
                                  db: tx,
                                  closeId: currentClose.id,
                              }),
                          ),
                      )
                : [];
        // Reserve a distinct capture revision for retained inputs. The ordinary
        // revision stays in the config and can advance without cancelling Closing.
        const closingRevision =
            closingSpecs.length > 0
                ? config.analysisDataGeneration + 1
                : undefined;
        const dataGeneration =
            closingRevision !== undefined
                ? closingRevision + 1
                : advanceGeneration || config.analysisDataGeneration === 0
                  ? config.analysisDataGeneration + 1
                  : config.analysisDataGeneration;
        await tx
            .update(polisConversationConfigTable)
            .set({ analysisDataGeneration: dataGeneration })
            .where(eq(polisConversationConfigTable.id, config.id));
        if (currentClose !== undefined) {
            if (closingRevision !== undefined) {
                await tx.insert(polisAnalysisCloseGenerationTable).values({
                    conversationId,
                    dataGeneration: closingRevision,
                    closeId: currentClose.id,
                });
            }
            const requestedResultRevision =
                currentClose.selectedInputMode === "live"
                    ? dataGeneration
                    : closingRevision;
            if (
                closingRevision !== undefined ||
                requestedResultRevision !== undefined
            ) {
                const changed =
                    requestedResultRevision !== undefined &&
                    dataGeneration !== config.analysisDataGeneration;
                await tx
                    .update(closeTable)
                    .set({
                        minimumClosingResultRevision: closingRevision,
                        requestedResultRevision,
                        selectionRevision: changed
                            ? sql`${closeTable.selectionRevision} + 1`
                            : undefined,
                    })
                    .where(eq(closeTable.id, currentClose.id));
                if (changed)
                    await queuePolisCloseSelectionChanged({
                        db: tx,
                        closeId: currentClose.id,
                        conversationSlugId: conversation.conversationSlugId,
                    });
            }
        } else if (
            conversation.isClosed &&
            conversation.closedFinalizedAt === null
        ) {
            await tx
                .update(conversationTable)
                .set({ closingTargetRevision: dataGeneration })
                .where(eq(conversationTable.id, conversationId));
        }
        log.info(
            {
                event: "analysis_schedule",
                conversationId,
                dataGeneration,
            } satisfies LogContext,
            "[AnalysisScheduler] Incrementing analysis generation",
        );

        const requestedSpecs = [
            ...currentSpecIds.map((id) => ({ id, usesClosingInputs: false })),
            ...closingSpecs.map(({ id }) => ({ id, usesClosingInputs: true })),
        ];
        if (requestedSpecs.length === 0) {
            return {
                conversationId,
                conversationSlugId: conversation.conversationSlugId,
                dataGeneration,
                scheduledSpecCount: 0,
            };
        }

        log.info(
            {
                event: "analysis_schedule",
                conversationId,
                specCount: currentSpecIds.length,
            } satisfies LogContext,
            "[AnalysisScheduler] Ensuring analysis work-state rows",
        );
        const existingWorkStates = await tx
            .select({
                opinionGroupSpecId: analysisWorkStateTable.opinionGroupSpecId,
                usesClosingInputs: analysisWorkStateTable.usesClosingInputs,
            })
            .from(analysisWorkStateTable)
            .where(
                and(
                    eq(analysisWorkStateTable.conversationId, conversationId),
                    inArray(
                        analysisWorkStateTable.opinionGroupSpecId,
                        requestedSpecs.map(({ id }) => id),
                    ),
                ),
            );
        const missingSpecs = requestedSpecs.filter(
            (spec) =>
                !existingWorkStates.some(
                    (work) =>
                        work.opinionGroupSpecId === spec.id &&
                        work.usesClosingInputs === spec.usesClosingInputs,
                ),
        );
        // The generation is the durable dirty signal. Existing work rows belong
        // to the worker; updating them here would wait behind result persistence.
        if (missingSpecs.length > 0) {
            await tx
                .insert(analysisWorkStateTable)
                .values(
                    missingSpecs.map(({ id, usesClosingInputs }) => ({
                        conversationId,
                        opinionGroupSpecId: id,
                        usesClosingInputs,
                        dirtySince: now,
                        updatedAt: now,
                    })),
                )
                .onConflictDoNothing({
                    target: [
                        analysisWorkStateTable.conversationId,
                        analysisWorkStateTable.opinionGroupSpecId,
                        analysisWorkStateTable.usesClosingInputs,
                    ],
                });
        }

        log.info(
            {
                event: "analysis_schedule",
                conversationId,
                dataGeneration,
                count: requestedSpecs.length,
            } satisfies LogContext,
            "[AnalysisScheduler] Scheduling analysis complete",
        );
        return {
            conversationId,
            conversationSlugId: conversation.conversationSlugId,
            dataGeneration,
            scheduledSpecCount: requestedSpecs.length,
        };
    });
}

export async function getAnalysisQueueConversation({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<Pick<AnalysisSchedule, "conversationId" | "conversationSlugId">> {
    const rows = await db
        .select({ conversationSlugId: conversationTable.slugId })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    if (rows.length === 0) {
        throw new Error(
            `Cannot enqueue math work for missing conversation ${String(conversationId)}`,
        );
    }

    return {
        conversationId,
        conversationSlugId: rows[0].conversationSlugId,
    };
}

export function enqueueConversationForMathWork({
    valkey,
    schedule,
    log,
}: EnqueueConversationForMathWorkParams): void {
    const member = String(schedule.conversationId);
    if (valkey === undefined) {
        log.info(
            {
                event: "math_queue",
                conversationId: schedule.conversationId,
                valkeyAvailable: false,
            } satisfies LogContext,
            "[AnalysisScheduler] Skipped math queueing because Valkey is unavailable",
        );
        return;
    }
    const score = Date.now();
    log.info(
        {
            event: "math_queue",
            conversationId: schedule.conversationId,
            conversationSlugId: schedule.conversationSlugId,
        } satisfies LogContext,
        "[AnalysisScheduler] Queueing conversation for math work",
    );
    void (async () => {
        try {
            const result = await valkey.zadd(VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY, {
                [member]: score,
            });
            log.info(
                {
                    event: "math_queue",
                    conversationId: schedule.conversationId,
                    count: result,
                } satisfies LogContext,
                "[AnalysisScheduler] Queued conversation for math work",
            );
        } catch (error: unknown) {
            log.error(
                {
                    event: "math_queue",
                    conversationId: schedule.conversationId,
                    err: error,
                } satisfies LogContext & { err: unknown },
                "[AnalysisScheduler] Failed to queue conversation for math work",
            );
        }
    })();
}

export async function enqueueScheduledConversationForMathWork({
    db,
    valkey,
    conversationId,
    log,
}: EnqueueScheduledConversationForMathWorkParams): Promise<void> {
    const schedule = await getAnalysisQueueConversation({ db, conversationId });
    enqueueConversationForMathWork({ valkey, schedule, log });
}
