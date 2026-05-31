import {
    and,
    desc,
    eq,
    gt,
    gte,
    inArray,
    isNotNull,
    isNull,
    lte,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type pino from "pino";
import { z } from "zod";
import type { SharedConfigSchema } from "@/shared-backend/config.js";
import { createPostgresClient } from "@/shared-backend/db.js";
import {
    conversationTable,
    conversationViewSnapshotCheckpointReasonTable,
    conversationViewSnapshotTable,
    analysisSnapshotResultTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupVariantTable,
    realtimeEventOutboxTable,
} from "@/shared-backend/schema.js";
import { ZodSupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type { SSEEventDataByType } from "@/shared/types/dto.js";
import {
    zodEventSlug,
    zodParticipationMode,
    zodPreferredOpinionGroupCount,
} from "@/shared/types/zod.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";

const REALTIME_EVENT_OUTBOX_CHANNEL = "realtime_event_outbox";
const RECENT_EVENT_CATCHUP_MS = 5 * 60 * 1000;
const RECENT_EVENT_CATCHUP_INTERVAL_MS = 30 * 1000;
const zodConversationAnalysisUpdatedData = z.object({
    conversationSlugId: z.string().min(1),
    conversationViewSnapshotId: z.number().int().positive(),
    analysisSnapshotId: z.number().int().positive(),
    changeKind: z
        .enum(["snapshot", "descriptions", "latest_state"])
        .default("snapshot"),
    checkpointChanged: z.boolean().default(false),
    displayableGroupCounts: z.array(z.number().int().min(2).max(6)),
    opinionCount: z.number().int().nonnegative().optional(),
    voteCount: z.number().int().nonnegative().optional(),
    participantCount: z.number().int().nonnegative().optional(),
    totalOpinionCount: z.number().int().nonnegative().optional(),
    totalVoteCount: z.number().int().nonnegative().optional(),
    totalParticipantCount: z.number().int().nonnegative().optional(),
    moderatedOpinionCount: z.number().int().nonnegative().optional(),
    hiddenOpinionCount: z.number().int().nonnegative().optional(),
    isClosed: z.boolean().optional(),
    locales: z.array(ZodSupportedDisplayLanguageCodes).optional(),
    timestamp: z.number().int().nonnegative(),
});

const zodConversationCommentStatsUpdatedData = z.object({
    conversationSlugId: z.string().min(1),
    conversationViewSnapshotId: z.number().int().positive(),
    opinionCount: z.number().int().nonnegative(),
    voteCount: z.number().int().nonnegative(),
    participantCount: z.number().int().nonnegative(),
    totalOpinionCount: z.number().int().nonnegative(),
    totalVoteCount: z.number().int().nonnegative(),
    totalParticipantCount: z.number().int().nonnegative(),
    moderatedOpinionCount: z.number().int().nonnegative(),
    hiddenOpinionCount: z.number().int().nonnegative(),
    isClosed: z.boolean(),
    timestamp: z.number().int().nonnegative(),
});

const zodConversationSettingsUpdatedData = z.object({
    conversationSlugId: z.string().min(1),
    settings: z
        .object({
            isIndexed: z.boolean(),
            participationMode: zodParticipationMode,
            requiresEventTicket: zodEventSlug.nullable(),
            aiLabelingEnabled: z.boolean(),
            preferredOpinionGroupCount: zodPreferredOpinionGroupCount,
            isClosed: z.boolean(),
        })
        .strict(),
    timestamp: z.number().int().nonnegative(),
});

const zodRealtimeEventOutboxNotification = z.object({
    id: z.number().int().positive(),
});

interface RealtimeEventOutboxBridge {
    start: () => Promise<void>;
    shutdown: () => Promise<void>;
}

type ListenerClient = Awaited<ReturnType<typeof createPostgresClient>>;

interface PrimaryReplicaDb extends PostgresJsDatabase {
    $primary: PostgresJsDatabase;
}

interface RealtimeEventOutboxRow {
    id: number;
    eventType: string;
    payload: unknown;
}

type ConversationReplayEvent =
    | {
          id: number;
          event: "conversation_analysis_updated";
          data: SSEEventDataByType["conversation_analysis_updated"];
      }
    | {
          id: number;
          event: "conversation_comment_stats_updated";
          data: SSEEventDataByType["conversation_comment_stats_updated"];
      }
    | {
          id: number;
          event: "conversation_settings_updated";
          data: SSEEventDataByType["conversation_settings_updated"];
      };

function hasPrimaryDb(db: PostgresJsDatabase): db is PrimaryReplicaDb {
    return "$primary" in db;
}

function getPrimaryDb(db: PostgresJsDatabase): PostgresJsDatabase {
    if (hasPrimaryDb(db)) {
        return db.$primary;
    }
    return db;
}

async function fetchDisplayableGroupCountsByViewSnapshotId({
    db,
    conversationViewSnapshotIds,
}: {
    db: PostgresJsDatabase;
    conversationViewSnapshotIds: number[];
}): Promise<Map<number, number[]>> {
    const uniqueViewSnapshotIds = Array.from(
        new Set(conversationViewSnapshotIds),
    );
    if (uniqueViewSnapshotIds.length === 0) {
        return new Map();
    }

    const rows = await db
        .select({
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            groupCount: opinionGroupVariantTable.groupCount,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            analysisSnapshotResultTable,
            and(
                eq(
                    analysisSnapshotResultTable.analysisSnapshotId,
                    conversationViewSnapshotTable.analysisSnapshotId,
                ),
                eq(
                    analysisSnapshotResultTable.opinionGroupSpecId,
                    conversationViewSnapshotTable.opinionGroupSpecId,
                ),
            ),
        )
        .innerJoin(
            opinionGroupCandidateTable,
            eq(
                opinionGroupCandidateTable.snapshotResultId,
                analysisSnapshotResultTable.id,
            ),
        )
        .innerJoin(
            opinionGroupVariantTable,
            eq(
                opinionGroupVariantTable.id,
                opinionGroupCandidateTable.opinionGroupVariantId,
            ),
        )
        .innerJoin(
            opinionGroupCandidateAssessmentTable,
            eq(
                opinionGroupCandidateAssessmentTable.candidateId,
                opinionGroupCandidateTable.id,
            ),
        )
        .where(
            and(
                inArray(
                    conversationViewSnapshotTable.id,
                    uniqueViewSnapshotIds,
                ),
                eq(analysisSnapshotResultTable.outcome, "success"),
                eq(opinionGroupCandidateTable.outcome, "success"),
                isNull(opinionGroupCandidateAssessmentTable.hiddenReason),
                isNotNull(opinionGroupCandidateAssessmentTable.selectionScore),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.id,
            opinionGroupVariantTable.groupCount,
        );

    const groupCountsByViewSnapshotId = new Map<number, number[]>();
    for (const row of rows) {
        const groupCounts =
            groupCountsByViewSnapshotId.get(row.conversationViewSnapshotId) ??
            [];
        groupCounts.push(row.groupCount);
        groupCountsByViewSnapshotId.set(
            row.conversationViewSnapshotId,
            groupCounts,
        );
    }
    return groupCountsByViewSnapshotId;
}

interface QueueConversationAnalysisUpdatedEventsForViewSnapshotsProps {
    db: PostgresJsDatabase;
    conversationViewSnapshotIds: number[];
}

interface QueueConversationCommentStatsUpdatedEventsForViewSnapshotsProps {
    db: PostgresJsDatabase;
    conversationViewSnapshotIds: number[];
}

interface QueueConversationAnalysisUpdatedEventsForLatestViewSnapshotsProps {
    db: PostgresJsDatabase;
    conversationIds: number[];
}

interface QueueConversationSettingsUpdatedEventProps {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    settings: SSEEventDataByType["conversation_settings_updated"]["settings"];
}

export async function queueConversationSettingsUpdatedEvent({
    db,
    conversationSlugId,
    settings,
}: QueueConversationSettingsUpdatedEventProps): Promise<void> {
    const primaryDb = getPrimaryDb(db);
    const payload: SSEEventDataByType["conversation_settings_updated"] = {
        conversationSlugId,
        settings,
        timestamp: Date.now(),
    };

    await primaryDb.insert(realtimeEventOutboxTable).values({
        eventType: "conversation_settings_updated",
        payload,
    });
}

export async function queueConversationAnalysisUpdatedEventsForViewSnapshots({
    db,
    conversationViewSnapshotIds,
}: QueueConversationAnalysisUpdatedEventsForViewSnapshotsProps): Promise<void> {
    if (conversationViewSnapshotIds.length === 0) {
        return;
    }

    const primaryDb = getPrimaryDb(db);
    const rows = await primaryDb
        .select({
            conversationSlugId: conversationTable.slugId,
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
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
            isClosed: conversationViewSnapshotTable.isClosed,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            and(
                inArray(
                    conversationViewSnapshotTable.id,
                    conversationViewSnapshotIds,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
            ),
        );

    const checkpointRows = await primaryDb
        .select({
            conversationViewSnapshotId:
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
        })
        .from(conversationViewSnapshotCheckpointReasonTable)
        .where(
            inArray(
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                conversationViewSnapshotIds,
            ),
        );
    const checkpointViewSnapshotIds = new Set(
        checkpointRows.map((row) => row.conversationViewSnapshotId),
    );
    const displayableGroupCountsByViewSnapshotId =
        await fetchDisplayableGroupCountsByViewSnapshotId({
            db: primaryDb,
            conversationViewSnapshotIds,
        });

    const timestamp = Date.now();
    const values: (typeof realtimeEventOutboxTable.$inferInsert)[] = [];
    for (const row of rows) {
        if (row.analysisSnapshotId === null) {
            continue;
        }
        const payload: SSEEventDataByType["conversation_analysis_updated"] = {
            conversationSlugId: row.conversationSlugId,
            conversationViewSnapshotId: row.conversationViewSnapshotId,
            analysisSnapshotId: row.analysisSnapshotId,
            changeKind: "snapshot",
            checkpointChanged: checkpointViewSnapshotIds.has(
                row.conversationViewSnapshotId,
            ),
            displayableGroupCounts:
                displayableGroupCountsByViewSnapshotId.get(
                    row.conversationViewSnapshotId,
                ) ?? [],
            opinionCount: row.opinionCount,
            voteCount: row.voteCount,
            participantCount: row.participantCount,
            totalOpinionCount: row.totalOpinionCount,
            totalVoteCount: row.totalVoteCount,
            totalParticipantCount: row.totalParticipantCount,
            moderatedOpinionCount: row.moderatedOpinionCount,
            hiddenOpinionCount: row.hiddenOpinionCount,
            isClosed: row.isClosed,
            timestamp,
        };
        values.push({ eventType: "conversation_analysis_updated", payload });
    }

    if (values.length === 0) {
        return;
    }

    await primaryDb.insert(realtimeEventOutboxTable).values(values);
}

export async function queueConversationCommentStatsUpdatedEventsForViewSnapshots({
    db,
    conversationViewSnapshotIds,
}: QueueConversationCommentStatsUpdatedEventsForViewSnapshotsProps): Promise<void> {
    if (conversationViewSnapshotIds.length === 0) {
        return;
    }

    const primaryDb = getPrimaryDb(db);
    const rows = await primaryDb
        .select({
            conversationSlugId: conversationTable.slugId,
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
            isClosed: conversationViewSnapshotTable.isClosed,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            inArray(
                conversationViewSnapshotTable.id,
                conversationViewSnapshotIds,
            ),
        );

    const timestamp = Date.now();
    const values = rows.map((row) => {
        const payload: SSEEventDataByType["conversation_comment_stats_updated"] = {
            conversationSlugId: row.conversationSlugId,
            conversationViewSnapshotId: row.conversationViewSnapshotId,
            opinionCount: row.opinionCount,
            voteCount: row.voteCount,
            participantCount: row.participantCount,
            totalOpinionCount: row.totalOpinionCount,
            totalVoteCount: row.totalVoteCount,
            totalParticipantCount: row.totalParticipantCount,
            moderatedOpinionCount: row.moderatedOpinionCount,
            hiddenOpinionCount: row.hiddenOpinionCount,
            isClosed: row.isClosed,
            timestamp,
        };
        return { eventType: "conversation_comment_stats_updated", payload };
    });

    if (values.length === 0) {
        return;
    }

    await primaryDb.insert(realtimeEventOutboxTable).values(values);
}

export async function queueConversationAnalysisUpdatedEventsForLatestViewSnapshots({
    db,
    conversationIds,
}: QueueConversationAnalysisUpdatedEventsForLatestViewSnapshotsProps): Promise<void> {
    const uniqueConversationIds = Array.from(new Set(conversationIds));
    if (uniqueConversationIds.length === 0) {
        return;
    }

    const primaryDb = getPrimaryDb(db);
    const rows = await primaryDb
        .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
            conversationSlugId: conversationTable.slugId,
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
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
            isClosed: conversationViewSnapshotTable.isClosed,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            and(
                inArray(
                    conversationViewSnapshotTable.conversationId,
                    uniqueConversationIds,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.conversationId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    const timestamp = Date.now();
    const values: (typeof realtimeEventOutboxTable.$inferInsert)[] = [];
    const displayableGroupCountsByViewSnapshotId =
        await fetchDisplayableGroupCountsByViewSnapshotId({
            db: primaryDb,
            conversationViewSnapshotIds: rows.map(
                (row) => row.conversationViewSnapshotId,
            ),
        });
    for (const row of rows) {
        if (row.analysisSnapshotId === null) {
            continue;
        }
        const payload: SSEEventDataByType["conversation_analysis_updated"] = {
            conversationSlugId: row.conversationSlugId,
            conversationViewSnapshotId: row.conversationViewSnapshotId,
            analysisSnapshotId: row.analysisSnapshotId,
            changeKind: "snapshot",
            checkpointChanged: false,
            displayableGroupCounts:
                displayableGroupCountsByViewSnapshotId.get(
                    row.conversationViewSnapshotId,
                ) ?? [],
            opinionCount: row.opinionCount,
            voteCount: row.voteCount,
            participantCount: row.participantCount,
            totalOpinionCount: row.totalOpinionCount,
            totalVoteCount: row.totalVoteCount,
            totalParticipantCount: row.totalParticipantCount,
            moderatedOpinionCount: row.moderatedOpinionCount,
            hiddenOpinionCount: row.hiddenOpinionCount,
            isClosed: row.isClosed,
            timestamp,
        };
        values.push({ eventType: "conversation_analysis_updated", payload });
    }

    if (values.length === 0) {
        return;
    }

    await primaryDb.insert(realtimeEventOutboxTable).values(values);
}

export async function fetchConversationAnalysisUpdatedEventForLatestViewSnapshot({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<SSEEventDataByType["conversation_analysis_updated"] | undefined> {
    const primaryDb = getPrimaryDb(db);
    const rows = await primaryDb
        .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
            conversationSlugId: conversationTable.slugId,
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
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
            isClosed: conversationViewSnapshotTable.isClosed,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.conversationId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        )
        .limit(1);

    const row = rows.at(0);
    if (
        row?.analysisSnapshotId === undefined ||
        row.analysisSnapshotId === null
    ) {
        return undefined;
    }

    const checkpointRows = await primaryDb
        .select({
            conversationViewSnapshotId:
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
        })
        .from(conversationViewSnapshotCheckpointReasonTable)
        .where(
            eq(
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                row.conversationViewSnapshotId,
            ),
        )
        .limit(1);
    const displayableGroupCountsByViewSnapshotId =
        await fetchDisplayableGroupCountsByViewSnapshotId({
            db: primaryDb,
            conversationViewSnapshotIds: [row.conversationViewSnapshotId],
        });

    return {
        conversationSlugId: row.conversationSlugId,
        conversationViewSnapshotId: row.conversationViewSnapshotId,
        analysisSnapshotId: row.analysisSnapshotId,
        changeKind: "latest_state",
        checkpointChanged: checkpointRows.length > 0,
        displayableGroupCounts:
            displayableGroupCountsByViewSnapshotId.get(
                row.conversationViewSnapshotId,
            ) ?? [],
        opinionCount: row.opinionCount,
        voteCount: row.voteCount,
        participantCount: row.participantCount,
        totalOpinionCount: row.totalOpinionCount,
        totalVoteCount: row.totalVoteCount,
        totalParticipantCount: row.totalParticipantCount,
        moderatedOpinionCount: row.moderatedOpinionCount,
        hiddenOpinionCount: row.hiddenOpinionCount,
        isClosed: row.isClosed,
        timestamp: Date.now(),
    };
}

function parseRealtimeEventOutboxRow({
    id,
    eventType,
    payload,
}: {
    id: number;
    eventType: string;
    payload: unknown;
}): ConversationReplayEvent | undefined {
    switch (eventType) {
        case "conversation_analysis_updated": {
            const result =
                zodConversationAnalysisUpdatedData.safeParse(payload);
            if (!result.success) {
                return undefined;
            }
            return {
                id,
                event: eventType,
                data: result.data,
            };
        }
        case "conversation_comment_stats_updated": {
            const result =
                zodConversationCommentStatsUpdatedData.safeParse(payload);
            if (!result.success) {
                return undefined;
            }
            return {
                id,
                event: eventType,
                data: result.data,
            };
        }
        case "conversation_settings_updated": {
            const result =
                zodConversationSettingsUpdatedData.safeParse(payload);
            if (!result.success) {
                return undefined;
            }
            return {
                id,
                event: eventType,
                data: result.data,
            };
        }
        default: {
            return undefined;
        }
    }
}

export async function fetchConversationRealtimeEventsAfterId({
    db,
    conversationSlugId,
    lastEventId,
    limit,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    lastEventId: number;
    limit: number;
}): Promise<ConversationReplayEvent[]> {
    const primaryDb = getPrimaryDb(db);
    const rows = await primaryDb
        .select({
            id: realtimeEventOutboxTable.id,
            eventType: realtimeEventOutboxTable.eventType,
            payload: realtimeEventOutboxTable.payload,
        })
        .from(realtimeEventOutboxTable)
        .where(
            and(
                gt(realtimeEventOutboxTable.id, lastEventId),
                inArray(realtimeEventOutboxTable.eventType, [
                    "conversation_analysis_updated",
                    "conversation_settings_updated",
                ]),
                sql`${realtimeEventOutboxTable.payload}->>'conversationSlugId' = ${conversationSlugId}`,
            ),
        )
        .orderBy(realtimeEventOutboxTable.id)
        .limit(limit);

    const events: ConversationReplayEvent[] = [];
    for (const row of rows) {
        const event = parseRealtimeEventOutboxRow(row);
        if (event !== undefined) {
            events.push(event);
        }
    }
    return events;
}

export function createRealtimeEventOutboxBridge({
    db,
    config,
    log,
    realtimeSSEManager,
}: {
    db: PostgresJsDatabase;
    config: SharedConfigSchema;
    log: Pick<pino.BaseLogger, "info" | "warn" | "error">;
    realtimeSSEManager: RealtimeSSEManager;
}): RealtimeEventOutboxBridge {
    let listenerClient: ListenerClient | undefined;
    let isStarted = false;
    let catchupInterval: NodeJS.Timeout | undefined;
    let highestProcessedOutboxId = 0;
    let outboxTaskQueue: Promise<void> = Promise.resolve();
    const failedOutboxIds = new Set<number>();
    const primaryDb = getPrimaryDb(db);

    const broadcastOutboxRow = ({
        id,
        eventType,
        payload,
    }: {
        id: number;
        eventType: string;
        payload: unknown;
    }): void => {
        const realtimeEvent = parseRealtimeEventOutboxRow({
            id,
            eventType,
            payload,
        });
        if (realtimeEvent === undefined) {
            log.warn(
                `[RealtimeOutbox] Ignoring unsupported event type ${eventType}`,
            );
            return;
        }

        switch (realtimeEvent.event) {
            case "conversation_analysis_updated": {
                realtimeSSEManager.broadcastToConversationSubscribers({
                    conversationSlugId: realtimeEvent.data.conversationSlugId,
                    id: realtimeEvent.id,
                    event: realtimeEvent.event,
                    data: realtimeEvent.data,
                });
                break;
            }
            case "conversation_comment_stats_updated": {
                realtimeSSEManager.broadcastToConversationSubscribers({
                    conversationSlugId: realtimeEvent.data.conversationSlugId,
                    id: realtimeEvent.id,
                    event: realtimeEvent.event,
                    data: realtimeEvent.data,
                });
                break;
            }
            case "conversation_settings_updated": {
                realtimeSSEManager.broadcastToConversationSubscribers({
                    conversationSlugId: realtimeEvent.data.conversationSlugId,
                    id: realtimeEvent.id,
                    event: realtimeEvent.event,
                    data: realtimeEvent.data,
                });
                break;
            }
        }
    };

    const processOutboxRow = (row: RealtimeEventOutboxRow): void => {
        if (
            row.id <= highestProcessedOutboxId &&
            !failedOutboxIds.has(row.id)
        ) {
            return;
        }

        broadcastOutboxRow(row);
        failedOutboxIds.delete(row.id);
        highestProcessedOutboxId = Math.max(highestProcessedOutboxId, row.id);
    };

    const processNotification = async ({
        payload,
    }: {
        payload: string;
    }): Promise<void> => {
        const parsedJson: unknown = JSON.parse(payload);
        const parsedPayload =
            zodRealtimeEventOutboxNotification.safeParse(parsedJson);
        if (!parsedPayload.success) {
            log.warn("[RealtimeOutbox] Ignoring invalid notification payload");
            return;
        }

        const outboxId = parsedPayload.data.id;
        if (
            outboxId <= highestProcessedOutboxId &&
            !failedOutboxIds.has(outboxId)
        ) {
            return;
        }

        try {
            const rows = await primaryDb
                .select({
                    id: realtimeEventOutboxTable.id,
                    eventType: realtimeEventOutboxTable.eventType,
                    payload: realtimeEventOutboxTable.payload,
                })
                .from(realtimeEventOutboxTable)
                .where(
                    and(
                        gt(
                            realtimeEventOutboxTable.id,
                            highestProcessedOutboxId,
                        ),
                        lte(realtimeEventOutboxTable.id, outboxId),
                    ),
                )
                .orderBy(realtimeEventOutboxTable.id);
            if (rows.length === 0) {
                log.warn(
                    `[RealtimeOutbox] Missing outbox row ${String(outboxId)}`,
                );
                return;
            }

            processOutboxRows({ rows, failureContext: "notification" });
        } catch (error: unknown) {
            failedOutboxIds.add(outboxId);
            throw error;
        }
    };

    const processOutboxRows = ({
        rows,
        failureContext,
    }: {
        rows: RealtimeEventOutboxRow[];
        failureContext: string;
    }): void => {
        for (const row of rows) {
            try {
                processOutboxRow(row);
            } catch (error: unknown) {
                failedOutboxIds.add(row.id);
                log.error(
                    error,
                    `[RealtimeOutbox] Failed to process ${failureContext} row ${String(row.id)}`,
                );
            }
        }
    };

    const processRecentEvents = async (): Promise<void> => {
        const since = new Date(Date.now() - RECENT_EVENT_CATCHUP_MS);
        const rows = await primaryDb
            .select({
                id: realtimeEventOutboxTable.id,
                eventType: realtimeEventOutboxTable.eventType,
                payload: realtimeEventOutboxTable.payload,
            })
            .from(realtimeEventOutboxTable)
            .where(
                and(
                    gte(realtimeEventOutboxTable.createdAt, since),
                    gt(realtimeEventOutboxTable.id, highestProcessedOutboxId),
                ),
            )
            .orderBy(realtimeEventOutboxTable.id);

        processOutboxRows({ rows, failureContext: "catch-up" });

        if (failedOutboxIds.size === 0) {
            return;
        }

        const failedRows = await primaryDb
            .select({
                id: realtimeEventOutboxTable.id,
                eventType: realtimeEventOutboxTable.eventType,
                payload: realtimeEventOutboxTable.payload,
            })
            .from(realtimeEventOutboxTable)
            .where(
                inArray(
                    realtimeEventOutboxTable.id,
                    Array.from(failedOutboxIds),
                ),
            )
            .orderBy(realtimeEventOutboxTable.id);

        processOutboxRows({ rows: failedRows, failureContext: "retry" });

        const foundFailedIds = new Set(failedRows.map((row) => row.id));
        for (const failedOutboxId of failedOutboxIds) {
            if (!foundFailedIds.has(failedOutboxId)) {
                failedOutboxIds.delete(failedOutboxId);
            }
        }
    };

    const processNotificationSafely = async ({
        payload,
    }: {
        payload: string;
    }): Promise<void> => {
        try {
            await processNotification({ payload });
        } catch (error: unknown) {
            log.error(error, "[RealtimeOutbox] Failed to process notification");
        }
    };

    const processRecentEventsSafely = async (): Promise<void> => {
        try {
            await processRecentEvents();
        } catch (error: unknown) {
            log.error(
                error,
                "[RealtimeOutbox] Failed to catch up recent events",
            );
        }
    };

    const enqueueOutboxTask = ({
        task,
    }: {
        task: () => Promise<void>;
    }): void => {
        const previousTask = outboxTaskQueue;
        outboxTaskQueue = (async (): Promise<void> => {
            try {
                await previousTask;
            } catch (error: unknown) {
                log.error(error, "[RealtimeOutbox] Previous task failed");
            }
            await task();
        })();
        void outboxTaskQueue;
    };

    return {
        start: async (): Promise<void> => {
            if (isStarted) {
                return;
            }

            await processRecentEvents();
            listenerClient = await createPostgresClient(config, log, false);
            await listenerClient.listen(
                REALTIME_EVENT_OUTBOX_CHANNEL,
                (payload) => {
                    enqueueOutboxTask({
                        task: async (): Promise<void> => {
                            await processNotificationSafely({ payload });
                        },
                    });
                },
            );
            isStarted = true;
            catchupInterval = setInterval(() => {
                enqueueOutboxTask({ task: processRecentEventsSafely });
            }, RECENT_EVENT_CATCHUP_INTERVAL_MS);
            catchupInterval.unref();
            log.info("[RealtimeOutbox] Listening for realtime DB events");
        },
        shutdown: async (): Promise<void> => {
            if (catchupInterval !== undefined) {
                clearInterval(catchupInterval);
                catchupInterval = undefined;
            }

            if (listenerClient === undefined) {
                return;
            }

            await listenerClient.end({ timeout: 5 });
            listenerClient = undefined;
            isStarted = false;
        },
    };
}
