import {
    conversationTable,
    conversationContentTable,
    conversationImportTable,
    notificationNewOpinionTable,
    notificationOpinionVoteTable,
    notificationExportTable,
    notificationImportTable,
    opinionContentTable,
    opinionTable,
    notificationTable,
    userTable,
    userOrganizationMappingTable,
} from "@/shared-backend/schema.js";
import type { FetchNotificationsResponse } from "@/shared/types/dto.js";
import type { ExportRouteTarget, NotificationItem } from "@/shared/types/zod.js";
import { zodNotificationItem } from "@/shared/types/zod.js";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import { generateRandomSlugId } from "@/crypto.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";

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

function createExportRouteTarget({
    conversationSlugId,
    exportSlugId,
}: {
    conversationSlugId: string;
    exportSlugId: string;
}): ExportRouteTarget {
    return {
        type: "export",
        conversationSlugId,
        exportSlugId,
    };
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

    const orderByClause = desc(notificationTable.createdAt);

    // Build per-type WHERE clauses to ensure LIMIT only counts rows of the
    // correct notification type. Without a type filter, the LIMIT can be filled
    // by wrong-type notifications (which are then skipped by NULL checks),
    // causing valid notifications and their unread counts to be missed.
    function buildWhereClause(
        typeFilter: ReturnType<typeof eq>,
    ) {
        return lastSlugId
            ? and(
                  eq(notificationTable.userId, userId),
                  lt(notificationTable.createdAt, lastCreatedAt),
                  typeFilter,
              )
            : and(eq(notificationTable.userId, userId), typeFilter);
    }

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
            .where(
                buildWhereClause(
                    eq(
                        notificationTable.notificationType,
                        "new_opinion",
                    ),
                ),
            )
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
                isSeed: notificationOpinionVoteTable.isSeed,
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
            .where(
                buildWhereClause(
                    eq(
                        notificationTable.notificationType,
                        "opinion_vote",
                    ),
                ),
            )
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
                    isSeed: notificationItem.isSeed ?? false,
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
                exportSlugId: notificationExportTable.exportSlugId,
                failureReason: notificationExportTable.failureReason,
                cancellationReason: notificationExportTable.cancellationReason,
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
            .where(
                buildWhereClause(
                    inArray(notificationTable.notificationType, [
                        "export_started",
                        "export_completed",
                        "export_failed",
                        "export_cancelled",
                    ]),
                ),
            )
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
                routeTarget: createExportRouteTarget({
                    conversationSlugId: notificationItem.conversationSlugId,
                    exportSlugId: notificationItem.exportSlugId,
                }),
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
                conversationTitle: conversationContentTable.title,
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
            .leftJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .where(
                buildWhereClause(
                    inArray(notificationTable.notificationType, [
                        "import_started",
                        "import_completed",
                        "import_failed",
                    ]),
                ),
            )
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
                case "import_completed": {
                    const importCompletedRouteTarget: {
                        type: "import";
                        importSlugId: string;
                        conversationSlugId?: string;
                    } = {
                        type: "import",
                        importSlugId: notificationItem.importSlugId,
                    };

                    if (notificationItem.conversationSlugId) {
                        importCompletedRouteTarget.conversationSlugId =
                            notificationItem.conversationSlugId;
                    }

                    parsedItem = {
                        ...baseNotification,
                        type: "import_completed",
                        routeTarget: importCompletedRouteTarget,
                        conversationTitle:
                            notificationItem.conversationTitle ?? undefined,
                    };
                    break;
                }
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
): Promise<NotificationItem | null> {
    try {
        const result = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                notificationType: notificationTable.notificationType,
                conversationSlugId: conversationTable.slugId,
                conversationTitle: conversationContentTable.title,
                exportSlugId: notificationExportTable.exportSlugId,
                failureReason: notificationExportTable.failureReason,
                cancellationReason: notificationExportTable.cancellationReason,
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
                conversationTable,
                eq(conversationTable.id, notificationExportTable.conversationId),
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
            routeTarget: createExportRouteTarget({
                conversationSlugId,
                exportSlugId,
            }),
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
    isSeed: boolean,
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
                isSeed: isSeed,
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

interface GetNotificationRecipientsProps {
    db: PostgresJsDatabase;
    conversationId: number;
    excludeUserIds?: string[];
}

interface NotificationRecipients {
    recipientUserIds: string[];
    conversationAuthorId: string;
    organizationId: number | null;
}

export async function getNotificationRecipients({
    db,
    conversationId,
    excludeUserIds,
}: GetNotificationRecipientsProps): Promise<NotificationRecipients> {
    const conversationResult = await db
        .select({
            authorId: conversationTable.authorId,
            organizationId: conversationTable.organizationId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .limit(1);

    if (conversationResult.length === 0) {
        return {
            recipientUserIds: [],
            conversationAuthorId: "",
            organizationId: null,
        };
    }

    const { authorId, organizationId } = conversationResult[0];
    const recipientSet = new Set<string>([authorId]);

    if (organizationId !== null) {
        const orgMembers = await db
            .select({ userId: userOrganizationMappingTable.userId })
            .from(userOrganizationMappingTable)
            .where(
                eq(
                    userOrganizationMappingTable.organizationId,
                    organizationId,
                ),
            );
        for (const member of orgMembers) {
            recipientSet.add(member.userId);
        }
    }

    if (excludeUserIds) {
        for (const id of excludeUserIds) {
            recipientSet.delete(id);
        }
    }

    return {
        recipientUserIds: Array.from(recipientSet),
        conversationAuthorId: authorId,
        organizationId,
    };
}

interface CreateVoteNotificationsProps {
    db: PostgresJsDatabase;
    recipientUserIds: string[];
    opinionId: number;
    conversationId: number;
    numVotes: number;
    isSeed: boolean;
    realtimeSSEManager?: RealtimeSSEManager;
}

interface InsertNewVoteNotificationProps {
    db: PostgresJsDatabase;
    userId: string;
    opinionId: number;
    conversationId: number;
    numVotes: number;
    isSeed: boolean;
    realtimeSSEManager?: RealtimeSSEManager;
}

/**
 * Broadcast a vote notification to a user via SSE
 * Builds notification directly from data and validates before broadcasting
 */
async function broadcastVoteNotification(
    realtimeSSEManager: RealtimeSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
    opinionId: number,
    conversationId: number,
    numVotes: number,
    isSeed: boolean,
): Promise<void> {
    if (!realtimeSSEManager) {
        return;
    }

    try {
        const notification = await buildVoteNotification(
            db,
            notificationSlugId,
            opinionId,
            conversationId,
            numVotes,
            isSeed,
        );

        if (notification) {
            // Validate notification before broadcasting
            const validationResult =
                zodNotificationItem.safeParse(notification);
            if (validationResult.success) {
                realtimeSSEManager.broadcastToUser(
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
    realtimeSSEManager: RealtimeSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
    opinionId: number,
    conversationId: number,
    opinionAuthorId: string,
): Promise<void> {
    if (!realtimeSSEManager) {
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
                realtimeSSEManager.broadcastToUser(
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
    realtimeSSEManager: RealtimeSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
): Promise<void> {
    if (!realtimeSSEManager) {
        return;
    }

    try {
        const notification = await buildExportNotification(db, notificationSlugId);

        if (notification) {
            // Validate notification before broadcasting
            const validationResult =
                zodNotificationItem.safeParse(notification);
            if (validationResult.success) {
                realtimeSSEManager.broadcastToUser(
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

        // Fetch conversation slug and title separately if conversationId exists
        let conversationSlugId: string | null = null;
        let conversationTitle: string | null = null;
        if (conversationId !== null) {
            const convResult = await db
                .select({
                    slugId: conversationTable.slugId,
                    title: conversationContentTable.title,
                })
                .from(conversationTable)
                .leftJoin(
                    conversationContentTable,
                    eq(
                        conversationContentTable.id,
                        conversationTable.currentContentId,
                    ),
                )
                .where(eq(conversationTable.id, conversationId))
                .limit(1);
            if (convResult.length === 1) {
                conversationSlugId = convResult[0].slugId;
                conversationTitle = convResult[0].title;
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
                    conversationTitle: conversationTitle ?? undefined,
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
    realtimeSSEManager: RealtimeSSEManager | undefined,
    db: PostgresJsDatabase,
    userId: string,
    notificationSlugId: string,
    importId: number,
    conversationId: number | null,
): Promise<void> {
    if (!realtimeSSEManager) {
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
                realtimeSSEManager.broadcastToUser(
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
async function createVoteNotification({
    db,
    userId,
    opinionId,
    conversationId,
    numVotes,
    isSeed,
    realtimeSSEManager,
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
        isSeed: isSeed,
    });

    // Broadcast notification via SSE (don't await to avoid blocking)
    void broadcastVoteNotification(
        realtimeSSEManager,
        db,
        userId,
        notificationSlugId,
        opinionId,
        conversationId,
        numVotes,
        isSeed,
    );

    return notificationSlugId;
}

export async function createVoteNotifications({
    db,
    recipientUserIds,
    opinionId,
    conversationId,
    numVotes,
    isSeed,
    realtimeSSEManager,
}: CreateVoteNotificationsProps): Promise<void> {
    for (const userId of recipientUserIds) {
        try {
            await createVoteNotification({
                db,
                userId,
                opinionId,
                conversationId,
                numVotes,
                isSeed,
                realtimeSSEManager,
            });
        } catch (error) {
            log.error(
                error,
                `Failed to create vote notification for user ${userId}`,
            );
        }
    }
}

interface CreateOpinionNotificationForUserProps {
    db: PostgresJsDatabase;
    recipientUserId: string;
    opinionAuthorId: string;
    opinionId: number;
    conversationId: number;
    realtimeSSEManager?: RealtimeSSEManager;
}

async function createOpinionNotificationForUser({
    db,
    recipientUserId,
    opinionAuthorId,
    opinionId,
    conversationId,
    realtimeSSEManager,
}: CreateOpinionNotificationForUserProps): Promise<string> {
    const notificationSlugId = generateRandomSlugId();
    const notificationTableResponse = await db
        .insert(notificationTable)
        .values({
            slugId: notificationSlugId,
            userId: recipientUserId,
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
        realtimeSSEManager,
        db,
        recipientUserId,
        notificationSlugId,
        opinionId,
        conversationId,
        opinionAuthorId,
    );

    return notificationSlugId;
}

interface CreateOpinionNotificationsProps {
    db: PostgresJsDatabase;
    recipientUserIds: string[];
    opinionAuthorId: string;
    opinionId: number;
    conversationId: number;
    realtimeSSEManager?: RealtimeSSEManager;
}

export async function createOpinionNotifications({
    db,
    recipientUserIds,
    opinionAuthorId,
    opinionId,
    conversationId,
    realtimeSSEManager,
}: CreateOpinionNotificationsProps): Promise<void> {
    for (const recipientUserId of recipientUserIds) {
        try {
            await createOpinionNotificationForUser({
                db,
                recipientUserId,
                opinionAuthorId,
                opinionId,
                conversationId,
                realtimeSSEManager,
            });
        } catch (error) {
            log.error(
                error,
                `Failed to create opinion notification for user ${recipientUserId}`,
            );
        }
    }
}
