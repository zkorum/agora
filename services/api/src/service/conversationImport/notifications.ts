import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    notificationTable,
    notificationImportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import {
    buildNotification,
    type NotificationContent,
} from "../notificationDto.js";
import type { RealtimeSSEManager } from "../realtimeSSE.js";

// Completion/failure notifications are persisted by the import worker.
export async function createImportStartedNotification({
    db,
    userId,
    importId,
    notification,
    realtimeSSEManager,
}: {
    db: PostgresJsDatabase;
    userId: string;
    importId: number;
    notification: Extract<NotificationContent, { type: "import_started" }>;
    realtimeSSEManager: RealtimeSSEManager;
}): Promise<void> {
    try {
        const slugId = generateRandomSlugId();
        const content = await getPrimaryDatabase(db).transaction(async (tx) => {
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
            await tx.insert(notificationImportTable).values({
                notificationId: record.notificationId,
                importId,
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
        realtimeSSEManager.broadcastToUser(userId, content);
        log.info(
            `Created ${notification.type} notification for import ${notification.routeTarget.importSlugId}`,
        );
    } catch (error: unknown) {
        log.error(
            error,
            `Failed to create ${notification.type} notification for import ${notification.routeTarget.importSlugId}`,
        );
    }
}
