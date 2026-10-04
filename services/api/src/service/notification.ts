import {
    conversationTable,
    conversationContentTable,
    conversationImportTable,
    emailTable,
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
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import type { FetchNotificationsResponse } from "@/shared/types/dto.js";
import type {
    ExportRouteTarget,
    ImportRouteTarget,
    RegularNotificationItem,
    SecurityAddEmailNotification,
} from "@/shared/types/zod.js";
import {
    and,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    lt,
    ne,
    notExists,
    or,
    type SQL,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import { generateRandomSlugId } from "@/crypto.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";
import {
    buildNotification,
    type NotificationContent,
} from "./notificationDto.js";

const addEmailSecurityKey = "add_email";

// Called only after a phone or Rarimo credential has been verified. Checking
// email on the writer keeps this cheap for accounts that already have one.
export async function ensureAddEmailSecurityNotification({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}): Promise<void> {
    const activeEmail = await db
        .select({ id: emailTable.id })
        .from(emailTable)
        .where(
            and(eq(emailTable.userId, userId), eq(emailTable.isDeleted, false)),
        )
        .limit(1);
    if (activeEmail.length > 0) return;

    const existingNotification = await db
        .select({ id: notificationTable.id })
        .from(notificationTable)
        .where(
            and(
                eq(notificationTable.userId, userId),
                eq(notificationTable.securityKey, addEmailSecurityKey),
            ),
        )
        .limit(1);
    if (existingNotification.length > 0) return;

    await db
        .insert(notificationTable)
        .values({
            slugId: generateRandomSlugId(),
            userId,
            notificationType: "security_add_email",
            securityKey: addEmailSecurityKey,
        })
        .onConflictDoNothing({
            target: [notificationTable.userId, notificationTable.securityKey],
        });
}

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
            .where(
                and(
                    eq(notificationTable.userId, userId),
                    ne(
                        notificationTable.notificationType,
                        "security_add_email",
                    ),
                ),
            );
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
    const notificationItemList: RegularNotificationItem[] = [];

    const stickyNotificationList: SecurityAddEmailNotification[] = [];

    if (lastSlugId === undefined) {
        const primaryDb = getPrimaryDatabase(db);
        const pendingSecurityNotifications = await primaryDb
            .select({
                slugId: notificationTable.slugId,
                createdAt: notificationTable.createdAt,
            })
            .from(notificationTable)
            .where(
                and(
                    eq(notificationTable.userId, userId),
                    eq(
                        notificationTable.notificationType,
                        "security_add_email",
                    ),
                    eq(notificationTable.securityKey, addEmailSecurityKey),
                    notExists(
                        primaryDb
                            .select({ id: emailTable.id })
                            .from(emailTable)
                            .where(
                                and(
                                    eq(emailTable.userId, userId),
                                    eq(emailTable.isDeleted, false),
                                ),
                            ),
                    ),
                ),
            )
            .limit(1);
        for (const notification of pendingSecurityNotifications) {
            stickyNotificationList.push({
                type: "security_add_email",
                slugId: notification.slugId,
                createdAt: notification.createdAt,
                isRead: false,
                isSticky: true,
                routeTarget: { type: "settings" },
            });
        }
    }

    const fetchLimit = 20;

    let numNewNotifications = 0;

    const lastCursor = await getNotificationSlugIdLastCursor({
        db,
        lastSlugId,
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
            and(
                eq(notificationTable.userId, userId),
                ne(notificationTable.notificationType, "security_add_email"),
                cursorFilter,
            ),
        )
        .orderBy(desc(notificationTable.createdAt), desc(notificationTable.id))
        .limit(fetchLimit);

    if (pageNotificationRows.length === 0) {
        return {
            numNewNotifications,
            notificationList: [],
            stickyNotificationList,
        };
    }

    const pageNotificationIds = pageNotificationRows.map((row) => row.id);
    const notificationOrderBySlugId = new Map(
        pageNotificationRows.map((row, index) => [row.slugId, index]),
    );

    const orderByClause = desc(notificationTable.createdAt);

    // Details queries are scoped to the already-paginated notification IDs so
    // mixed notification types cannot consume each other's page slots.
    function buildWhereClause(typeFilter: SQL) {
        return and(
            inArray(notificationTable.id, pageNotificationIds),
            typeFilter,
        );
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
            .innerJoin(
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
                const content: NotificationContent = {
                    type: "new_opinion",
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

                notificationItemList.push(
                    buildNotification({
                        content,
                        record: notificationItem,
                    }),
                );

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
            .innerJoin(
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
                const content: NotificationContent = {
                    type: "opinion_vote",
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
                    routeTarget: {
                        type: "opinion",
                        conversationSlugId: notificationItem.conversationSlugId,
                        opinionSlugId: notificationItem.opinionSlugId,
                    },
                    numVotes: notificationItem.numVotes,
                    isSeed: notificationItem.isSeed,
                };

                notificationItemList.push(
                    buildNotification({
                        content,
                        record: notificationItem,
                    }),
                );

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
                conversationTitle: notificationItem.conversationTitle,
                routeTarget: createExportRouteTarget({
                    conversationSlugId: notificationItem.conversationSlugId,
                    exportSlugId: notificationItem.exportSlugId,
                }),
            };

            let content: NotificationContent;

            switch (notificationItem.notificationType) {
                case "export_started":
                    content = {
                        ...baseNotification,
                        type: "export_started",
                    };
                    break;
                case "export_completed":
                    content = {
                        ...baseNotification,
                        type: "export_completed",
                    };
                    break;
                case "export_failed":
                    content = {
                        ...baseNotification,
                        type: "export_failed",
                        failureReason:
                            notificationItem.failureReason ?? undefined,
                    };
                    break;
                case "export_cancelled":
                    if (notificationItem.cancellationReason === null) {
                        log.error(
                            `Export cancellation notification ${notificationItem.slugId} has no cancellation reason`,
                        );
                        continue;
                    }
                    content = {
                        ...baseNotification,
                        type: "export_cancelled",
                        cancellationReason: notificationItem.cancellationReason,
                    };
                    break;
                default:
                    // Skip non-export notification types
                    continue;
            }

            notificationItemList.push(
                buildNotification({ content, record: notificationItem }),
            );

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

            let content: NotificationContent;

            switch (notificationItem.notificationType) {
                case "import_started":
                    content = {
                        type: "import_started",
                        routeTarget: {
                            type: "import",
                            importSlugId: notificationItem.importSlugId,
                        },
                    };
                    break;
                case "import_completed": {
                    const importCompletedRouteTarget: ImportRouteTarget = {
                        type: "import",
                        importSlugId: notificationItem.importSlugId,
                    };

                    if (notificationItem.conversationSlugId) {
                        importCompletedRouteTarget.conversationSlugId =
                            notificationItem.conversationSlugId;
                    }

                    content = {
                        type: "import_completed",
                        routeTarget: importCompletedRouteTarget,
                        conversationTitle:
                            notificationItem.conversationTitle ?? undefined,
                    };
                    break;
                }
                case "import_failed":
                    content = {
                        type: "import_failed",
                        routeTarget: {
                            type: "import",
                            importSlugId: notificationItem.importSlugId,
                        },
                        failureReason:
                            notificationItem.failureReason ?? undefined,
                    };
                    break;
                default:
                    // Skip non-import notification types
                    continue;
            }

            notificationItemList.push(
                buildNotification({ content, record: notificationItem }),
            );

            if (!notificationItem.isRead) {
                numNewNotifications += 1;
            }
        }
    }

    notificationItemList.sort(
        (a, b) =>
            (notificationOrderBySlugId.get(a.slugId) ??
                Number.MAX_SAFE_INTEGER) -
            (notificationOrderBySlugId.get(b.slugId) ??
                Number.MAX_SAFE_INTEGER),
    );

    return {
        numNewNotifications: numNewNotifications,
        notificationList: notificationItemList,
        stickyNotificationList,
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
    notification: Extract<NotificationContent, { type: "opinion_vote" }>;
    realtimeSSEManager?: RealtimeSSEManager;
}

async function createVoteNotification({
    db,
    userId,
    opinionId,
    conversationId,
    notification,
    realtimeSSEManager,
}: InsertNewVoteNotificationProps): Promise<void> {
    const notificationSlugId = generateRandomSlugId();
    const notificationItem = await getPrimaryDatabase(db).transaction(
        async (tx) => {
            const notificationTableResponse = await tx
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

            await tx.insert(notificationOpinionVoteTable).values({
                notificationId: insertedNotification.notificationId,
                opinionId: opinionId,
                conversationId: conversationId,
                numVotes: notification.numVotes,
                isSeed: notification.isSeed,
            });

            return buildNotification({
                content: notification,
                record: {
                    slugId: notificationSlugId,
                    createdAt: insertedNotification.createdAt,
                    isRead: insertedNotification.isRead,
                },
            });
        },
    );
    realtimeSSEManager?.broadcastToUser(userId, notificationItem);
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
    const notification: InsertNewVoteNotificationProps["notification"] = {
        type: "opinion_vote",
        message: useCommonPost().createCompactHtmlBody(opinionContent),
        routeTarget: {
            type: "opinion",
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
    notification: Extract<NotificationContent, { type: "new_opinion" }>;
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
}: CreateOpinionNotificationForUserProps): Promise<void> {
    const notificationSlugId = generateRandomSlugId();
    const notificationItem = await getPrimaryDatabase(db).transaction(
        async (tx) => {
            const notificationTableResponse = await tx
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

            await tx.insert(notificationNewOpinionTable).values({
                notificationId: insertedNotification.notificationId,
                authorId: opinionAuthorId,
                opinionId,
                conversationId,
            });

            return buildNotification({
                content: notification,
                record: {
                    slugId: notificationSlugId,
                    createdAt: insertedNotification.createdAt,
                    isRead: insertedNotification.isRead,
                },
            });
        },
    );
    realtimeSSEManager?.broadcastToUser(recipientUserId, notificationItem);
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
    const notification: CreateOpinionNotificationForUserProps["notification"] =
        {
            type: "new_opinion",
            message: useCommonPost().createCompactHtmlBody(opinionContent),
            username,
            routeTarget: {
                type: "opinion",
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
