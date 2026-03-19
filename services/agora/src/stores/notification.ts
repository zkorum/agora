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

  async function loadNotificationData(loadMore: boolean): Promise<boolean> {
    let lastSlugId: string | undefined = undefined;
    if (loadMore) {
      const lastItem = notificationList.value.at(-1);
      if (lastItem) {
        lastSlugId = lastItem.slugId;
      }
    }

    const response = await fetchNotifications(lastSlugId);
    if (response) {
      const transformed = transformNotifications(response.notificationList);
      if (loadMore) {
        notificationList.value.push(...transformed);
        numNewNotifications.value += response.numNewNotifications;
      } else {
        notificationList.value = transformed;
        numNewNotifications.value = response.numNewNotifications;
      }

      if (response.notificationList.length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      throw new Error("Failed to fetch notifications");
    }
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
    loadNotificationData,
    clearNotificationData,
    addNewNotification,
    hasNotification,
    clearBadgeCount,
    markNotificationAsRead,
    numNewNotifications,
    notificationList,
  };
});
