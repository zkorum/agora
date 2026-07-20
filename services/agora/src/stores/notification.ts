import { defineStore } from "pinia";
import type { NotificationItem } from "src/shared/types/zod";
import { useNotificationApi } from "src/utils/api/notification/notification";
import {
  type DisplayNotification,
  transformNotification,
  transformNotifications,
} from "src/utils/notification/transform";
import { ref } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  const { fetchNotifications } = useNotificationApi();

  const notificationList = ref<DisplayNotification[]>([]);
  const numNewNotifications = ref(0);

  async function refreshNotificationData(): Promise<void> {
    const response = await fetchNotifications(undefined);
    notificationList.value = transformNotifications(response.notificationList);
    numNewNotifications.value = response.numNewNotifications;
  }

  async function loadMoreNotificationData(): Promise<boolean> {
    const lastSlugId = notificationList.value.at(-1)?.slugId;
    const response = await fetchNotifications(lastSlugId);
    notificationList.value.push(
      ...transformNotifications(response.notificationList)
    );
    numNewNotifications.value += response.numNewNotifications;
    return response.notificationList.length > 0;
  }

  function hasNotification(slugId: string): boolean {
    return notificationList.value.some((n) => n.slugId === slugId);
  }

  function addNewNotification(notification: NotificationItem) {
    // Check for duplicates before adding
    if (hasNotification(notification.slugId)) {
      console.log(
        `[Store] Duplicate notification ignored: ${notification.slugId}`
      );
      return;
    }

    // Transform and add notification to the beginning of the list (most recent first)
    const transformed = transformNotification(notification);
    notificationList.value.unshift(transformed);

    // Update new notification count if it's unread
    if (!notification.isRead) {
      numNewNotifications.value += 1;
    }

    console.log(
      `[Store] Added notification: ${notification.slugId} (${notification.type})`
    );
  }

  function markNotificationAsRead(slugId: string) {
    const notification = notificationList.value.find(
      (n) => n.slugId === slugId
    );
    if (notification) {
      notification.isRead = true;
    }
  }

  function clearBadgeCount() {
    numNewNotifications.value = 0;
  }

  function clearNotificationData() {
    notificationList.value = [];
    numNewNotifications.value = 0;
  }

  return {
    refreshNotificationData,
    loadMoreNotificationData,
    clearNotificationData,
    addNewNotification,
    hasNotification,
    clearBadgeCount,
    markNotificationAsRead,
    numNewNotifications,
    notificationList,
  };
});
