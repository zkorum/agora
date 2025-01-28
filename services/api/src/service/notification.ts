import {
    conversationTable,
    notificationNewOpinionTable,
    notificationOpinionVoteTable,
    opinionContentTable,
    opinionTable,
    notificationTable,
    userTable,
} from "@/schema.js";
import type { FetchNotificationsResponse } from "@/shared/types/dto.js";
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

    const fetchLimit = 10;

    let numNewNotifications = 0;

    const lastCreatedAt = await getNotificationSlugIdLastCreatedAt({
        db: db,
        lastSlugId: lastSlugId,
    });

    const whereClause = and(
        eq(notificationTable.userId, userId),
        lt(notificationTable.createdAt, lastCreatedAt),
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
                    slugId: notificationItem.slugId,
                    title: `${notificationItem.username} contributed an opinion to your conversation:`,
                    createdAt: notificationItem.createdAt,
                    iconName: "mdi-chat-outline",
                    isRead: notificationItem.isRead,
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
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
        const notificationTableResponse = await db
            .select({
                createdAt: notificationTable.createdAt,
                isRead: notificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                username: userTable.username,
                opinionContent: opinionContentTable.content,
                vote: notificationOpinionVoteTable.vote,
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
            .leftJoin(
                userTable,
                eq(userTable.id, notificationOpinionVoteTable.authorId),
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(fetchLimit);

        notificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.opinionSlugId &&
                notificationItem.username &&
                notificationItem.opinionContent &&
                notificationItem.vote
            ) {
                const parsedItem: NotificationItem = {
                    slugId: notificationItem.slugId,
                    title: `${notificationItem.username} ${notificationItem.vote}d with your opinion:`,
                    createdAt: notificationItem.createdAt,
                    iconName: "mdi-checkbox-marked-circle-outline",
                    isRead: notificationItem.isRead,
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
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
