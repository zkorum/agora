import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1UserMuteMuteUserPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type { UserMuteAction } from "src/shared/types/zod";
import type { FetchUserMutePreferencesResponse } from "src/shared/types/dto";

export function useBackendUserMuteApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function muteUser(
    targetUsername: string,
    userMuteAction: UserMuteAction
  ) {
    try {
      const params: ApiV1UserMuteMuteUserPostRequest = {
        targetUsername: targetUsername,
        action: userMuteAction,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserMuteMuteUserPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserMuteMuteUserPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (userMuteAction == "mute") {
        showNotifyMessage("User muted");
      } else {
        showNotifyMessage("User unmuted");
      }
      return true;
    } catch (e) {
      console.error(e);
      if (userMuteAction == "mute") {
        showNotifyMessage("Failed to mute user");
      } else {
        showNotifyMessage("Failed to unmute user");
      }
      return false;
    }
  }

  async function fetchMutePreferences() {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserMuteFetchPreferencesPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserMuteFetchPreferencesPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const muteUserItemList: FetchUserMutePreferencesResponse = [];
      response.data.forEach((muteUserItemRaw) => {
        muteUserItemList.push({
          username: muteUserItemRaw.username,
          createdAt: new Date(muteUserItemRaw.username),
        });
      });

      return muteUserItemList;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch muted user list");
      return [];
    }
  }

  return { muteUser, fetchMutePreferences };
}
