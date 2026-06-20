import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BaseLogger } from "pino";
import {
    analysisWorkStateTable,
    conversationTable,
    opinionTable,
    opinionGroupSpecTable,
    surveyResponseTable,
    voteTable,
} from "./schema.js";
import type { Valkey } from "./valkey.js";
import { VALKEY_QUEUE_KEYS } from "./valkeyQueues.js";
import { nowZeroMs } from "./util.js";

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
    valkey: Valkey | undefined;
    schedule: Pick<
        AnalysisSchedule,
        "conversationId" | "conversationSlugId"
    >;
    log: AnalysisSchedulerLogger;
}

interface EnqueueScheduledConversationForMathWorkParams {
    db: PostgresJsDatabase;
    valkey: Valkey | undefined;
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
}: ScheduleAnalysisUpdateParams): Promise<AnalysisSchedule> {
    return await db.transaction(async (tx) => {
        const now = nowZeroMs();

        const conversations = await tx
            .select({
                analysisDataGeneration:
                    conversationTable.analysisDataGeneration,
                conversationSlugId: conversationTable.slugId,
                conversationType: conversationTable.conversationType,
                currentContentId: conversationTable.currentContentId,
            })
            .from(conversationTable)
            .where(eq(conversationTable.id, conversationId))
            // FK checks from analysis workers take KEY SHARE on conversation.
            // NO KEY UPDATE still serializes schedulers without blocking them.
            .for("no key update");

        if (conversations.length === 0) {
            throw new Error(
                `Cannot schedule analysis update for missing conversation ${String(conversationId)}`,
            );
        }

        const conversation = conversations[0];
        log.info(
            `[AnalysisScheduler] Scheduling analysis start conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId}`,
        );

        let skipReason: string | null = null;
        if (conversation.currentContentId === null) {
            skipReason = "deleted";
        } else if (conversation.conversationType !== "polis") {
            skipReason = `type:${conversation.conversationType}`;
        }

        if (skipReason !== null) {
            log.info(
                `[AnalysisScheduler] Skipping analysis schedule conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} reason=${skipReason}`,
            );
            return {
                conversationId,
                conversationSlugId: conversation.conversationSlugId,
                dataGeneration: conversation.analysisDataGeneration,
                scheduledSpecCount: 0,
            };
        }

        const dataGeneration = conversation.analysisDataGeneration + 1;
        log.info(
            `[AnalysisScheduler] Incrementing analysis generation conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} from=${String(conversation.analysisDataGeneration)} to=${String(dataGeneration)}`,
        );
        await tx
            .update(conversationTable)
            .set({ analysisDataGeneration: dataGeneration })
            .where(eq(conversationTable.id, conversationId));

        log.info(
            `[AnalysisScheduler] Fetching current opinion-group specs conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId}`,
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
            `[AnalysisScheduler] Current opinion-group specs conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} count=${String(currentSpecIds.length)} ids=${currentSpecIds.join(",")}`,
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
            `[AnalysisScheduler] Ensuring analysis work-state rows conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} specs=${String(currentSpecIds.length)}`,
        );
        await tx
            .insert(analysisWorkStateTable)
            .values(
                currentSpecIds.map((opinionGroupSpecId) => ({
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

        log.info(
            `[AnalysisScheduler] Loading analysis work-state rows conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId}`,
        );
        const workStateRows = await tx
            .select({
                id: analysisWorkStateTable.id,
                dirtySince: analysisWorkStateTable.dirtySince,
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
            )
            .for("update");
        log.info(
            `[AnalysisScheduler] Updating analysis work-state rows conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} rows=${String(workStateRows.length)}`,
        );

        for (const row of workStateRows) {
            const dirtySince = row.dirtySince ?? now;

            await tx
                .update(analysisWorkStateTable)
                .set({
                    dirtySince,
                    updatedAt: now,
                })
                .where(eq(analysisWorkStateTable.id, row.id));
        }

        log.info(
            `[AnalysisScheduler] Scheduling analysis complete conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} generation=${String(dataGeneration)} rows=${String(workStateRows.length)}`,
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
}): Promise<
    Pick<
        AnalysisSchedule,
        "conversationId" | "conversationSlugId"
    >
> {
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
            `[AnalysisScheduler] Skipped queueing conversation for math work conversationId=${member} conversationSlugId=${schedule.conversationSlugId} queue=${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY}: valkey not configured`,
        );
        return;
    }
    const score = Date.now();
    log.info(
        `[AnalysisScheduler] Queueing conversation for math work conversationId=${member} conversationSlugId=${schedule.conversationSlugId} queue=${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY} score=${String(score)}`,
    );
    void (async () => {
        try {
            const result = await valkey.zadd(VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY, {
                [member]: score,
            });
            log.info(
                `[AnalysisScheduler] Queued conversation for math work conversationId=${member} conversationSlugId=${schedule.conversationSlugId} queue=${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY} result=${String(result)}`,
            );
        } catch (error: unknown) {
            log.error(
                error,
                `[AnalysisScheduler] Failed to queue conversation for math work conversationId=${member} conversationSlugId=${schedule.conversationSlugId} queue=${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY}`,
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
    if (valkey === undefined) {
        log.info(
            `[AnalysisScheduler] Skipped queueing scheduled math work conversationId=${String(conversationId)} conversationSlugId=${schedule.conversationSlugId}: valkey not configured`,
        );
        return;
    }

    enqueueConversationForMathWork({ valkey, schedule, log });
}
