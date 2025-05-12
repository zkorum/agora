import { api } from "boot/axios";
import {
  ApiV1UserUsernameUpdatePostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useNotify } from "../ui/notify";
import {
  AxiosErrorResponse,
  AxiosSuccessResponse,
  useCommonApi,
} from "./common";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useUserStore } from "src/stores/user";

export function useBackendAccountApi() {
  const {
    buildEncodedUcan,
    createAxiosErrorResponse,
    createRawAxiosRequestConfig,
  } = useCommonApi();

  const { loadPostData } = useHomeFeedStore();
  const { loadUserProfile } = useUserStore();

  const { showNotifyMessage } = useNotify();

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
      await loadPostData(false);
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
      showNotifyMessage("Error while checking if the username is in use.");
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
      showNotifyMessage("Failed to generate random username");
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
