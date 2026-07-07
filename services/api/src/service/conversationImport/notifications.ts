import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    notificationTable,
    notificationImportTable,
} from "@/shared-backend/schema.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import {
    type NotificationItem,
    zodNotificationItem,
} from "@/shared/types/zod.js";
import type { RealtimeSSEManager } from "../realtimeSSE.js";

type ImportNotificationType =
    | "import_started"
    | "import_completed"
    | "import_failed";

interface CreateImportNotificationParams {
    db: PostgresJsDatabase;
    userId: string;
    importId: number;
    importSlugId: string;
    conversationId: number | null;
    type: ImportNotificationType;
    realtimeSSEManager: RealtimeSSEManager;
}

/**
 * Create a notification for an import event
 */
export async function createImportNotification({
    db,
    userId,
    importId,
    importSlugId,
    conversationId,
    type,
    realtimeSSEManager,
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
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
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

        const baseNotification = {
            slugId: notificationSlugId,
            createdAt: notificationRecord.createdAt,
            isRead: notificationRecord.isRead,
            routeTarget: {
                type: "import" as const,
                importSlugId,
            },
        };
        const notificationItem: Extract<NotificationItem, { type: typeof type }> =
            type === "import_completed"
                ? { ...baseNotification, type }
                : type === "import_failed"
                  ? { ...baseNotification, type }
                  : { ...baseNotification, type };

        const validationResult = zodNotificationItem.safeParse(notificationItem);
        if (validationResult.success) {
            realtimeSSEManager.broadcastToUser(userId, validationResult.data);
        } else {
            log.error(
                validationResult.error,
                `Failed to validate import notification ${notificationSlugId} before broadcast`,
            );
        }
    } catch (error: unknown) {
        // Don't fail the import if notification creation fails
        log.error(
            error,
            `Failed to create ${type} notification for user ${userId}, import ${String(importId)}:`,
        );
    }
}
