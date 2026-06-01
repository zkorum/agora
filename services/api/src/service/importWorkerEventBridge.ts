import { log } from "@/app.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { zodImportWorkerEvent } from "./importQueueContract.js";
import { broadcastImportNotification } from "./notification.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";
import type { ValkeyRef } from "./valkeyRef.js";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";

export interface ImportWorkerEventBridge {
    shutdown: () => void;
}

interface CreateImportWorkerEventBridgeParams {
    db: PostgresDatabase;
    valkeyRef: ValkeyRef;
    realtimeSSEManager: RealtimeSSEManager;
    pollIntervalMs: number;
    maxBatchSize: number;
}

export function createImportWorkerEventBridge({
    db,
    valkeyRef,
    realtimeSSEManager,
    pollIntervalMs,
    maxBatchSize,
}: CreateImportWorkerEventBridgeParams): ImportWorkerEventBridge {
    let pollTimer: NodeJS.Timeout | undefined;
    let pollInProgress: Promise<void> | null = null;

    async function processEvent(rawItem: unknown): Promise<void> {
        const parsed = zodImportWorkerEvent.safeParse(rawItem);
        if (!parsed.success) {
            log.warn(
                `[ImportWorkerEventBridge] Skipping invalid event: ${parsed.error.message}`,
            );
            return;
        }

        const event = parsed.data;
        await broadcastImportNotification(
            realtimeSSEManager,
            db,
            event.userId,
            event.notificationSlugId,
            event.importId,
            event.conversationId,
        );

        if (event.broadcastNewConversation) {
            realtimeSSEManager.broadcastToAllExcept({
                event: "new_conversation",
                data: { timestamp: Date.now() },
                excludeUserId: event.userId,
            });
        }
    }

    async function poll(): Promise<void> {
        if (maxBatchSize <= 0) {
            return;
        }

        const valkey = valkeyRef.current;
        if (valkey === undefined) {
            return;
        }

        const items = await valkey.lpopCount(
            VALKEY_QUEUE_KEYS.IMPORT_EVENTS,
            maxBatchSize,
        );
        if (items === null || items.length === 0) {
            return;
        }

        for (const item of items) {
            try {
                const parsedItem: unknown = JSON.parse(String(item));
                await processEvent(parsedItem);
            } catch (error) {
                log.error(
                    error,
                    "[ImportWorkerEventBridge] Failed to process event",
                );
            }
        }
    }

    pollTimer = setInterval(() => {
        pollInProgress ??= poll()
            .catch((error: unknown) => {
                log.error(error, "[ImportWorkerEventBridge] Poll failed");
            })
            .finally(() => {
                pollInProgress = null;
            });
    }, pollIntervalMs);
    pollTimer.unref();

    function shutdown(): void {
        if (pollTimer !== undefined) {
            clearInterval(pollTimer);
            pollTimer = undefined;
        }
    }

    return { shutdown };
}
