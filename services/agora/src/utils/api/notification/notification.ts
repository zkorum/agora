import type { ApiV1NotificationFetchPostRequest } from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { FetchNotificationsResponse } from "src/shared/types/dto";
import {
  type NotificationItem,
  zodNotificationItem,
} from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../../crypto/ucan/operation";
import { useNotify } from "../../ui/notify";
import { api } from "../client";
import { useCommonApi } from "../common";
import {
  type NotificationApiTranslations,
  notificationApiTranslations,
} from "./notification.i18n";

export function useNotificationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<NotificationApiTranslations>(
    notificationApiTranslations
  );

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

      // Parse and validate each notification item with zod
      const notificationItemList: NotificationItem[] = [];

      for (const item of response.data.notificationList) {
        const parsedItem = zodNotificationItem.safeParse(item);

        if (parsedItem.success) {
          notificationItemList.push(parsedItem.data);
        } else {
          console.error("Failed to parse notification item:", parsedItem.error);
          // Skip invalid notifications instead of failing the entire request
        }
      }

      return {
        notificationList: notificationItemList,
        numNewNotifications: response.data.numNewNotifications,
      };
    } catch (e) {
      console.error(e);
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
      showNotifyMessage(t("failedToMarkNotificationsRead"));
    }
  }

  return {
    fetchNotifications,
    markAllNotificationsAsRead,
  };
}
