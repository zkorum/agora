import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    notificationTable,
    notificationExportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import type { NotificationType } from "@/shared/types/zod.js";
import type { NotificationSSEManager } from "../notificationSSE.js";
import { broadcastExportNotification } from "../notification.js";

interface CreateExportNotificationParams {
    db: PostgresJsDatabase;
    userId: string;
    exportId: number;
    conversationId: number;
    type: NotificationType;
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
            `Created ${type} notification for user ${userId}, export ${String(exportId)}`,
        );

        // Broadcast notification via SSE (don't await to avoid blocking)
        void broadcastExportNotification(
            notificationSSEManager,
            db,
            userId,
            notificationSlugId,
            exportId,
            conversationId,
        );
    } catch (error: unknown) {
        // Don't fail the export if notification creation fails
        log.error(
            `Failed to create ${type} notification for user ${userId}, export ${String(exportId)}:`,
            error,
        );
    }
}
