import type { ApiV1NotificationFetchPostRequest } from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { Dto, type FetchNotificationsResponse } from "src/shared/types/dto";

import { buildAuthorizationHeader } from "../../crypto/ucan/operation";
import { useNotify } from "../../ui/notify";
import { api } from "../client";
import { useCommonApi } from "../common";
import { getErrorLogContext } from "../errorLog";
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
  ): Promise<FetchNotificationsResponse> {
    const params: ApiV1NotificationFetchPostRequest = {
      lastSlugId,
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

    return Dto.fetchNotificationsResponse.parse(response.data);
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
    } catch (error) {
      console.error(
        "Failed to mark notifications as read",
        getErrorLogContext(error)
      );
      showNotifyMessage(t("failedToMarkNotificationsRead"));
    }
  }

  return {
    fetchNotifications,
    markAllNotificationsAsRead,
  };
}
