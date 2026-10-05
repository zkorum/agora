import type { RegularNotificationItem } from "@/shared/types/zod.js";

type NotificationKind = RegularNotificationItem["type"];
export type NotificationContent = {
    [Kind in NotificationKind]: Omit<
        Extract<RegularNotificationItem, { type: Kind }>,
        "slugId" | "createdAt" | "isRead"
    >;
}[NotificationKind];

export function buildNotification({
    content,
    record,
}: {
    content: NotificationContent;
    record: Pick<RegularNotificationItem, "slugId" | "createdAt" | "isRead">;
}): RegularNotificationItem {
    // Project stored/application values explicitly: structural types can carry
    // extra keys, whereas the HTTP and SSE contracts are strict objects.
    const base = {
        slugId: record.slugId,
        createdAt: record.createdAt,
        isRead: record.isRead,
    } satisfies Pick<
        RegularNotificationItem,
        "slugId" | "createdAt" | "isRead"
    >;

    switch (content.type) {
        case "new_opinion":
            return {
                ...base,
                type: content.type,
                username: content.username,
                message: content.message,
                routeTarget: {
                    type: "opinion",
                    conversationSlugId: content.routeTarget.conversationSlugId,
                    opinionSlugId: content.routeTarget.opinionSlugId,
                },
            };
        case "opinion_vote":
            return {
                ...base,
                type: content.type,
                numVotes: content.numVotes,
                isSeed: content.isSeed,
                message: content.message,
                routeTarget: {
                    type: "opinion",
                    conversationSlugId: content.routeTarget.conversationSlugId,
                    opinionSlugId: content.routeTarget.opinionSlugId,
                },
            };
        case "export_started":
        case "export_completed":
        case "export_failed":
        case "export_cancelled": {
            const exportBase = {
                ...base,
                conversationTitle: content.conversationTitle,
                routeTarget: {
                    type: "export",
                    conversationSlugId: content.routeTarget.conversationSlugId,
                    exportSlugId: content.routeTarget.exportSlugId,
                },
            } satisfies Omit<
                Extract<RegularNotificationItem, { type: "export_started" }>,
                "type"
            >;
            if (content.type === "export_failed") {
                return {
                    ...exportBase,
                    type: content.type,
                    failureReason: content.failureReason,
                };
            }
            if (content.type === "export_cancelled") {
                return {
                    ...exportBase,
                    type: content.type,
                    cancellationReason: content.cancellationReason,
                };
            }
            return { ...exportBase, type: content.type };
        }
        case "import_started":
        case "import_completed":
        case "import_failed": {
            const importBase = {
                ...base,
                routeTarget: {
                    type: "import",
                    importSlugId: content.routeTarget.importSlugId,
                    conversationSlugId: content.routeTarget.conversationSlugId,
                },
            } satisfies Omit<
                Extract<RegularNotificationItem, { type: "import_started" }>,
                "type"
            >;
            if (content.type === "import_failed") {
                return {
                    ...importBase,
                    type: content.type,
                    failureReason: content.failureReason,
                };
            }
            if (content.type === "import_completed") {
                return {
                    ...importBase,
                    type: content.type,
                    conversationTitle: content.conversationTitle,
                };
            }
            return { ...importBase, type: content.type };
        }
    }
}
