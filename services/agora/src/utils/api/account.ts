import type { ApiV1UserUsernameUpdatePostRequest } from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useUserStore } from "src/stores/user";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { queryClient } from "../query/client";
import { useNotify } from "../ui/notify";
import {
  type AccountApiTranslations,
  accountApiTranslations,
} from "./account.i18n";
import { api } from "./client";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "./common";
import { useCommonApi } from "./common";

export function useBackendAccountApi() {
  const {
    buildEncodedUcan,
    createAxiosErrorResponse,
    createRawAxiosRequestConfig,
  } = useCommonApi();

  const { loadUserProfile } = useUserStore();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<AccountApiTranslations>(
    accountApiTranslations
  );

  type SubmitUsernameChangeSuccessResponse = AxiosSuccessResponse<boolean>;

  type SubmitUsernameChangeResponse =
    | SubmitUsernameChangeSuccessResponse
    | AxiosErrorResponse;

  async function submitUsernameChange(
    username: string,
    currentProfileUsername: string
  ): Promise<SubmitUsernameChangeResponse> {
    if (username == currentProfileUsername) {
      return {
        status: "success",
        data: true,
      };
    }

    try {
      const params: ApiV1UserUsernameUpdatePostRequest = {
        username: username,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserUsernameUpdatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserUsernameUpdatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      await loadUserProfile();
      return {
        status: "success",
        data: true,
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  async function deleteUserAccount(): Promise<void> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1UserDeletePost();
    const encodedUcan = await buildEncodedUcan(url, options);
    await DefaultApiFactory(undefined, undefined, api).apiV1UserDeletePost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
  }

  async function isUsernameInUse(username: string): Promise<boolean | null> {
    try {
      const params: ApiV1UserUsernameUpdatePostRequest = {
        username: username,
      };

      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AccountIsUsernameInUsePost(params);
      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToCheckUsername"));
      return true;
    }
  }

  async function generateUnusedRandomUsername(): Promise<string | null> {
    try {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AccountGenerateUnusedRandomUsernamePost();
      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToGenerateRandomUsername"));
      return null;
    }
  }

  return {
    deleteUserAccount,
    submitUsernameChange,
    isUsernameInUse,
    generateUnusedRandomUsername,
  };
}
