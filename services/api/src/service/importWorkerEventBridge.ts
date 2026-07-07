import { log } from "@/app.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { zodNotificationItem } from "@/shared/types/zod.js";
import { zodImportWorkerEvent } from "./importQueueContract.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";
import type { ValkeyRef } from "./valkeyRef.js";

export interface ImportWorkerEventBridge {
    shutdown: () => void;
}

interface CreateImportWorkerEventBridgeParams {
    valkeyRef: ValkeyRef;
    realtimeSSEManager: RealtimeSSEManager;
    pollIntervalMs: number;
    maxBatchSize: number;
}

export function createImportWorkerEventBridge({
    valkeyRef,
    realtimeSSEManager,
    pollIntervalMs,
    maxBatchSize,
}: CreateImportWorkerEventBridgeParams): ImportWorkerEventBridge {
    let pollTimer: NodeJS.Timeout | undefined;
    let pollInProgress: Promise<void> | null = null;

    function processEvent(rawItem: unknown): void {
        const parsed = zodImportWorkerEvent.safeParse(rawItem);
        if (!parsed.success) {
            log.warn(
                `[ImportWorkerEventBridge] Skipping invalid event: ${parsed.error.message}`,
            );
            return;
        }

        const event = parsed.data;
        const baseNotification = {
            slugId: event.notificationSlugId,
            createdAt: event.notificationCreatedAt,
            isRead: event.notificationIsRead,
            routeTarget: {
                type: "import" as const,
                importSlugId: event.importSlugId,
                conversationSlugId: event.conversationSlugId,
            },
        };
        const notificationItem: unknown =
            event.failureReason !== undefined
                ? {
                      ...baseNotification,
                      type: "import_failed",
                      failureReason: event.failureReason,
                  }
                : event.conversationSlugId !== undefined
                  ? {
                        ...baseNotification,
                        type: "import_completed",
                        conversationTitle: event.conversationTitle,
                    }
                  : {
                        ...baseNotification,
                        type: "import_started",
                    };

        const validationResult = zodNotificationItem.safeParse(notificationItem);
        if (validationResult.success) {
            realtimeSSEManager.broadcastToUser(
                event.userId,
                validationResult.data,
            );
        } else {
            log.warn(
                `[ImportWorkerEventBridge] Skipping invalid notification event: ${validationResult.error.message}`,
            );
        }

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
                processEvent(parsedItem);
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
