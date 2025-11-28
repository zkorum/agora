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
import { zodNotificationItem } from "@/shared/types/zod.js";
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
                    createdAt: notificationItem.createdAt.toISOString(),
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
                    createdAt: notificationItem.createdAt.toISOString(),
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
                        createdAt: notificationItem.createdAt.toISOString(),
                        isRead: notificationItem.isRead,
                        message: `"${notificationItem.conversationTitle}"`,
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
                        createdAt: notificationItem.createdAt.toISOString(),
                        isRead: notificationItem.isRead,
                        message: notificationItem.errorMessage
                            ? `${notificationItem.errorMessage}`
                            : `"${notificationItem.conversationTitle}"`,
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
                        createdAt: notificationItem.createdAt.toISOString(),
                        isRead: notificationItem.isRead,
                        message: notificationItem.cancellationReason
                            ? `${notificationItem.cancellationReason}`
                            : `"${notificationItem.conversationTitle}"`,
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
        return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    });

    return {
        numNewNotifications: numNewNotifications,
        notificationList: notificationItemList,
    };
}

/**
 * Helper function to build an export notification from database data
 * Fetches only the necessary data for a single notification
 */
async function buildExportNotification(
    db: PostgresJsDatabase,
    notificationSlugId: string,
    exportId: number,
    conversationId: number,
): Promise<NotificationItem | null> {
    try {
        const result = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                notificationType: notificationTable.notificationType,
                conversationSlugId: conversationTable.slugId,
                conversationTitle: conversationContentTable.title,
                exportSlugId: conversationExportTable.slugId,
                errorMessage: conversationExportTable.errorMessage,
                cancellationReason: conversationExportTable.cancellationReason,
            })
            .from(notificationTable)
            .leftJoin(
                conversationExportTable,
                eq(conversationExportTable.id, exportId),
            )
            .leftJoin(
                conversationTable,
                eq(conversationTable.id, conversationId),
            )
            .leftJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .where(eq(notificationTable.slugId, notificationSlugId))
            .limit(1);

        if (
            result.length === 1 &&
            result[0].conversationSlugId &&
            result[0].conversationTitle &&
            result[0].exportSlugId &&
            (result[0].notificationType === "export_completed" ||
                result[0].notificationType === "export_failed" ||
                result[0].notificationType === "export_cancelled")
        ) {
            // Construct notification based on type
            if (result[0].notificationType === "export_completed") {
                return {
                    type: "export_completed",
                    slugId: notificationSlugId,
                    createdAt: result[0].createdAt.toISOString(),
                    isRead: result[0].isRead,
                    message: `"${result[0].conversationTitle}"`,
                    routeTarget: {
                        type: "export",
                        conversationSlugId: result[0].conversationSlugId,
                        exportSlugId: result[0].exportSlugId,
                    },
                };
            } else if (result[0].notificationType === "export_failed") {
                return {
                    type: "export_failed",
                    slugId: notificationSlugId,
                    createdAt: result[0].createdAt.toISOString(),
                    isRead: result[0].isRead,
                    message: result[0].errorMessage
                        ? `${result[0].errorMessage}`
                        : `"${result[0].conversationTitle}"`,
                    routeTarget: {
                        type: "export",
                        conversationSlugId: result[0].conversationSlugId,
                        exportSlugId: result[0].exportSlugId,
                    },
                    ...(result[0].errorMessage && {
                        errorMessage: result[0].errorMessage,
                    }),
                };
            } else if (result[0].notificationType === "export_cancelled") {
                return {
                    type: "export_cancelled",
                    slugId: notificationSlugId,
                    createdAt: result[0].createdAt.toISOString(),
                    isRead: result[0].isRead,
                    message: result[0].cancellationReason
                        ? `${result[0].cancellationReason}`
                        : `"${result[0].conversationTitle}"`,
                    routeTarget: {
                        type: "export",
                        conversationSlugId: result[0].conversationSlugId,
                        exportSlugId: result[0].exportSlugId,
                    },
                    cancellationReason:
                        result[0].cancellationReason || "Export was cancelled",
                };
            }
        }
        return null;
    } catch (error) {
        log.error(
            error,
            `Failed to build export notification ${notificationSlugId}`,
        );
        return null;
    }
}

