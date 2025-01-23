import {
    conversationContentTable,
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
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { generateRandomSlugId } from "@/crypto.js";

interface GetUserNotificationsProps {
    db: PostgresJsDatabase;
    userId: string;
}

export async function getUserNotifications({
    db,
    userId,
}: GetUserNotificationsProps): Promise<FetchUserNotificationsResponse> {
    const notificationItemList: NotificationItem[] = [];

    const fetchLimit = 30;

    {
        const userNotificationTableResponse = await db
            .select({
                createdAt: userNotificationTable.createdAt,
                isRead: userNotificationTable.isRead,
                conversationSlugId: conversationTable.slugId,
                opinionSlugId: opinionTable.slugId,
                username: userTable.username,
                conversationTitle: conversationContentTable.title,
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
                conversationTable,
                eq(
                    conversationTable.id,
                    notificationMessageNewOpinionTable.conversationId,
                ),
            )
            .leftJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.conversationId,
                    conversationTable.id,
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
                userTable,
                eq(userTable.id, notificationMessageNewOpinionTable.userId),
            )
            .where(eq(userNotificationTable.userId, userId))
            .limit(fetchLimit);

        userNotificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.opinionSlugId &&
                notificationItem.username &&
                notificationItem.conversationTitle
            ) {
                const parsedItem: NotificationItem = {
                    id: generateRandomSlugId(),
                    title: `${notificationItem.username} replied to your opinion on:`,
                    createdAt: notificationItem.createdAt,
                    iconName: "mdi-check",
                    isRead: notificationItem.isRead,
                    message: notificationItem.conversationTitle,
                    notificationType: "new_opinion",
                    routeTarget: {
                        conversationSlugId: notificationItem.conversationSlugId,
                        opinionSlugId: notificationItem.opinionSlugId,
                        target: "opinion",
                    },
                };

                notificationItemList.push(parsedItem);
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
            .where(eq(userNotificationTable.userId, userId))
            .limit(fetchLimit);

        userNotificationTableResponse.forEach((notificationItem) => {
            if (
                notificationItem.conversationSlugId &&
                notificationItem.opinionSlugId &&
                notificationItem.username &&
                notificationItem.opinionContent
            ) {
                const parsedItem: NotificationItem = {
                    id: generateRandomSlugId(),
                    title: `${notificationItem.username} have voted on your opinion on:`,
                    createdAt: notificationItem.createdAt,
                    iconName: "mdi-check",
                    isRead: notificationItem.isRead,
                    message: useCommonPost().createCompactHtmlBody(
                        notificationItem.opinionContent,
                    ),
                    notificationType: "opinion_agreement",
                    routeTarget: {
                        conversationSlugId: notificationItem.conversationSlugId,
                        opinionSlugId: notificationItem.opinionSlugId,
                        target: "opinion",
                    },
                };

                notificationItemList.push(parsedItem);
            }
        });
    }

    notificationItemList.sort(function (a, b) {
        return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
        notificationList: notificationItemList,
    };
}
