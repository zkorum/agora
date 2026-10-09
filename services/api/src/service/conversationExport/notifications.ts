import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    notificationTable,
    notificationExportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import type { NotificationContent } from "../notificationDto.js";
import { buildNotification } from "../notificationDto.js";
import type { RealtimeSSEManager } from "../realtimeSSE.js";

type ExportCancellationReason = NonNullable<
    (typeof notificationExportTable.$inferSelect)["cancellationReason"]
>;

type ExportNotificationContent =
    | Extract<
          NotificationContent,
          { type: "export_started" | "export_completed" | "export_failed" }
      >
    | (Omit<
          Extract<NotificationContent, { type: "export_cancelled" }>,
          "cancellationReason"
      > & {
          cancellationReason: ExportCancellationReason;
      });

export async function createExportNotification({
    db,
    userId,
    exportRequestId,
    conversationId,
    notification,
    realtimeSSEManager,
}: {
    db: PostgresJsDatabase;
    userId: string;
    exportRequestId: number;
    conversationId: number;
    notification: ExportNotificationContent;
    realtimeSSEManager: RealtimeSSEManager | undefined;
}): Promise<void> {
    try {
        const slugId = generateRandomSlugId();
        const content = await db.transaction(async (tx) => {
            const [record] = await tx
                .insert(notificationTable)
                .values({
                    slugId,
                    userId,
                    notificationType: notification.type,
                })
                .returning({
                    notificationId: notificationTable.id,
                    createdAt: notificationTable.createdAt,
                    isRead: notificationTable.isRead,
                });
            await tx.insert(notificationExportTable).values({
                notificationId: record.notificationId,
                exportRequestId,
                exportSlugId: notification.routeTarget.exportSlugId,
                conversationId,
                failureReason:
                    notification.type === "export_failed"
                        ? notification.failureReason
                        : undefined,
                cancellationReason:
                    notification.type === "export_cancelled"
                        ? notification.cancellationReason
                        : undefined,
            });
            return buildNotification({
                content: notification,
                record: {
                    slugId,
                    createdAt: record.createdAt,
                    isRead: record.isRead,
                },
            });
        });
        realtimeSSEManager?.broadcastToUser(userId, content);
        log.info(
            `Created ${notification.type} notification for user ${userId}, export ${notification.routeTarget.exportSlugId}`,
        );
    } catch (error: unknown) {
        log.error(
            error,
            `Failed to create ${notification.type} notification for export ${notification.routeTarget.exportSlugId}`,
        );
    }
}
