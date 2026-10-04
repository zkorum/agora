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

type ImportNotificationInput =
    | {
          notification: Extract<
              NotificationContent,
              { type: "import_started" | "import_failed" }
          >;
          conversationId: undefined;
      }
    | {
          notification: Extract<
              NotificationContent,
              { type: "import_completed" }
          > & {
              routeTarget: {
                  type: "import";
                  importSlugId: string;
                  conversationSlugId: string;
              };
              conversationTitle: string;
          };
          conversationId: number;
      };

export async function createImportNotification({
    db,
    userId,
    importId,
    conversationId,
    notification,
    realtimeSSEManager,
}: ImportNotificationInput & {
    db: PostgresJsDatabase;
    userId: string;
    importId: number;
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
                conversationId: conversationId ?? null,
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
