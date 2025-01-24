import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import { NotificationItem } from "src/shared/types/zod";
import { FetchUserNotificationsResponse } from "src/shared/types/dto";

export function useBackendNotificationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function getUserNotification(): Promise<
    FetchUserNotificationsResponse | undefined
  > {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1NotificationFetchPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1NotificationFetchPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const notificationItemList: NotificationItem[] = [];
      response.data.notificationList.forEach((notificationItem) => {
        const parsedItem: NotificationItem = {
          id: notificationItem.id,
          createdAt: new Date(notificationItem.createdAt),
          iconName: notificationItem.iconName,
          isRead: notificationItem.isRead,
          message: notificationItem.message,
          notificationType: notificationItem.notificationType,
          routeTarget: notificationItem.routeTarget,
          title: notificationItem.title,
          username: notificationItem.username,
        };
        notificationItemList.push(parsedItem);
      });

      return {
        notificationList: notificationItemList,
        numNewNotifications: response.data.numNewNotifications,
      };
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user notifications");
      return undefined;
    }
  }

  async function markAllNotificationsAsRead() {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1NotificationMarkAllReadPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1NotificationMarkAllReadPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to mark user notifications as read");
    }
  }

  return { getUserNotification, markAllNotificationsAsRead };
}
