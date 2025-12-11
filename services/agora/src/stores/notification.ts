import { defineStore } from "pinia";
import type { NotificationItem } from "src/shared/types/zod";
import { useNotificationApi } from "src/utils/api/notification/notification";
import { ref } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  const { fetchNotifications } = useNotificationApi();

  const notificationList = ref<NotificationItem[]>([]);
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
      if (loadMore) {
        notificationList.value.push(...response.notificationList);
      } else {
        notificationList.value = response.notificationList;
      }
      calculateNumNewNotification();

      if (response.notificationList.length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  function calculateNumNewNotification() {
    let newNotificationCount = 0;
    notificationList.value.forEach((notificationItem) => {
      if (!notificationItem.isRead) {
        newNotificationCount += 1;
      }
    });

    numNewNotifications.value = newNotificationCount;
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

    // Add notification to the beginning of the list (most recent first)
    notificationList.value.unshift(notification);

    // Update new notification count if it's unread
    if (!notification.isRead) {
      numNewNotifications.value += 1;
    }

    console.log(
      `[Store] Added notification: ${notification.slugId} (${notification.type})`
    );
  }

  function markAllAsReadLocally() {
    // Update all notifications in the list to mark them as read
    notificationList.value = notificationList.value.map((notification) => ({
      ...notification,
      isRead: true,
    }));
    // Reset the new notification counter
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
    markAllAsReadLocally,
    numNewNotifications,
    notificationList,
  };
});
