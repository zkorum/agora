/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BaseLogger } from "pino";
import {
    analysisWorkStateTable,
    conversationTable,
    opinionTable,
    opinionGroupSpecTable,
    polisConversationConfigTable,
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

interface ScheduleAnalysisUpdateParams {
    db: PostgresJsDatabase;
    conversationId: number;
    log: AnalysisSchedulerLogger;
    advanceGeneration?: boolean;
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

export async function scheduleAnalysisUpdate({
    db,
    conversationId,
    log,
    advanceGeneration = true,
}: ScheduleAnalysisUpdateParams): Promise<AnalysisSchedule> {
    return await db.transaction(async (tx) => {
        const now = nowZeroMs();

        const conversations = await tx
            .select({
                analysisDataGeneration:
                    polisConversationConfigTable.analysisDataGeneration,
                polisConfigId: conversationTable.polisConfigId,
                conversationSlugId: conversationTable.slugId,
                conversationType: conversationTable.conversationType,
                currentContentId: conversationTable.currentContentId,
                isClosed: conversationTable.isClosed,
                closedFinalizedAt: conversationTable.closedFinalizedAt,
            })
            .from(conversationTable)
            .leftJoin(
                polisConversationConfigTable,
                eq(
                    polisConversationConfigTable.id,
                    conversationTable.polisConfigId,
                ),
            )
            .where(eq(conversationTable.id, conversationId))
            .for("no key update", { of: conversationTable });

        if (conversations.length === 0) {
            throw new Error(
                `Cannot schedule analysis update for missing conversation ${String(conversationId)}`,
            );
        }

        const conversation = conversations[0];
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
            (conversation.isClosed &&
                conversation.closedFinalizedAt !== null) ||
            conversation.conversationType !== "polis"
        ) {
            log.info(
                {
                    event: "analysis_schedule",
                    conversationId,
                } satisfies LogContext,
                "[AnalysisScheduler] Skipping deleted or non-Polis conversation",
            );
            return {
                conversationId,
                conversationSlugId: conversation.conversationSlugId,
                dataGeneration: conversation.analysisDataGeneration ?? 0,
                scheduledSpecCount: 0,
            };
        }

        if (
            conversation.polisConfigId === null ||
            conversation.analysisDataGeneration === null
        ) {
            throw new Error(
                `Cannot schedule analysis update for polis conversation ${String(conversationId)} without polis config`,
            );
        }

        const updatedConfigs = await tx
            .update(polisConversationConfigTable)
            .set({
                analysisDataGeneration:
                    advanceGeneration ||
                    conversation.analysisDataGeneration === 0
                        ? sql`${polisConversationConfigTable.analysisDataGeneration} + 1`
                        : conversation.analysisDataGeneration,
            })
            .where(
                eq(polisConversationConfigTable.id, conversation.polisConfigId),
            )
            .returning({
                dataGeneration:
                    polisConversationConfigTable.analysisDataGeneration,
            });
        const updatedConfig = updatedConfigs.at(0);
        if (updatedConfig === undefined) {
            throw new Error(
                "Analysis configuration disappeared while scheduling",
            );
        }
        const { dataGeneration } = updatedConfig;
        if (conversation.isClosed) {
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

        log.info(
            { event: "analysis_schedule", conversationId } satisfies LogContext,
            "[AnalysisScheduler] Fetching current opinion-group specs",
        );
        const specRows = await tx
            .select({
                id: opinionGroupSpecTable.id,
                key: opinionGroupSpecTable.key,
            })
            .from(opinionGroupSpecTable)
            .orderBy(
                opinionGroupSpecTable.key,
                desc(opinionGroupSpecTable.version),
            );
        const currentSpecIds = getCurrentOpinionGroupSpecIds(specRows);
        log.info(
            {
                event: "analysis_schedule",
                conversationId,
                specCount: currentSpecIds.length,
            } satisfies LogContext,
            "[AnalysisScheduler] Loaded current opinion-group specs",
        );

        if (currentSpecIds.length === 0) {
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
            })
            .from(analysisWorkStateTable)
            .where(
                and(
                    eq(analysisWorkStateTable.conversationId, conversationId),
                    inArray(
                        analysisWorkStateTable.opinionGroupSpecId,
                        currentSpecIds,
                    ),
                ),
            );
        const existingSpecIds = new Set(
            existingWorkStates.map((row) => row.opinionGroupSpecId),
        );
        const missingSpecIds = currentSpecIds.filter(
            (id) => !existingSpecIds.has(id),
        );
        // The generation is the durable dirty signal. Existing work rows belong
        // to the worker; updating them here would wait behind result persistence.
        if (missingSpecIds.length > 0) {
            await tx
                .insert(analysisWorkStateTable)
                .values(
                    missingSpecIds.map((opinionGroupSpecId) => ({
                        conversationId,
                        opinionGroupSpecId,
                        dirtySince: now,
                        updatedAt: now,
                    })),
                )
                .onConflictDoNothing({
                    target: [
                        analysisWorkStateTable.conversationId,
                        analysisWorkStateTable.opinionGroupSpecId,
                    ],
                });
        }

        log.info(
            {
                event: "analysis_schedule",
                conversationId,
                dataGeneration,
                count: currentSpecIds.length,
            } satisfies LogContext,
            "[AnalysisScheduler] Scheduling analysis complete",
        );
        return {
            conversationId,
            conversationSlugId: conversation.conversationSlugId,
            dataGeneration,
            scheduledSpecCount: currentSpecIds.length,
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
