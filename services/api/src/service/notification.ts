import {
    conversationTable,
    conversationContentTable,
    conversationExportTable,
    notificationNewOpinionTable,
    notificationOpinionVoteTable,
    notificationExportTable,
    opinionContentTable,
    opinionTable,
    notificationTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { FetchNotificationsResponse } from "@/shared/types/dto.js";
import type { NotificationItem } from "@/shared/types/zod.js";
import { and, desc, eq, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import { generateRandomSlugId } from "@/crypto.js";
import type { NotificationSSEManager } from "./notificationSSE.js";

interface MarkAllNotificationsAsReadProps {
    db: PostgresJsDatabase;
    userId: string;
}

export async function markAllNotificationsAsRead({
    db,
    userId,
}: MarkAllNotificationsAsReadProps) {
    try {
        await db
            .update(notificationTable)
            .set({
                isRead: true,
            })
            .where(eq(notificationTable.userId, userId));
    } catch (error) {
        log.error(error);
        throw httpErrors.internalServerError(
            "Failed to update user notifications as read for user",
        );
    }
}

interface GetNotificationSlugIdLastCreatedAtProps {
    lastSlugId: string | undefined;
    db: PostgresJsDatabase;
}

async function getNotificationSlugIdLastCreatedAt({
    lastSlugId,
    db,
}: GetNotificationSlugIdLastCreatedAtProps) {
    let lastCreatedAt = new Date();

    if (lastSlugId) {
        const selectResponse = await db
            .select({ createdAt: notificationTable.createdAt })
            .from(notificationTable)
            .where(eq(notificationTable.slugId, lastSlugId));
        if (selectResponse.length == 1) {
            lastCreatedAt = selectResponse[0].createdAt;
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCreatedAt;
}

interface GetNotificationsProps {
    db: PostgresJsDatabase;
    userId: string;
    lastSlugId: string | undefined;
}

export async function getNotifications({
    db,
    userId,
    lastSlugId,
}: GetNotificationsProps): Promise<FetchNotificationsResponse> {
    const notificationItemList: NotificationItem[] = [];

    const fetchLimit = 20;

    let numNewNotifications = 0;

    const lastCreatedAt = await getNotificationSlugIdLastCreatedAt({
        db: db,
        lastSlugId: lastSlugId,
    });

    const whereClause = and(
        eq(notificationTable.userId, userId),
        lte(notificationTable.createdAt, lastCreatedAt),
    );

    const orderByClause = desc(notificationTable.createdAt);

    {
        const notificationTableResponse = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                username: userTable.username,
                opinionContent: opinionContentTable.content,
                slugId: notificationTable.slugId,
            })
            .from(notificationTable)
            .leftJoin(
                notificationNewOpinionTable,
                eq(
                    notificationNewOpinionTable.notificationId,
                    notificationTable.id,
                ),
            )
            .leftJoin(
                opinionTable,
                eq(opinionTable.id, notificationNewOpinionTable.opinionId),
            )
            .leftJoin(
                opinionContentTable,
                eq(opinionContentTable.opinionId, opinionTable.id),
            )
            .leftJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationNewOpinionTable.conversationId,
                ),
            )
            .leftJoin(
                userTable,
                eq(userTable.id, notificationNewOpinionTable.authorId),
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(fetchLimit);

        notificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.opinionSlugId &&
                notificationItem.username &&
                notificationItem.opinionContent
            ) {
                const parsedItem: NotificationItem = {
                    type: "new_opinion",
                    slugId: notificationItem.slugId,
                    createdAt: notificationItem.createdAt,
                    isRead: notificationItem.isRead,
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
                    username: notificationItem.username,
                    routeTarget: {
                        type: "opinion",
                        conversationSlugId: notificationItem.conversationSlugId,
                        opinionSlugId: notificationItem.opinionSlugId,
                    },
                };

                notificationItemList.push(parsedItem);

                if (!notificationItem.isRead) {
                    numNewNotifications += 1;
                }
            }
        });
    }

    {
        const notificationTableResponse = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                opinionContent: opinionContentTable.content,
                numVotes: notificationOpinionVoteTable.numVotes,
                slugId: notificationTable.slugId,
            })
            .from(notificationTable)
            .leftJoin(
                notificationOpinionVoteTable,
                eq(
                    notificationOpinionVoteTable.notificationId,
                    notificationTable.id,
                ),
            )
            .leftJoin(
                opinionTable,
                eq(opinionTable.id, notificationOpinionVoteTable.opinionId),
            )
            .leftJoin(
                opinionContentTable,
                eq(opinionContentTable.opinionId, opinionTable.id),
            )
            .leftJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationOpinionVoteTable.conversationId,
                ),
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(fetchLimit);

        notificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.opinionSlugId &&
                notificationItem.opinionContent &&
                notificationItem.numVotes
            ) {
                const numVotes = notificationItem.numVotes;
                const parsedItem: NotificationItem = {
                    type: "opinion_vote",
                    slugId: notificationItem.slugId,
                    createdAt: notificationItem.createdAt,
                    isRead: notificationItem.isRead,
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
                    routeTarget: {
                        type: "opinion",
                        conversationSlugId: notificationItem.conversationSlugId,
                        opinionSlugId: notificationItem.opinionSlugId,
                    },
                    numVotes: numVotes,
                };

                notificationItemList.push(parsedItem);

                if (!notificationItem.isRead) {
                    numNewNotifications += 1;
                }
            }
        });
    }

    // Fetch export notifications
    {
        const notificationTableResponse = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                notificationType: notificationTable.notificationType,
                conversationSlugId: conversationTable.slugId,
                conversationTitle: conversationContentTable.title,
                exportSlugId: conversationExportTable.slugId,
                errorMessage: conversationExportTable.errorMessage,
                cancellationReason: conversationExportTable.cancellationReason,
                slugId: notificationTable.slugId,
            })
            .from(notificationTable)
            .leftJoin(
                notificationExportTable,
                eq(
                    notificationExportTable.notificationId,
                    notificationTable.id,
                ),
            )
            .leftJoin(
                conversationExportTable,
                eq(
                    conversationExportTable.id,
                    notificationExportTable.exportId,
                ),
            )
            .leftJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationExportTable.conversationId,
                ),
            )
            .leftJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(fetchLimit);

        notificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.conversationTitle &&
                notificationItem.exportSlugId &&
                (notificationItem.notificationType === "export_completed" ||
                    notificationItem.notificationType === "export_failed" ||
                    notificationItem.notificationType === "export_cancelled")
            ) {
                // Construct notification based on type
                if (notificationItem.notificationType === "export_completed") {
                    const parsedItem: NotificationItem = {
                        type: "export_completed",
                        slugId: notificationItem.slugId,
                        createdAt: notificationItem.createdAt,
                        isRead: notificationItem.isRead,
                        message: notificationItem.conversationTitle,
                        routeTarget: {
                            type: "export",
                            conversationSlugId:
                                notificationItem.conversationSlugId,
                            exportSlugId: notificationItem.exportSlugId,
                        },
                    };
                    notificationItemList.push(parsedItem);
                } else if (
                    notificationItem.notificationType === "export_failed"
                ) {
                    const parsedItem: NotificationItem = {
                        type: "export_failed",
                        slugId: notificationItem.slugId,
                        createdAt: notificationItem.createdAt,
                        isRead: notificationItem.isRead,
                        message:
                            notificationItem.errorMessage || "Export failed",
                        routeTarget: {
                            type: "export",
                            conversationSlugId:
                                notificationItem.conversationSlugId,
                            exportSlugId: notificationItem.exportSlugId,
                        },
                        ...(notificationItem.errorMessage && {
                            errorMessage: notificationItem.errorMessage,
                        }),
                    };
                    notificationItemList.push(parsedItem);
                } else if (
                    notificationItem.notificationType === "export_cancelled"
                ) {
                    const parsedItem: NotificationItem = {
                        type: "export_cancelled",
                        slugId: notificationItem.slugId,
                        createdAt: notificationItem.createdAt,
                        isRead: notificationItem.isRead,
                        message:
                            notificationItem.cancellationReason ||
                            "Export was cancelled",
                        routeTarget: {
                            type: "export",
                            conversationSlugId:
                                notificationItem.conversationSlugId,
                            exportSlugId: notificationItem.exportSlugId,
                        },
                        cancellationReason:
                            notificationItem.cancellationReason ||
                            "Export was cancelled",
                    };
                    notificationItemList.push(parsedItem);
                }

                if (!notificationItem.isRead) {
                    numNewNotifications += 1;
                }
            }
        });
    }

    notificationItemList.sort(function (a, b) {
        return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return {
        numNewNotifications: numNewNotifications,
        notificationList: notificationItemList,
    };
}

interface InsertNewVoteNotificationProps {
    db: PostgresJsDatabase;
    userId: string;
    opinionId: number;
    conversationId: number;
    numVotes: number;
}

/**
 * Broadcast a notification to a user via SSE
 * Fetches the notification data and sends it to connected clients
 */
async function broadcastNotificationToUser(
    notificationSSEManager: NotificationSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
): Promise<void> {
    // Skip broadcast if SSE manager is not available
    if (!notificationSSEManager) {
        return;
    }

    try {
        // Fetch the complete notification data to broadcast
        const notifications = await getNotifications({
            db,
            userId,
            lastSlugId: undefined,
        });

        // Find the specific notification we just created
        const notification = notifications.notificationList.find(
            (n) => n.slugId === notificationSlugId,
        );

        if (notification) {
            // Broadcast to the user
            notificationSSEManager.broadcastToUser(userId, notification);
        }
    } catch (error) {
        // Don't fail the operation if broadcast fails
        log.error(
            error,
            `Failed to broadcast notification ${notificationSlugId} to user ${userId}`,
        );
    }
}

interface InsertNewVoteNotificationPropsExtended
    extends InsertNewVoteNotificationProps {
    notificationSSEManager?: NotificationSSEManager;
}

export async function insertNewVoteNotification({
    db,
    userId,
    opinionId,
    conversationId,
    numVotes,
    notificationSSEManager,
}: InsertNewVoteNotificationPropsExtended) {
    const notificationSlugId = generateRandomSlugId();
    const notificationTableResponse = await db
        .insert(notificationTable)
        .values({
            slugId: notificationSlugId,
            userId: userId,
            notificationType: "opinion_vote",
        })
        .returning({
            notificationId: notificationTable.id,
        });

    const notificationId = notificationTableResponse[0].notificationId;

    await db.insert(notificationOpinionVoteTable).values({
        notificationId: notificationId,
        opinionId: opinionId,
        conversationId: conversationId,
        numVotes: numVotes,
    });

    // Broadcast notification via SSE (don't await to avoid blocking)
    void broadcastNotificationToUser(
        notificationSSEManager,
        db,
        userId,
        notificationSlugId,
    );
}

interface InsertNewOpinionNotificationProps {
    db: PostgresJsDatabase;
    conversationAuthorId: string;
    opinionAuthorId: string;
    opinionId: number;
    conversationId: number;
    notificationSSEManager?: NotificationSSEManager;
}

/**
 * Create a notification for a new opinion on a conversation.
 * Returns the notification slug ID if a notification was created, undefined otherwise.
 * No notification is created if the opinion author is the same as the conversation author.
 */
export async function insertNewOpinionNotification({
    db,
    conversationAuthorId,
    opinionAuthorId,
    opinionId,
    conversationId,
    notificationSSEManager,
}: InsertNewOpinionNotificationProps): Promise<string | undefined> {
    // Don't create notification if user is commenting on their own conversation
    if (opinionAuthorId === conversationAuthorId) {
        return undefined;
    }

    const notificationSlugId = generateRandomSlugId();
    const notificationTableResponse = await db
        .insert(notificationTable)
        .values({
            slugId: notificationSlugId,
            userId: conversationAuthorId,
            notificationType: "new_opinion",
        })
        .returning({
            notificationId: notificationTable.id,
        });

    const notificationId = notificationTableResponse[0].notificationId;

    await db.insert(notificationNewOpinionTable).values({
        notificationId: notificationId,
        authorId: opinionAuthorId,
        opinionId: opinionId,
        conversationId: conversationId,
    });

    // Broadcast notification via SSE (don't await to avoid blocking)
    void broadcastNotificationToUser(
        notificationSSEManager,
        db,
        conversationAuthorId,
        notificationSlugId,
    );

    return notificationSlugId;
}
