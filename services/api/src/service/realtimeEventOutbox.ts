import { and, desc, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type pino from "pino";
import { z } from "zod";
import type { SharedConfigSchema } from "@/shared-backend/config.js";
import { createPostgresClient } from "@/shared-backend/db.js";
import {
    conversationTable,
    conversationViewSnapshotTable,
    realtimeEventOutboxTable,
} from "@/shared-backend/schema.js";
import type {
    SSEEventDataByType,
    SSEEventType,
} from "@/shared/types/dto.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";

const REALTIME_EVENT_OUTBOX_CHANNEL = "realtime_event_outbox";
const RECENT_EVENT_CATCHUP_MS = 5 * 60 * 1000;
const EVENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const zodConversationAnalysisUpdatedData = z.object({
    conversationSlugId: z.string().min(1),
    conversationViewSnapshotId: z.number().int().positive(),
    analysisSnapshotId: z.number().int().positive(),
    opinionCount: z.number().int().nonnegative().optional(),
    voteCount: z.number().int().nonnegative().optional(),
    participantCount: z.number().int().nonnegative().optional(),
    totalOpinionCount: z.number().int().nonnegative().optional(),
    totalVoteCount: z.number().int().nonnegative().optional(),
    totalParticipantCount: z.number().int().nonnegative().optional(),
    moderatedOpinionCount: z.number().int().nonnegative().optional(),
    hiddenOpinionCount: z.number().int().nonnegative().optional(),
    isClosed: z.boolean().optional(),
    timestamp: z.number().int().nonnegative(),
});

const zodRealtimeEventOutboxNotification = z.object({
    id: z.number().int().positive(),
    eventType: z.string().min(1),
    payload: z.unknown(),
});

interface RealtimeEventOutboxBridge {
    start: () => Promise<void>;
    shutdown: () => Promise<void>;
}

type ListenerClient = Awaited<ReturnType<typeof createPostgresClient>>;

interface PrimaryReplicaDb extends PostgresJsDatabase {
    $primary: PostgresJsDatabase;
}

function hasPrimaryDb(db: PostgresJsDatabase): db is PrimaryReplicaDb {
    return "$primary" in db;
}

function getPrimaryDb(db: PostgresJsDatabase): PostgresJsDatabase {
    if (hasPrimaryDb(db)) {
        return db.$primary;
    }
    return db;
}

interface QueueConversationAnalysisUpdatedEventsForViewSnapshotsProps {
    db: PostgresJsDatabase;
    conversationViewSnapshotIds: number[];
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
            analysisSnapshotId: conversationViewSnapshotTable.analysisSnapshotId,
            opinionCount: conversationViewSnapshotTable.opinionCount,
            voteCount: conversationViewSnapshotTable.voteCount,
            participantCount: conversationViewSnapshotTable.participantCount,
            totalOpinionCount: conversationViewSnapshotTable.totalOpinionCount,
            totalVoteCount: conversationViewSnapshotTable.totalVoteCount,
            totalParticipantCount:
                conversationViewSnapshotTable.totalParticipantCount,
            moderatedOpinionCount:
                conversationViewSnapshotTable.moderatedOpinionCount,
            hiddenOpinionCount: conversationViewSnapshotTable.hiddenOpinionCount,
            isClosed: conversationViewSnapshotTable.isClosed,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, conversationViewSnapshotTable.conversationId),
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

function parseRealtimeEventOutboxRow({
    eventType,
    payload,
}: {
    eventType: string;
    payload: unknown;
}):
    | {
          event: "conversation_analysis_updated";
          data: SSEEventDataByType["conversation_analysis_updated"];
      }
    | undefined {
    switch (eventType) {
        case "conversation_analysis_updated": {
            const result = zodConversationAnalysisUpdatedData.safeParse(payload);
            if (!result.success) {
                return undefined;
            }
            return {
                event: eventType,
                data: result.data,
            };
        }
        default: {
            return undefined;
        }
    }
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
    let cleanupInterval: NodeJS.Timeout | undefined;
    const primaryDb = getPrimaryDb(db);

    const broadcastOutboxRow = ({
        eventType,
        payload,
    }: {
        eventType: string;
        payload: unknown;
    }): void => {
        const realtimeEvent = parseRealtimeEventOutboxRow({ eventType, payload });
        if (realtimeEvent === undefined) {
            log.warn(
                `[RealtimeOutbox] Ignoring unsupported event type ${eventType}`,
            );
            return;
        }

        broadcastTypedEvent({
            realtimeSSEManager,
            event: realtimeEvent.event,
            data: realtimeEvent.data,
        });
    };

    const processNotification = ({
        payload,
    }: {
        payload: string;
    }): void => {
        const parsedJson: unknown = JSON.parse(payload);
        const parsedPayload =
            zodRealtimeEventOutboxNotification.safeParse(parsedJson);
        if (!parsedPayload.success) {
            log.warn("[RealtimeOutbox] Ignoring invalid notification payload");
            return;
        }

        broadcastOutboxRow({
            eventType: parsedPayload.data.eventType,
            payload: parsedPayload.data.payload,
        });
    };

    const processRecentEvents = async (): Promise<void> => {
        const since = new Date(Date.now() - RECENT_EVENT_CATCHUP_MS);
        const rows = await primaryDb
            .select({
                eventType: realtimeEventOutboxTable.eventType,
                payload: realtimeEventOutboxTable.payload,
            })
            .from(realtimeEventOutboxTable)
            .where(gte(realtimeEventOutboxTable.createdAt, since))
            .orderBy(desc(realtimeEventOutboxTable.id));

        for (const row of rows.reverse()) {
            broadcastOutboxRow(row);
        }
    };

    const cleanupOldEvents = async (): Promise<void> => {
        const cutoff = new Date(Date.now() - EVENT_RETENTION_MS);
        await primaryDb
            .delete(realtimeEventOutboxTable)
            .where(lt(realtimeEventOutboxTable.createdAt, cutoff));
    };

    return {
        start: async (): Promise<void> => {
            if (isStarted) {
                return;
            }

            listenerClient = await createPostgresClient(config, log, false);
            await listenerClient.listen(
                REALTIME_EVENT_OUTBOX_CHANNEL,
                (payload) => {
                    try {
                        processNotification({ payload });
                    } catch (error: unknown) {
                        log.error(
                            error,
                            "[RealtimeOutbox] Failed to process notification",
                        );
                    }
                },
            );
            isStarted = true;
            await processRecentEvents();
            cleanupInterval = setInterval(() => {
                void cleanupOldEvents().catch((error: unknown) => {
                    log.error(error, "[RealtimeOutbox] Failed to clean old events");
                });
            }, CLEANUP_INTERVAL_MS);
            cleanupInterval.unref();
            log.info("[RealtimeOutbox] Listening for realtime DB events");
        },
        shutdown: async (): Promise<void> => {
            if (cleanupInterval !== undefined) {
                clearInterval(cleanupInterval);
                cleanupInterval = undefined;
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

function broadcastTypedEvent<TEvent extends SSEEventType>({
    realtimeSSEManager,
    event,
    data,
}: {
    realtimeSSEManager: RealtimeSSEManager;
    event: TEvent;
    data: SSEEventDataByType[TEvent];
}): void {
    realtimeSSEManager.broadcastToAll({ event, data });
}
