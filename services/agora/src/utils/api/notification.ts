import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import type { ApiV1NotificationFetchPostRequest } from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type { NotificationItem } from "src/shared/types/zod";
import type { FetchNotificationsResponse } from "src/shared/types/dto";

export function useBackendNotificationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function fetchNotifications(
    lastSlugId: string | undefined
  ): Promise<FetchNotificationsResponse | undefined> {
    try {
      const params: ApiV1NotificationFetchPostRequest = {
        lastSlugId: lastSlugId,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1NotificationFetchPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1NotificationFetchPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const notificationItemList: NotificationItem[] =
        response.data.notificationList.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        }));

      return {
        notificationList: notificationItemList,
        numNewNotifications: response.data.numNewNotifications,
      };
    } catch (e) {
      console.error(e);
      // showNotifyMessage("Failed to fetch user notifications");
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

  return {
    fetchNotifications,
    markAllNotificationsAsRead,
  };
}
