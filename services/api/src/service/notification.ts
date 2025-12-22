import {
    conversationTable,
    conversationContentTable,
    conversationExportTable,
    conversationImportTable,
    notificationNewOpinionTable,
    notificationOpinionVoteTable,
    notificationExportTable,
    notificationImportTable,
    opinionContentTable,
    opinionTable,
    notificationTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { FetchNotificationsResponse } from "@/shared/types/dto.js";
import type { NotificationItem } from "@/shared/types/zod.js";
import { zodNotificationItem } from "@/shared/types/zod.js";
import { and, desc, eq, lt } from "drizzle-orm";
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

    const whereClause = lastSlugId
        ? and(
              eq(notificationTable.userId, userId),
              lt(notificationTable.createdAt, lastCreatedAt),
          )
        : eq(notificationTable.userId, userId);

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
                failureReason: conversationExportTable.failureReason,
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

        for (const notificationItem of notificationTableResponse) {
            if (
                !notificationItem.conversationSlugId ||
                !notificationItem.conversationTitle ||
                !notificationItem.exportSlugId
            ) {
                continue;
            }

            const baseNotification = {
                slugId: notificationItem.slugId,
                createdAt: notificationItem.createdAt,
                isRead: notificationItem.isRead,
                routeTarget: {
                    type: "export" as const,
                    conversationSlugId: notificationItem.conversationSlugId,
                    exportSlugId: notificationItem.exportSlugId,
                },
            };

            let parsedItem: NotificationItem | null = null;

            switch (notificationItem.notificationType) {
                case "export_started":
                    parsedItem = {
                        ...baseNotification,
                        type: "export_started",
                        conversationTitle: notificationItem.conversationTitle,
                    };
                    break;
                case "export_completed":
                    parsedItem = {
                        ...baseNotification,
                        type: "export_completed",
                        conversationTitle: notificationItem.conversationTitle,
                    };
                    break;
                case "export_failed":
                    parsedItem = {
                        ...baseNotification,
                        type: "export_failed",
                        conversationTitle: notificationItem.conversationTitle,
                        ...(notificationItem.failureReason && {
                            failureReason: notificationItem.failureReason,
                        }),
                    };
                    break;
                case "export_cancelled":
                    parsedItem = {
                        ...baseNotification,
                        type: "export_cancelled",
                        conversationTitle: notificationItem.conversationTitle,
                        cancellationReason:
                            notificationItem.cancellationReason ??
                            "Export was cancelled",
                    };
                    break;
                default:
                    // Skip non-export notification types
                    continue;
            }

            notificationItemList.push(parsedItem);

            if (!notificationItem.isRead) {
                numNewNotifications += 1;
            }
        }
    }

    // Fetch import notifications
    {
        const notificationTableResponse = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                notificationType: notificationTable.notificationType,
                importSlugId: conversationImportTable.slugId,
                conversationSlugId: conversationTable.slugId,
                failureReason: conversationImportTable.failureReason,
                slugId: notificationTable.slugId,
            })
            .from(notificationTable)
            .leftJoin(
                notificationImportTable,
                eq(
                    notificationImportTable.notificationId,
                    notificationTable.id,
                ),
            )
            .leftJoin(
                conversationImportTable,
                eq(
                    conversationImportTable.id,
                    notificationImportTable.importId,
                ),
            )
            .leftJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationImportTable.conversationId,
                ),
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(fetchLimit);

        for (const notificationItem of notificationTableResponse) {
            if (!notificationItem.importSlugId) {
                continue;
            }

            const baseNotification = {
                slugId: notificationItem.slugId,
                createdAt: notificationItem.createdAt,
                isRead: notificationItem.isRead,
            };

            let parsedItem: NotificationItem | null = null;

            switch (notificationItem.notificationType) {
                case "import_started":
                    parsedItem = {
                        ...baseNotification,
                        type: "import_started",
                        routeTarget: {
                            type: "import",
                            importSlugId: notificationItem.importSlugId,
                        },
                    };
                    break;
                case "import_completed":
                    parsedItem = {
                        ...baseNotification,
                        type: "import_completed",
                        routeTarget: {
                            type: "import",
                            importSlugId: notificationItem.importSlugId,
                            ...(notificationItem.conversationSlugId && {
                                conversationSlugId:
                                    notificationItem.conversationSlugId,
                            }),
                        },
                    };
                    break;
                case "import_failed":
                    parsedItem = {
                        ...baseNotification,
                        type: "import_failed",
                        routeTarget: {
                            type: "import",
                            importSlugId: notificationItem.importSlugId,
                        },
                        ...(notificationItem.failureReason && {
                            failureReason: notificationItem.failureReason,
                        }),
                    };
                    break;
                default:
                    // Skip non-import notification types
                    continue;
            }

            notificationItemList.push(parsedItem);

            if (!notificationItem.isRead) {
                numNewNotifications += 1;
            }
        }
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
                failureReason: conversationExportTable.failureReason,
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

        if (result.length !== 1) {
            return null;
        }

        const data = result[0];
        const { conversationSlugId, conversationTitle, exportSlugId } = data;

        if (!conversationSlugId || !conversationTitle || !exportSlugId) {
            return null;
        }

        const baseNotification = {
            slugId: notificationSlugId,
            createdAt: data.createdAt,
            isRead: data.isRead,
            routeTarget: {
                type: "export" as const,
                conversationSlugId,
                exportSlugId,
            },
        };

        switch (data.notificationType) {
            case "export_started":
                return {
                    ...baseNotification,
                    type: "export_started",
                    conversationTitle,
                };
            case "export_completed":
                return {
                    ...baseNotification,
                    type: "export_completed",
                    conversationTitle,
                };
            case "export_failed":
                return {
                    ...baseNotification,
                    type: "export_failed",
                    conversationTitle,
                    ...(data.failureReason && {
                        failureReason: data.failureReason,
                    }),
                };
            case "export_cancelled":
                return {
                    ...baseNotification,
                    type: "export_cancelled",
                    conversationTitle,
                    cancellationReason:
                        data.cancellationReason ?? "Export was cancelled",
                };
            default:
                return null;
        }
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
                createdAt: result[0].createdAt,
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
                createdAt: result[0].createdAt,
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
 * Helper function to build an import notification from database data
 * Fetches only the necessary data for a single notification
 */
