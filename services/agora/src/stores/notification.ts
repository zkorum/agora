import { defineStore } from "pinia";
import { NotificationItem } from "src/shared/types/zod";
import { useBackendNotificationApi } from "src/utils/api/notification";
import { ref } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  const { getUserNotification } = useBackendNotificationApi();

  const notificationList = ref<NotificationItem[]>([]);
  const numNewNotifications = ref(0);

  async function loadNotificationData(loadMore: boolean) {
    let lastSlugId: string | undefined = undefined;
    if (loadMore) {
      const lastItem = notificationList.value.at(-1);
      if (lastItem) {
        lastSlugId = lastItem.slugId;
      }
    }

    const response = await getUserNotification(lastSlugId);
    if (response) {
      if (loadMore) {
        notificationList.value = response.notificationList;
      } else {
        notificationList.value = response.notificationList;
      }
      numNewNotifications.value = response.numNewNotifications;
    }
  }

  return { loadNotificationData, numNewNotifications, notificationList };
});
