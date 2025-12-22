/**
 * Notification transformation utilities
 *
 * Transforms API notification data into display-ready format with computed message field.
 * This allows the template to use a consistent `message` field for all notification types.
 */

import type {
    NotificationItem,
    ExportFailureReason,
    ImportFailureReason,
} from "src/shared/types/zod";

/**
 * Extended notification with computed display message.
 * The API sends type-specific data (message for opinions, conversationTitle for exports),
 * and this type adds a unified `displayMessage` for rendering.
 *
 * Also includes `failureReasonKey` for i18n lookup when a failure reason is present.
 */
export type DisplayNotification = NotificationItem & {
    displayMessage: string | null;
    failureReasonKey: string | null;
};

/**
 * Convert failure reason enum to i18n key.
 */
function getFailureReasonKey(
    reason: ExportFailureReason | ImportFailureReason | undefined
): string | null {
    if (!reason) return null;

    switch (reason) {
        case "processing_error":
        case "server_restart":
            // Show server_restart as generic processing error (not helpful to show internal details)
            return "failureReasonProcessingError";
        case "timeout":
            return "failureReasonTimeout";
        case "invalid_data_format":
            return "failureReasonInvalidDataFormat";
    }
}

/**
 * Get the display message content from a notification.
 * - Opinion notifications: use the `message` field (opinion content)
 * - Export notifications: use `conversationTitle` (wrapped in quotes)
 * - Import notifications: no message content (null) - title is sufficient
 */
export function getDisplayMessage(notification: NotificationItem): string | null {
    switch (notification.type) {
        case "new_opinion":
        case "opinion_vote":
            return notification.message;

        case "export_started":
        case "export_completed":
        case "export_failed":
        case "export_cancelled":
            return `"${notification.conversationTitle}"`;

        case "import_started":
        case "import_completed":
        case "import_failed":
            // Import notifications don't have additional message content
            // The title already says "Your conversation import has started/completed/failed"
            return null;
    }
}

/**
 * Get the failure reason i18n key from a notification.
 */
function getFailureReasonKeyFromNotification(
    notification: NotificationItem
): string | null {
    switch (notification.type) {
        case "export_failed":
            return getFailureReasonKey(notification.failureReason);
        case "import_failed":
            return getFailureReasonKey(notification.failureReason);
        case "new_opinion":
        case "opinion_vote":
        case "export_started":
        case "export_completed":
        case "export_cancelled":
        case "import_started":
        case "import_completed":
            return null;
    }
}

/**
 * Transform a notification to include the display message and failure reason key.
 */
export function transformNotification(notification: NotificationItem): DisplayNotification {
    return {
        ...notification,
        displayMessage: getDisplayMessage(notification),
        failureReasonKey: getFailureReasonKeyFromNotification(notification),
    };
}

/**
 * Transform a list of notifications.
 */
export function transformNotifications(notifications: NotificationItem[]): DisplayNotification[] {
    return notifications.map(transformNotification);
}