async function buildImportNotification(
    db: PostgresJsDatabase,
    notificationSlugId: string,
    importId: number,
    conversationId: number | null,
): Promise<NotificationItem | null> {
    try {
        // Build base query without conversation join
        const baseQuery = db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                notificationType: notificationTable.notificationType,
                importSlugId: conversationImportTable.slugId,
                failureReason: conversationImportTable.failureReason,
            })
            .from(notificationTable)
            .leftJoin(
                conversationImportTable,
                eq(conversationImportTable.id, importId),
            )
            .where(eq(notificationTable.slugId, notificationSlugId))
            .limit(1);

        const baseResult = await baseQuery;

        if (baseResult.length !== 1) {
            return null;
        }

        const baseData = baseResult[0];

        // Fetch conversation slug separately if conversationId exists
        let conversationSlugId: string | null = null;
        if (conversationId !== null) {
            const convResult = await db
                .select({ slugId: conversationTable.slugId })
                .from(conversationTable)
                .where(eq(conversationTable.id, conversationId))
                .limit(1);
            if (convResult.length === 1) {
                conversationSlugId = convResult[0].slugId;
            }
        }

        const { importSlugId, failureReason } = baseData;

        if (!importSlugId) {
            return null;
        }

        const baseNotification = {
            slugId: notificationSlugId,
            createdAt: baseData.createdAt,
            isRead: baseData.isRead,
        };

        switch (baseData.notificationType) {
            case "import_started":
                return {
                    ...baseNotification,
                    type: "import_started",
                    routeTarget: {
                        type: "import",
                        importSlugId,
                    },
                };
            case "import_completed":
                return {
                    ...baseNotification,
                    type: "import_completed",
                    routeTarget: {
                        type: "import",
                        importSlugId,
                        conversationSlugId: conversationSlugId ?? undefined,
                    },
                };
            case "import_failed":
                return {
                    ...baseNotification,
                    type: "import_failed",
                    routeTarget: {
                        type: "import",
                        importSlugId,
                    },
                    ...(failureReason && { failureReason }),
                };
            default:
                return null;
        }
    } catch (error) {
        log.error(
            error,
            `Failed to build import notification ${notificationSlugId}`,
        );
        return null;
    }
}

/**
 * Broadcast an import notification to a user via SSE
 * Builds notification directly from data and validates before broadcasting
 */
export async function broadcastImportNotification(
    notificationSSEManager: NotificationSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
    importId: number,
    conversationId: number | null,
): Promise<void> {
    if (!notificationSSEManager) {
        return;
    }

    try {
        const notification = await buildImportNotification(
            db,
            notificationSlugId,
            importId,
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
                    `Failed to validate import notification ${notificationSlugId} before broadcast`,
                );
            }
        }
    } catch (error) {
        log.error(
            error,
            `Failed to broadcast import notification ${notificationSlugId} to user ${userId}`,
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
