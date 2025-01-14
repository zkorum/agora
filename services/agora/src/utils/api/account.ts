import { api } from "boot/axios";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useNotify } from "../ui/notify";
import { useCommonApi } from "./common";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";

export function useBackendAccountApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { loadPostData } = usePostStore();
  const { loadUserProfile } = useUserStore();

  const { showNotifyMessage } = useNotify();

  async function submitUsernameChange(
    username: string,
    profileUsername: string
  ): Promise<boolean> {
    const NAME_UPDATE_SUCCESS_MESSAGE = "Username updated";

    if (username == profileUsername) {
      return true;
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
      ).apiV1UserUsernameUpdatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      await loadPostData(false);
      await loadUserProfile();
      showNotifyMessage(NAME_UPDATE_SUCCESS_MESSAGE);
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to update username");
      return false;
    }
  }

  async function deleteUserAccount(): Promise<boolean> {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserDeletePost();
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(undefined, undefined, api).apiV1UserDeletePost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Account deleted");
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage(
        "Failed to delete user account. Please contact support for further assistance."
      );
      return false;
    }
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