/**
 * Helper function to build an opinion vote notification from database data
 * Fetches only the necessary data for a single notification
 */
async function buildVoteNotification(
    db: PostgresJsDatabase,
    notificationSlugId: string,
    opinionId: number,
    conversationId: number,
    numVotes: number,
): Promise<NotificationItem | null> {
    try {
        const result = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                opinionContent: opinionContentTable.content,
            })
            .from(notificationTable)
            .leftJoin(opinionTable, eq(opinionTable.id, opinionId))
            .leftJoin(
                opinionContentTable,
                eq(opinionContentTable.opinionId, opinionId),
            )
            .leftJoin(
                conversationTable,
                eq(conversationTable.id, conversationId),
            )
            .where(eq(notificationTable.slugId, notificationSlugId))
            .limit(1);

        if (
            result.length === 1 &&
            result[0].conversationSlugId &&
            result[0].opinionSlugId &&
            result[0].opinionContent
        ) {
            return {
                type: "opinion_vote",
                slugId: notificationSlugId,
                createdAt: result[0].createdAt.toISOString(),
                isRead: result[0].isRead,
                message: useCommonPost().createCompactHtmlBody(
                    result[0].opinionContent,
                ),
                routeTarget: {
                    type: "opinion",
                    conversationSlugId: result[0].conversationSlugId,
                    opinionSlugId: result[0].opinionSlugId,
                },
                numVotes: numVotes,
            };
        }
        return null;
    } catch (error) {
        log.error(
            error,
            `Failed to build vote notification ${notificationSlugId}`,
        );
        return null;
    }
}

/**
 * Helper function to build a new opinion notification from database data
 * Fetches only the necessary data for a single notification
 */
async function buildOpinionNotification(
    db: PostgresJsDatabase,
    notificationSlugId: string,
    opinionId: number,
    conversationId: number,
    opinionAuthorId: string,
): Promise<NotificationItem | null> {
    try {
        const result = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                opinionContent: opinionContentTable.content,
                username: userTable.username,
            })
            .from(notificationTable)
            .leftJoin(opinionTable, eq(opinionTable.id, opinionId))
            .leftJoin(
                opinionContentTable,
                eq(opinionContentTable.opinionId, opinionId),
            )
            .leftJoin(
                conversationTable,
                eq(conversationTable.id, conversationId),
            )
            .leftJoin(userTable, eq(userTable.id, opinionAuthorId))
            .where(eq(notificationTable.slugId, notificationSlugId))
            .limit(1);

        if (
            result.length === 1 &&
            result[0].conversationSlugId &&
            result[0].opinionSlugId &&
            result[0].opinionContent &&
            result[0].username
        ) {
            return {
                type: "new_opinion",
                slugId: notificationSlugId,
                createdAt: result[0].createdAt.toISOString(),
                isRead: result[0].isRead,
                message: useCommonPost().createCompactHtmlBody(
                    result[0].opinionContent,
                ),
                username: result[0].username,
                routeTarget: {
                    type: "opinion",
                    conversationSlugId: result[0].conversationSlugId,
                    opinionSlugId: result[0].opinionSlugId,
                },
            };
        }
        return null;
    } catch (error) {
        log.error(
            error,
            `Failed to build opinion notification ${notificationSlugId}`,
        );
        return null;
    }
}

interface InsertNewVoteNotificationProps {
    db: PostgresJsDatabase;
    userId: string;
    opinionId: number;
    conversationId: number;
    numVotes: number;
    notificationSSEManager?: NotificationSSEManager;
}

/**
 * Broadcast a vote notification to a user via SSE
 * Builds notification directly from data and validates before broadcasting
 */
