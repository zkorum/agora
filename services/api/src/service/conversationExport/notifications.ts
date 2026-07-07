import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    notificationTable,
    notificationExportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import {
    type ExportFailureReason,
    type NotificationItem,
    zodNotificationItem,
} from "@/shared/types/zod.js";
import type { RealtimeSSEManager } from "../realtimeSSE.js";

type ExportNotificationType =
    | "export_started"
    | "export_completed"
    | "export_failed"
    | "export_cancelled";

type ExportCancellationReason = NonNullable<
    (typeof notificationExportTable.$inferSelect)["cancellationReason"]
>;

interface CreateExportNotificationParams {
    db: PostgresJsDatabase;
    userId: string;
    exportRequestId: number;
    exportSlugId: string;
    conversationId: number;
    conversationSlugId: string;
    conversationTitle: string;
    type: ExportNotificationType;
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
    conversationSlugId,
    conversationTitle,
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
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
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

        const baseNotification = {
            slugId: notificationSlugId,
            createdAt: notificationRecord.createdAt,
            isRead: notificationRecord.isRead,
            routeTarget: {
                type: "export" as const,
                conversationSlugId,
                exportSlugId,
            },
            conversationTitle,
        };
        const notificationItem: Extract<NotificationItem, { type: typeof type }> =
            type === "export_failed"
                ? {
                      ...baseNotification,
                      type,
                      failureReason,
                  }
                : type === "export_cancelled"
                  ? {
                        ...baseNotification,
                        type,
                        cancellationReason:
                            cancellationReason ?? "Export was cancelled",
                    }
                  : {
                        ...baseNotification,
                        type,
                    };

        const validationResult = zodNotificationItem.safeParse(notificationItem);
        if (validationResult.success) {
            realtimeSSEManager?.broadcastToUser(userId, validationResult.data);
        } else {
            log.error(
                validationResult.error,
                `Failed to validate export notification ${notificationSlugId} before broadcast`,
            );
        }
    } catch (error: unknown) {
        // Don't fail the export if notification creation fails
        log.error(
            error,
            `Failed to create ${type} notification for user ${userId}, export ${exportSlugId}:`,
        );
    }
}
