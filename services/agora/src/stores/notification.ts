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
  let listGeneration = 0;
  let badgeGeneration = 0;
  let sessionGeneration = 0;
  let latestRefreshRequest = 0;

  function mergeNotifications({
    fetchedNotifications,
    currentNotifications,
  }: {
    fetchedNotifications: DisplayNotification[];
    currentNotifications: DisplayNotification[];
  }): DisplayNotification[] {
    const notificationsBySlug = new Map(
      fetchedNotifications.map((notification) => [
        notification.slugId,
        notification,
      ])
    );

    for (const notification of currentNotifications) {
      notificationsBySlug.set(notification.slugId, notification);
    }

    return [...notificationsBySlug.values()].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }

  async function refreshNotificationData(): Promise<void> {
    const requestId = latestRefreshRequest + 1;
    latestRefreshRequest = requestId;
    const requestListGeneration = listGeneration;
    const requestBadgeGeneration = badgeGeneration;
    const requestSessionGeneration = sessionGeneration;
    const response = await fetchNotifications(undefined);
    if (
      requestSessionGeneration !== sessionGeneration ||
      requestId !== latestRefreshRequest
    ) {
      return;
    }

    const fetchedNotifications = transformNotifications(
      response.notificationList
    );
    notificationList.value =
      requestListGeneration === listGeneration
        ? fetchedNotifications
        : mergeNotifications({
            fetchedNotifications,
            currentNotifications: notificationList.value,
          });
    listGeneration += 1;

    if (requestBadgeGeneration === badgeGeneration) {
      numNewNotifications.value = response.numNewNotifications;
      badgeGeneration += 1;
    }
  }

  async function loadMoreNotificationData(): Promise<boolean> {
    const lastSlugId = notificationList.value.at(-1)?.slugId;
    const requestListGeneration = listGeneration;
    const requestBadgeGeneration = badgeGeneration;
    const requestSessionGeneration = sessionGeneration;
    const response = await fetchNotifications(lastSlugId);
    if (requestSessionGeneration !== sessionGeneration) {
      return false;
    }

    const fetchedNotifications = transformNotifications(
      response.notificationList
    );
    if (requestListGeneration === listGeneration) {
      notificationList.value.push(...fetchedNotifications);
    } else {
      notificationList.value = mergeNotifications({
        fetchedNotifications,
        currentNotifications: notificationList.value,
      });
    }
    listGeneration += 1;

    if (requestBadgeGeneration === badgeGeneration) {
      numNewNotifications.value += response.numNewNotifications;
      badgeGeneration += 1;
    }
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
    listGeneration += 1;

    // Update new notification count if it's unread
    if (!notification.isRead) {
      numNewNotifications.value += 1;
      badgeGeneration += 1;
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
      listGeneration += 1;
    }
  }

  function clearBadgeCount() {
    numNewNotifications.value = 0;
    badgeGeneration += 1;
  }

  function clearNotificationData() {
    notificationList.value = [];
    numNewNotifications.value = 0;
    listGeneration += 1;
    badgeGeneration += 1;
    sessionGeneration += 1;
    latestRefreshRequest += 1;
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
