import {
    conversationTable,
    notificationMessageNewOpinionTable,
    notificationMessageOpinionAgreementTable,
    opinionContentTable,
    opinionTable,
    userNotificationTable,
    userTable,
} from "@/schema.js";
import type { FetchUserNotificationsResponse } from "@/shared/types/dto.js";
import type { NotificationItem } from "@/shared/types/zod.js";
import { and, desc, eq, lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";

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
            .update(userNotificationTable)
            .set({
                isRead: true,
            })
            .where(eq(userNotificationTable.userId, userId));
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
            .select({ createdAt: userNotificationTable.createdAt })
            .from(userNotificationTable)
            .where(eq(userNotificationTable.slugId, lastSlugId));
        if (selectResponse.length == 1) {
            lastCreatedAt = selectResponse[0].createdAt;
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCreatedAt;
}

interface GetUserNotificationsProps {
    db: PostgresJsDatabase;
    userId: string;
    lastSlugId: string | undefined;
}

export async function getUserNotifications({
    db,
    userId,
    lastSlugId,
}: GetUserNotificationsProps): Promise<FetchUserNotificationsResponse> {
    const notificationItemList: NotificationItem[] = [];

    const fetchLimit = 10;

    let numNewNotifications = 0;

    const lastCreatedAt = await getNotificationSlugIdLastCreatedAt({
        db: db,
        lastSlugId: lastSlugId,
    });

    const whereClause = and(
        eq(userNotificationTable.userId, userId),
        lt(userNotificationTable.createdAt, lastCreatedAt),
    );

    const orderByClause = desc(userNotificationTable.createdAt);

    {
        const userNotificationTableResponse = await db
            .select({
                createdAt: userNotificationTable.createdAt,
                isRead: userNotificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                username: userTable.username,
                opinionContent: opinionContentTable.content,
                slugId: userNotificationTable.slugId,
            })
            .from(userNotificationTable)
            .leftJoin(
                notificationMessageNewOpinionTable,
                eq(
                    notificationMessageNewOpinionTable.userNotificationId,
                    userNotificationTable.id,
                ),
            )
            .leftJoin(
                opinionTable,
                eq(
                    opinionTable.id,
                    notificationMessageNewOpinionTable.opinionId,
                ),
            )
            .leftJoin(
                opinionContentTable,
                eq(opinionContentTable.opinionId, opinionTable.id),
            )
            .leftJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationMessageNewOpinionTable.conversationId,
                ),
            )
            .leftJoin(
                userTable,
                eq(userTable.id, notificationMessageNewOpinionTable.userId),
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(fetchLimit);

        userNotificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.opinionSlugId &&
                notificationItem.username &&
                notificationItem.opinionContent
            ) {
                const parsedItem: NotificationItem = {
                    slugId: notificationItem.slugId,
                    title: `${notificationItem.username} added an opinion to your conversation:`,
                    createdAt: notificationItem.createdAt,
                    iconName: "mdi-chat-outline",
                    isRead: notificationItem.isRead,
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
                    notificationType: "new_opinion",
                    username: notificationItem.username,
                    routeTarget: {
                        conversationSlugId: notificationItem.conversationSlugId,
                        opinionSlugId: notificationItem.opinionSlugId,
                        target: "opinion",
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
        const userNotificationTableResponse = await db
            .select({
                createdAt: userNotificationTable.createdAt,
                isRead: userNotificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                username: userTable.username,
                opinionContent: opinionContentTable.content,
                isAgree: notificationMessageOpinionAgreementTable.isAgree,
                slugId: userNotificationTable.slugId,
            })
            .from(userNotificationTable)
            .leftJoin(
                notificationMessageOpinionAgreementTable,
                eq(
                    notificationMessageOpinionAgreementTable.userNotificationId,
                    userNotificationTable.id,
                ),
            )
            .leftJoin(
                opinionTable,
                eq(
                    opinionTable.id,
                    notificationMessageOpinionAgreementTable.opinionId,
                ),
            )
            .leftJoin(
                opinionContentTable,
                eq(opinionContentTable.opinionId, opinionTable.id),
            )
            .leftJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationMessageOpinionAgreementTable.conversationId,
                ),
            )
            .leftJoin(
                userTable,
                eq(
                    userTable.id,
                    notificationMessageOpinionAgreementTable.userId,
                ),
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(fetchLimit);

        userNotificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.opinionSlugId &&
                notificationItem.username &&
                notificationItem.opinionContent
            ) {
                const userAction = notificationItem.isAgree
                    ? "agree"
                    : "disagree";

                const parsedItem: NotificationItem = {
                    slugId: notificationItem.slugId,
                    title: `${notificationItem.username} have ${userAction} on your opinion:`,
                    createdAt: notificationItem.createdAt,
                    iconName: "mdi-checkbox-marked-circle-outline",
                    isRead: notificationItem.isRead,
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
                    notificationType: "opinion_agreement",
                    username: notificationItem.username,
                    routeTarget: {
                        conversationSlugId: notificationItem.conversationSlugId,
                        opinionSlugId: notificationItem.opinionSlugId,
                        target: "opinion",
                    },
                };

                notificationItemList.push(parsedItem);

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
