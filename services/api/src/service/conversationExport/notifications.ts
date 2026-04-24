import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    notificationTable,
    notificationExportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import type { ExportFailureReason, NotificationType } from "@/shared/types/zod.js";
import type { RealtimeSSEManager } from "../realtimeSSE.js";
import { broadcastExportNotification } from "../notification.js";

type ExportCancellationReason = NonNullable<
    (typeof notificationExportTable.$inferSelect)["cancellationReason"]
>;

interface CreateExportNotificationParams {
    db: PostgresJsDatabase;
    userId: string;
    exportRequestId: number;
    exportSlugId: string;
    conversationId: number;
    type: NotificationType;
    failureReason?: ExportFailureReason;
    cancellationReason?: ExportCancellationReason;
    realtimeSSEManager?: RealtimeSSEManager;
}

/**
 * Create a notification for an export event
 */
export async function createExportNotification({
    db,
    userId,
    exportRequestId,
    exportSlugId,
    conversationId,
    type,
    failureReason,
    cancellationReason,
    realtimeSSEManager,
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
            exportRequestId,
            exportSlugId,
            conversationId: conversationId,
            failureReason,
            cancellationReason,
        });

        log.info(
            `Created ${type} notification for user ${userId}, export ${exportSlugId}`,
        );

        // Broadcast notification via SSE (don't await to avoid blocking)
        void broadcastExportNotification(
            realtimeSSEManager,
            db,
            userId,
            notificationSlugId,
        );
    } catch (error: unknown) {
        // Don't fail the export if notification creation fails
        log.error(
            error,
            `Failed to create ${type} notification for user ${userId}, export ${exportSlugId}:`,
        );
    }
}
