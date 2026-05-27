import { and, desc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BaseLogger } from "pino";
import {
    analysisWorkStateTable,
    conversationTable,
    opinionGroupSpecTable,
} from "./schema.js";
import type { Valkey } from "./valkey.js";
import { VALKEY_QUEUE_KEYS } from "./valkeyQueues.js";
import { nowZeroMs } from "./util.js";

export interface AnalysisSchedule {
    conversationId: number;
    conversationSlugId: string;
    dataGeneration: number;
    nextRunAt: Date | null;
    scheduledSpecCount: number;
}

interface ScheduleAnalysisUpdateParams {
    db: PostgresJsDatabase;
    conversationId: number;
    log: AnalysisSchedulerLogger;
}

interface WakeAnalysisWorkerParams {
    valkey: Valkey | undefined;
    schedule: Pick<
        AnalysisSchedule,
        "conversationId" | "conversationSlugId" | "nextRunAt"
    >;
    log: AnalysisSchedulerLogger;
}

interface WakeScheduledAnalysisForConversationParams {
    db: PostgresJsDatabase;
    valkey: Valkey | undefined;
    conversationId: number;
    log: AnalysisSchedulerLogger;
}

type AnalysisSchedulerLogger = Pick<BaseLogger, "info" | "error">;

function formatScheduleTime(nextRunAt: Date | null): string {
    return nextRunAt?.toISOString() ?? "none";
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

function getEarliestDate(dates: (Date | null)[]): Date | null {
    let earliest: Date | null = null;

    for (const date of dates) {
        if (date === null) {
            continue;
        }
        if (earliest === null || date < earliest) {
            earliest = date;
        }
    }

    return earliest;
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
            .for("update");

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
                nextRunAt: null,
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
                nextRunAt: null,
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
                    nextRunAt: now,
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
                nextRunAt: analysisWorkStateTable.nextRunAt,
                runningDataGeneration:
                    analysisWorkStateTable.runningDataGeneration,
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
        const nextRunAtValues: (Date | null)[] = [];
        log.info(
            `[AnalysisScheduler] Updating analysis work-state rows conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} rows=${String(workStateRows.length)}`,
        );

        for (const row of workStateRows) {
            const dirtySince = row.dirtySince ?? now;
            const nextRunAt =
                row.runningDataGeneration === null ? now : row.nextRunAt;
            nextRunAtValues.push(nextRunAt);

            await tx
                .update(analysisWorkStateTable)
                .set({
                    dirtySince,
                    nextRunAt,
                    updatedAt: now,
                })
                .where(eq(analysisWorkStateTable.id, row.id));
        }

        const nextRunAt = getEarliestDate(nextRunAtValues);
        log.info(
            `[AnalysisScheduler] Scheduling analysis complete conversationId=${String(conversationId)} conversationSlugId=${conversation.conversationSlugId} generation=${String(dataGeneration)} rows=${String(workStateRows.length)} nextRunAt=${formatScheduleTime(nextRunAt)}`,
        );
        return {
            conversationId,
            conversationSlugId: conversation.conversationSlugId,
            dataGeneration,
            nextRunAt,
            scheduledSpecCount: currentSpecIds.length,
        };
    });
}

export async function getAnalysisWakeSchedule({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<
    Pick<
        AnalysisSchedule,
        "conversationId" | "conversationSlugId" | "nextRunAt"
    >
> {
    const rows = await db
        .select({
            conversationSlugId: conversationTable.slugId,
            nextRunAt: analysisWorkStateTable.nextRunAt,
        })
        .from(conversationTable)
        .leftJoin(
            analysisWorkStateTable,
            eq(analysisWorkStateTable.conversationId, conversationTable.id),
        )
        .where(eq(conversationTable.id, conversationId))
        .orderBy(analysisWorkStateTable.nextRunAt);

    if (rows.length === 0) {
        throw new Error(
            `Cannot wake analysis update for missing conversation ${String(conversationId)}`,
        );
    }

    return {
        conversationId,
        conversationSlugId: rows[0].conversationSlugId,
        nextRunAt: getEarliestDate(rows.map((row) => row.nextRunAt)),
    };
}

export function wakeAnalysisWorker({
    valkey,
    schedule,
    log,
}: WakeAnalysisWorkerParams): void {
    const member = String(schedule.conversationId);
    if (valkey === undefined) {
        log.info(
            `[AnalysisScheduler] Skipped Valkey ZADD ${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY} for conversationId=${member} conversationSlugId=${schedule.conversationSlugId}: valkey not configured`,
        );
        return;
    }
    if (schedule.nextRunAt === null) {
        log.info(
            `[AnalysisScheduler] Skipped Valkey ZADD ${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY} for conversationId=${member} conversationSlugId=${schedule.conversationSlugId}: nextRunAt is null`,
        );
        return;
    }

    const score = schedule.nextRunAt.getTime();
    log.info(
        `[AnalysisScheduler] ZADD ${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY} conversationId=${member} conversationSlugId=${schedule.conversationSlugId} score=${String(score)} nextRunAt=${formatScheduleTime(schedule.nextRunAt)}`,
    );
    void (async () => {
        try {
            const result = await valkey.zadd(VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY, {
                [member]: score,
            });
            log.info(
                `[AnalysisScheduler] ZADD ${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY} succeeded conversationId=${member} conversationSlugId=${schedule.conversationSlugId} result=${String(result)}`,
            );
        } catch (error: unknown) {
            log.error(
                error,
                `[AnalysisScheduler] Failed to ZADD ${VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY} for conversationId=${member} conversationSlugId=${schedule.conversationSlugId}`,
            );
        }
    })();
}

export async function wakeScheduledAnalysisForConversation({
    db,
    valkey,
    conversationId,
    log,
}: WakeScheduledAnalysisForConversationParams): Promise<void> {
    const schedule = await getAnalysisWakeSchedule({ db, conversationId });
    if (valkey === undefined) {
        log.info(
            `[AnalysisScheduler] Skipped scheduled analysis wake for conversationId=${String(conversationId)} conversationSlugId=${schedule.conversationSlugId}: valkey not configured`,
        );
        return;
    }

    wakeAnalysisWorker({ valkey, schedule, log });
}
