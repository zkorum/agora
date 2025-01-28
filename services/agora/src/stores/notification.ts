import { defineStore } from "pinia";
import { NotificationItem } from "src/shared/types/zod";
import { useBackendNotificationApi } from "src/utils/api/notification";
import { ref } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  const { fetchNotifications } = useBackendNotificationApi();

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

  return {
    loadNotificationData,
    numNewNotifications,
    notificationList,
  };
});
