import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    notificationTable,
    notificationExportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import type { NotificationType } from "@/shared/types/zod.js";
import type { NotificationSSEManager } from "../notificationSSE.js";
import { getNotifications } from "../notification.js";

interface CreateExportNotificationParams {
    db: PostgresJsDatabase;
    userId: string;
    exportId: number;
    conversationId: number;
    type: NotificationType;
    message?: string;
    errorMessage?: string;
    cancellationReason?: string;
    notificationSSEManager?: NotificationSSEManager;
}

/**
 * Create a notification for an export event
 */
export async function createExportNotification({
    db,
    userId,
    exportId,
    conversationId,
    type,
    message,
    notificationSSEManager,
}: CreateExportNotificationParams): Promise<void> {
    try {
        // Create notification record
        const notificationSlugId = generateRandomSlugId();

        const [notificationRecord] = await db
            .insert(notificationTable)
            .values({
                slugId: notificationSlugId,
                userId: userId,
                notificationType: type,
            })
            .returning({
                notificationId: notificationTable.id,
            });

        const notificationId = notificationRecord.notificationId;

        // Create export-specific notification data
        await db.insert(notificationExportTable).values({
            notificationId: notificationId,
            exportId: exportId,
            conversationId: conversationId,
        });

        log.info(
            `Created ${type} notification for user ${userId}, export ${String(exportId)}${message ? `: ${message}` : ""}`,
        );

        // Broadcast notification via SSE
        if (notificationSSEManager) {
            try {
                log.info(
                    `[SSE] Attempting to broadcast ${type} notification to user ${userId}`,
                );
                const notifications = await getNotifications({
                    db,
                    userId,
                    lastSlugId: undefined,
                });
                const notification = notifications.notificationList.find(
                    (n) => n.slugId === notificationSlugId,
                );
                if (notification) {
                    log.info(
                        `[SSE] Found notification ${notificationSlugId}, broadcasting to user ${userId}`,
                    );
                    notificationSSEManager.broadcastToUser(
                        userId,
                        notification,
                    );
                    log.info(
                        `[SSE] Successfully broadcasted ${type} notification to user ${userId}`,
                    );
                } else {
                    log.warn(
                        `[SSE] Notification ${notificationSlugId} not found in getNotifications result for user ${userId}`,
                    );
                }
            } catch (broadcastError: unknown) {
                log.error(
                    broadcastError,
                    `[SSE] Failed to broadcast ${type} notification to user ${userId}`,
                );
            }
        } else {
            log.warn(
                `[SSE] notificationSSEManager not provided, skipping broadcast for ${type} notification to user ${userId}`,
            );
        }
    } catch (error: unknown) {
        // Don't fail the export if notification creation fails
        log.error(
            `Failed to create ${type} notification for user ${userId}, export ${String(exportId)}:`,
            error,
        );
    }
}
