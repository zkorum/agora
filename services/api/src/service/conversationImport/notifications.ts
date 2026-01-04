import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    notificationTable,
    notificationImportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import type { NotificationType } from "@/shared/types/zod.js";
import type { NotificationSSEManager } from "../notificationSSE.js";
import { broadcastImportNotification } from "../notification.js";

interface CreateImportNotificationParams {
    db: PostgresJsDatabase;
    userId: string;
    importId: number;
    conversationId: number | null;
    type: NotificationType;
    notificationSSEManager: NotificationSSEManager;
}

/**
 * Create a notification for an import event
 */
export async function createImportNotification({
    db,
    userId,
    importId,
    conversationId,
    type,
    notificationSSEManager,
}: CreateImportNotificationParams): Promise<void> {
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

        // Create import-specific notification data
        await db.insert(notificationImportTable).values({
            notificationId: notificationId,
            importId: importId,
            conversationId: conversationId,
        });

        log.info(
            `Created ${type} notification for user ${userId}, import ${String(importId)}`,
        );

        // Broadcast notification via SSE (don't await to avoid blocking)
        void broadcastImportNotification(
            notificationSSEManager,
            db,
            userId,
            notificationSlugId,
            importId,
            conversationId,
        );
    } catch (error: unknown) {
        // Don't fail the import if notification creation fails
        log.error(
            error,
            `Failed to create ${type} notification for user ${userId}, import ${String(importId)}:`,
        );
    }
}
