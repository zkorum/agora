import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import { NotificationItem } from "src/shared/types/zod";

export function useBackendNotificationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function getUserNotification() {
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
      console.log(response.data);
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

      return notificationItemList;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user notifications");
      return undefined;
    }
  }

  return { getUserNotification };
}
