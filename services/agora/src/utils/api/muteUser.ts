import {
  type ApiV1MuteUserCreatePostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { GetMutedUsersResponse } from "src/shared/types/dto";
import type { UserMuteAction } from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useNotify } from "../ui/notify";
import { api } from "./client";
import { useCommonApi } from "./common";
import {
  type MuteUserApiTranslations,
  muteUserApiTranslations,
} from "./muteUser.i18n";

export function useBackendUserMuteApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<MuteUserApiTranslations>(
    muteUserApiTranslations
  );

  async function muteUser(
    targetUsername: string,
    userMuteAction: UserMuteAction
  ) {
    try {
      const params: ApiV1MuteUserCreatePostRequest = {
        targetUsername: targetUsername,
        action: userMuteAction,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1MuteUserCreatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MuteUserCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (userMuteAction == "mute") {
        showNotifyMessage(t("userMuted"));
      } else {
        showNotifyMessage(t("userUnmuted"));
      }
      return true;
    } catch (e) {
      console.error(e);
      if (userMuteAction == "mute") {
        showNotifyMessage(t("failedToMuteUser"));
      } else {
        showNotifyMessage(t("failedToUnmuteUser"));
      }
      return false;
    }
  }

  async function getMutedUsers() {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1MuteUserGetPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MuteUserGetPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const muteUserItemList: GetMutedUsersResponse = [];
      response.data.forEach((muteUserItemRaw) => {
        muteUserItemList.push({
          username: muteUserItemRaw.username,
          createdAt: new Date(muteUserItemRaw.createdAt),
        });
      });

      return muteUserItemList;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchMutedUsers"));
      return [];
    }
  }

  return { muteUser, getMutedUsers };
}