async function broadcastVoteNotification(
    notificationSSEManager: NotificationSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
    opinionId: number,
    conversationId: number,
    numVotes: number,
): Promise<void> {
    if (!notificationSSEManager) {
        return;
    }

    try {
        const notification = await buildVoteNotification(
            db,
            notificationSlugId,
            opinionId,
            conversationId,
            numVotes,
        );

        if (notification) {
            // Validate notification before broadcasting
            const validationResult =
                zodNotificationItem.safeParse(notification);
            if (validationResult.success) {
                notificationSSEManager.broadcastToUser(
                    userId,
                    validationResult.data,
                );
            } else {
                log.error(
                    validationResult.error,
                    `Failed to validate vote notification ${notificationSlugId} before broadcast`,
                );
            }
        }
    } catch (error) {
        log.error(
            error,
            `Failed to broadcast vote notification ${notificationSlugId} to user ${userId}`,
        );
    }
}

/**
 * Broadcast an opinion notification to a user via SSE
 * Builds notification directly from data and validates before broadcasting
 */
async function broadcastOpinionNotification(
    notificationSSEManager: NotificationSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
    opinionId: number,
    conversationId: number,
    opinionAuthorId: string,
): Promise<void> {
    if (!notificationSSEManager) {
        return;
    }

    try {
        const notification = await buildOpinionNotification(
            db,
            notificationSlugId,
            opinionId,
            conversationId,
            opinionAuthorId,
        );

        if (notification) {
            // Validate notification before broadcasting
            const validationResult =
                zodNotificationItem.safeParse(notification);
            if (validationResult.success) {
                notificationSSEManager.broadcastToUser(
                    userId,
                    validationResult.data,
                );
            } else {
                log.error(
                    validationResult.error,
                    `Failed to validate opinion notification ${notificationSlugId} before broadcast`,
                );
            }
        }
    } catch (error) {
        log.error(
            error,
            `Failed to broadcast opinion notification ${notificationSlugId} to user ${userId}`,
        );
    }
}

/**
 * Broadcast an export notification to a user via SSE
 * Builds notification directly from data and validates before broadcasting
 */
export async function broadcastExportNotification(
    notificationSSEManager: NotificationSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
    exportId: number,
    conversationId: number,
): Promise<void> {
    if (!notificationSSEManager) {
        return;
    }

    try {
        const notification = await buildExportNotification(
            db,
            notificationSlugId,
            exportId,
            conversationId,
        );

        if (notification) {
            // Validate notification before broadcasting
            const validationResult =
                zodNotificationItem.safeParse(notification);
            if (validationResult.success) {
                notificationSSEManager.broadcastToUser(
                    userId,
                    validationResult.data,
                );
            } else {
                log.error(
                    validationResult.error,
                    `Failed to validate export notification ${notificationSlugId} before broadcast`,
                );
            }
        }
    } catch (error) {
        log.error(
            error,
            `Failed to broadcast export notification ${notificationSlugId} to user ${userId}`,
        );
    }
}

/**
 * Create a vote notification and broadcast it via SSE
 * Returns the notification slug ID
 */
export async function createVoteNotification({
    db,
    userId,
    opinionId,
    conversationId,
    numVotes,
    notificationSSEManager,
}: InsertNewVoteNotificationProps): Promise<string> {
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
    void broadcastVoteNotification(
        notificationSSEManager,
        db,
        userId,
        notificationSlugId,
        opinionId,
        conversationId,
        numVotes,
    );

    return notificationSlugId;
}

interface CreateOpinionNotificationProps {
    db: PostgresJsDatabase;
    conversationAuthorId: string;
    opinionAuthorId: string;
    opinionId: number;
    conversationId: number;
    notificationSSEManager?: NotificationSSEManager;
}

/**
 * Create a notification for a new opinion on a conversation and broadcast it via SSE
 * Returns the notification slug ID if a notification was created, undefined otherwise
 * No notification is created if the opinion author is the same as the conversation author
 */
export async function createOpinionNotification({
    db,
    conversationAuthorId,
    opinionAuthorId,
    opinionId,
    conversationId,
    notificationSSEManager,
}: CreateOpinionNotificationProps): Promise<string | undefined> {
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
    void broadcastOpinionNotification(
        notificationSSEManager,
        db,
        conversationAuthorId,
        notificationSlugId,
        opinionId,
        conversationId,
        opinionAuthorId,
    );

    return notificationSlugId;
}
