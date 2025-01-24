import { defineStore } from "pinia";
import { NotificationItem } from "src/shared/types/zod";
import { useBackendNotificationApi } from "src/utils/api/notification";
import { ref } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  const { getUserNotification } = useBackendNotificationApi();

  const notificationList = ref<NotificationItem[]>([]);
  const numNewNotifications = ref(0);

  async function loadNotificationData() {
    const response = await getUserNotification();
    if (response) {
      notificationList.value = response.notificationList;
      numNewNotifications.value = response.numNewNotifications;
    }
  }

  return { loadNotificationData, numNewNotifications, notificationList };
});
