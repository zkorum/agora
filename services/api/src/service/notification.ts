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
    organizationMembershipTable,
    projectOrganizationOwnershipTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { FetchNotificationsResponse } from "@/shared/types/dto.js";
import type {
    ExportRouteTarget,
    NotificationItem,
} from "@/shared/types/zod.js";
import { zodNotificationItem } from "@/shared/types/zod.js";
import {
    and,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    lt,
    or,
    type SQL,
} from "drizzle-orm";
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

interface GetNotificationSlugIdLastCursorProps {
    lastSlugId: string | undefined;
    db: PostgresJsDatabase;
    userId: string;
}

async function getNotificationSlugIdLastCursor({
    lastSlugId,
    db,
    userId,
}: GetNotificationSlugIdLastCursorProps): Promise<
    | {
          id: number;
          createdAt: Date;
      }
    | undefined
> {
    let lastCursor;

    if (lastSlugId) {
        const selectResponse = await db
            .select({
                id: notificationTable.id,
                createdAt: notificationTable.createdAt,
            })
            .from(notificationTable)
            .where(
                and(
                    eq(notificationTable.slugId, lastSlugId),
                    eq(notificationTable.userId, userId),
                ),
            );
        if (selectResponse.length == 1) {
            lastCursor = selectResponse[0];
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCursor;
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

    const lastCursor = await getNotificationSlugIdLastCursor({
        db: db,
        lastSlugId: lastSlugId,
        userId,
    });

    const cursorFilter =
        lastCursor === undefined
            ? undefined
            : or(
                  lt(notificationTable.createdAt, lastCursor.createdAt),
                  and(
                      eq(notificationTable.createdAt, lastCursor.createdAt),
                      lt(notificationTable.id, lastCursor.id),
                  ),
              );

    const pageNotificationRows = await db
        .select({
            id: notificationTable.id,
            slugId: notificationTable.slugId,
        })
        .from(notificationTable)
        .where(
            cursorFilter === undefined
                ? eq(notificationTable.userId, userId)
                : and(eq(notificationTable.userId, userId), cursorFilter),
        )
        .orderBy(desc(notificationTable.createdAt), desc(notificationTable.id))
        .limit(fetchLimit);

    if (pageNotificationRows.length === 0) {
        return { numNewNotifications, notificationList: [] };
    }

    const pageNotificationIds = pageNotificationRows.map((row) => row.id);
    const notificationOrderBySlugId = new Map(
        pageNotificationRows.map((row, index) => [row.slugId, index]),
    );

    const orderByClause = desc(notificationTable.createdAt);

    // Details queries are scoped to the already-paginated notification IDs so
    // mixed notification types cannot consume each other's page slots.
    function buildWhereClause(typeFilter: SQL) {
        return and(inArray(notificationTable.id, pageNotificationIds), typeFilter);
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
                eq(opinionContentTable.id, opinionTable.currentContentId),
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
                and(
                    buildWhereClause(
                        eq(notificationTable.notificationType, "new_opinion"),
                    ),
                    eq(conversationTable.isImporting, false),
                    isNotNull(conversationTable.currentContentId),
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
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .leftJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationOpinionVoteTable.conversationId,
                ),
            )
            .where(
                and(
                    buildWhereClause(
                        eq(notificationTable.notificationType, "opinion_vote"),
                    ),
                    eq(conversationTable.isImporting, false),
                    isNotNull(conversationTable.currentContentId),
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

    notificationItemList.sort(
        (a, b) =>
            (notificationOrderBySlugId.get(a.slugId) ?? Number.MAX_SAFE_INTEGER) -
            (notificationOrderBySlugId.get(b.slugId) ?? Number.MAX_SAFE_INTEGER),
    );

    return {
        numNewNotifications: numNewNotifications,
        notificationList: notificationItemList,
    };
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
            projectId: conversationTable.projectId,
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

    const { projectId } = conversationResult[0];
    const recipientSet = new Set<string>();
    const orgMembers = await db
        .select({
            userId: organizationMembershipTable.userId,
            organizationId: organizationMembershipTable.organizationId,
        })
        .from(projectOrganizationOwnershipTable)
        .innerJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        );

    for (const member of orgMembers) {
        recipientSet.add(member.userId);
    }

    const firstOrganizationId = orgMembers.at(0)?.organizationId ?? null;
    const firstRecipientId = orgMembers.at(0)?.userId ?? "";

    if (excludeUserIds) {
        for (const id of excludeUserIds) {
            recipientSet.delete(id);
        }
    }

    return {
        recipientUserIds: Array.from(recipientSet),
        conversationAuthorId: firstRecipientId,
        organizationId: firstOrganizationId,
    };
}

interface CreateVoteNotificationsProps {
    db: PostgresJsDatabase;
    recipientUserIds: string[];
    opinionId: number;
    conversationId: number;
    conversationSlugId: string;
    opinionSlugId: string;
    opinionContent: string;
    numVotes: number;
    isSeed: boolean;
    realtimeSSEManager?: RealtimeSSEManager;
}

interface InsertNewVoteNotificationProps {
    db: PostgresJsDatabase;
    userId: string;
    opinionId: number;
    conversationId: number;
    notification: Omit<
        Extract<NotificationItem, { type: "opinion_vote" }>,
        "slugId" | "createdAt" | "isRead"
    >;
    numVotes: number;
    isSeed: boolean;
    realtimeSSEManager?: RealtimeSSEManager;
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
    notification,
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
            createdAt: notificationTable.createdAt,
            isRead: notificationTable.isRead,
        });

    const insertedNotification = notificationTableResponse[0];

    await db.insert(notificationOpinionVoteTable).values({
        notificationId: insertedNotification.notificationId,
        opinionId: opinionId,
        conversationId: conversationId,
        numVotes: numVotes,
        isSeed: isSeed,
    });

    const notificationItem: NotificationItem = {
        ...notification,
        slugId: notificationSlugId,
        createdAt: insertedNotification.createdAt,
        isRead: insertedNotification.isRead,
    };

    const validationResult = zodNotificationItem.safeParse(notificationItem);
    if (validationResult.success) {
        realtimeSSEManager?.broadcastToUser(userId, validationResult.data);
    } else {
        log.error(
            validationResult.error,
            `Failed to validate vote notification ${notificationSlugId} before broadcast`,
        );
    }

    return notificationSlugId;
}

export async function createVoteNotifications({
    db,
    recipientUserIds,
    opinionId,
    conversationId,
    conversationSlugId,
    opinionSlugId,
    opinionContent,
    numVotes,
    isSeed,
    realtimeSSEManager,
}: CreateVoteNotificationsProps): Promise<void> {
    const notification = {
        type: "opinion_vote" as const,
        message: useCommonPost().createCompactHtmlBody(opinionContent),
        routeTarget: {
            type: "opinion" as const,
            conversationSlugId,
            opinionSlugId,
        },
        numVotes,
        isSeed,
    };

    for (const userId of recipientUserIds) {
        try {
            await createVoteNotification({
                db,
                userId,
                opinionId,
                conversationId,
                notification,
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
    notification: Omit<
        Extract<NotificationItem, { type: "new_opinion" }>,
        "slugId" | "createdAt" | "isRead"
    >;
    realtimeSSEManager?: RealtimeSSEManager;
}

async function createOpinionNotificationForUser({
    db,
    recipientUserId,
    opinionAuthorId,
    opinionId,
    conversationId,
    notification,
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
            createdAt: notificationTable.createdAt,
            isRead: notificationTable.isRead,
        });

    const insertedNotification = notificationTableResponse[0];

    await db.insert(notificationNewOpinionTable).values({
        notificationId: insertedNotification.notificationId,
        authorId: opinionAuthorId,
        opinionId,
        conversationId,
    });

    const notificationItem: NotificationItem = {
        ...notification,
        slugId: notificationSlugId,
        createdAt: insertedNotification.createdAt,
        isRead: insertedNotification.isRead,
    };

    const validationResult = zodNotificationItem.safeParse(notificationItem);
    if (validationResult.success) {
        realtimeSSEManager?.broadcastToUser(
            recipientUserId,
            validationResult.data,
        );
    } else {
        log.error(
            validationResult.error,
            `Failed to validate opinion notification ${notificationSlugId} before broadcast`,
        );
    }

    return notificationSlugId;
}

interface CreateOpinionNotificationsProps {
    db: PostgresJsDatabase;
    recipientUserIds: string[];
    opinionAuthorId: string;
    opinionId: number;
    conversationId: number;
    conversationSlugId: string;
    opinionSlugId: string;
    opinionContent: string;
    username: string;
    realtimeSSEManager?: RealtimeSSEManager;
}

export async function createOpinionNotifications({
    db,
    recipientUserIds,
    opinionAuthorId,
    opinionId,
    conversationId,
    conversationSlugId,
    opinionSlugId,
    opinionContent,
    username,
    realtimeSSEManager,
}: CreateOpinionNotificationsProps): Promise<void> {
    const notification = {
        type: "new_opinion" as const,
        message: useCommonPost().createCompactHtmlBody(opinionContent),
        username,
        routeTarget: {
            type: "opinion" as const,
            conversationSlugId,
            opinionSlugId,
        },
    };

    for (const recipientUserId of recipientUserIds) {
        try {
            await createOpinionNotificationForUser({
                db,
                recipientUserId,
                opinionAuthorId,
                opinionId,
                conversationId,
                notification,
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
