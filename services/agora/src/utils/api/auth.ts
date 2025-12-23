import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import {
  type ApiV1AuthAuthenticatePost200Response,
  type ApiV1AuthAuthenticatePostRequest,
  type ApiV1AuthPhoneVerifyOtpPost200Response,
  type ApiV1AuthPhoneVerifyOtpPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import type {
  DeviceLoginStatus,
  SupportedCountryCallingCode,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useLanguageStore } from "src/stores/language";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useNotificationStore } from "src/stores/notification";
import { useTopicStore } from "src/stores/topic";
import { useUserStore } from "src/stores/user";
import { processEnv } from "src/utils/processEnv";
import { useRoute } from "vue-router";

import { useNewPostDraftsStore } from "../../stores/newConversationDrafts";
import { getPlatform } from "../common";
import { buildAuthorizationHeader, deleteDid } from "../crypto/ucan/operation";
import { queryClient } from "../query/client";
import { useRouterGuard } from "../router/guard";
import { api } from "./client";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "./common";
import { type KeyAction,useCommonApi } from "./common";

interface SendSmsCodeProps {
  phoneNumber: string;
  defaultCallingCode: SupportedCountryCallingCode;
  isRequestingNewCode: boolean;
  keyAction?: KeyAction;
}

interface VerifyPhoneOtpProps {
  code: number;
  phoneNumber: string;
  defaultCallingCode: SupportedCountryCallingCode;
}

export function useBackendAuthApi() {
  const {
    buildEncodedUcan,
    createAxiosErrorResponse,
    createRawAxiosRequestConfig,
  } = useCommonApi();
  const authStore = useAuthenticationStore();
  const { isAuthInitialized } = storeToRefs(authStore);
  const { loadPostData } = useHomeFeedStore();
  const { loadUserProfile, clearProfileData } = useUserStore();
  const { loadTopicsData, clearTopicsData } = useTopicStore();
  const { loadNotificationData } = useNotificationStore();
  const { resetDraft } = useNewPostDraftsStore();
  const { clearOpinionDrafts } = useNewOpinionDraftsStore();
  const { clearNotificationData } = useNotificationStore();
  const { clearLanguagePreferences, loadLanguagePreferencesFromBackend } =
    useLanguageStore();

  const route = useRoute();

  const { firstLoadGuard } = useRouterGuard();

  const $q = useQuasar();

  type SendSmsCodeSuccessResponse =
    AxiosSuccessResponse<ApiV1AuthAuthenticatePost200Response>;

  type SendSmsCodeResponse = SendSmsCodeSuccessResponse | AxiosErrorResponse;

  async function sendSmsCode({
    phoneNumber,
    defaultCallingCode,
    isRequestingNewCode,
    keyAction,
  }: SendSmsCodeProps): Promise<SendSmsCodeResponse> {
    try {
      const params: ApiV1AuthAuthenticatePostRequest = {
        phoneNumber: phoneNumber,
        defaultCallingCode: defaultCallingCode,
        isRequestingNewCode: isRequestingNewCode,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AuthAuthenticatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options, keyAction);
      const otpDetails = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AuthAuthenticatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );
      return {
        status: "success",
        data: otpDetails.data,
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  type VerifyPhoneOtpSuccessResponse =
    AxiosSuccessResponse<ApiV1AuthPhoneVerifyOtpPost200Response>;

  type VerifyPhoneOtpResponse =
    | VerifyPhoneOtpSuccessResponse
    | AxiosErrorResponse;

  async function verifyPhoneOtp({
    code,
    phoneNumber,
    defaultCallingCode,
  }: VerifyPhoneOtpProps): Promise<VerifyPhoneOtpResponse> {
    if (processEnv.VITE_DEV_AUTHORIZED_PHONES) {
      code = 0;
    }

    try {
      const params: ApiV1AuthPhoneVerifyOtpPostRequest = {
        code: code,
        phoneNumber: phoneNumber,
        defaultCallingCode: defaultCallingCode,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AuthPhoneVerifyOtpPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AuthPhoneVerifyOtpPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );
      return {
        status: "success",
        data: response.data,
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function getDeviceLoginStatus(): Promise<DeviceLoginStatus> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const resp = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthCheckLoginStatusPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return resp.data.loggedInStatus as DeviceLoginStatus;
    //NOTE: DO NOT return false on error! You would wipe out the user session at the first backend interruption.
  }

  async function logoutFromServer() {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthLogoutPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const otpDetails = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthLogoutPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return { data: otpDetails.data };
  }

  async function loadAuthenticatedModules() {
    await Promise.all([
      loadUserProfile(),
      loadPostData(),
      loadNotificationData(false),
      loadTopicsData(),
      loadLanguagePreferencesFromBackend(),
    ]);
  }

  // update the global state according to the change in login status
  async function updateAuthState({
    partialLoginStatus,
    forceRefresh = false,
    deferCacheOperations = false,
  }: {
    partialLoginStatus: Partial<DeviceLoginStatus>;
    forceRefresh?: boolean;
    deferCacheOperations?: boolean;
  }): Promise<{ authStateChanged: boolean; needsCacheRefresh: boolean }> {
    try {
      const {
        oldLoginStatus,
        newLoginStatus,
        oldIsGuestOrLoggedIn,
        newIsGuestOrLoggedIn,
      } = authStore.setLoginStatus(partialLoginStatus);
      if (
        (oldLoginStatus.isKnown !== newLoginStatus.isKnown || forceRefresh) &&
        newLoginStatus.isKnown == false
      ) {
        console.log("Cleaning data from detecting change to unknown device");
        await logoutDataCleanup({
          shouldClearLanguagePreferences:
            oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
        });
        if (route.name) {
          await firstLoadGuard(route.name);
        }
        return { authStateChanged: true, needsCacheRefresh: false };
      }

      // Extract userId from old and new status for comparison
      const oldUserId = oldLoginStatus.isKnown ? oldLoginStatus.userId : undefined;
      const newUserId = newLoginStatus.isKnown ? newLoginStatus.userId : undefined;
      const userIdChanged = oldUserId !== newUserId;

      const authStateChanged =
        oldIsGuestOrLoggedIn !== newIsGuestOrLoggedIn || userIdChanged;

      if (forceRefresh || authStateChanged)
        if (newIsGuestOrLoggedIn) {
          // Check if we should defer cache operations
          if (deferCacheOperations) {
            console.log(
              "Auth state changed but deferring cache operations for caller to handle"
            );
            return { authStateChanged: true, needsCacheRefresh: true };
          }

          console.log(
            "Clearing query cache and loading authenticated modules upon detecting new login, guest user, or userId change"
          );
          // Clear all TanStack Query cache data to ensure fresh start for new user session
          queryClient.clear();
          await loadAuthenticatedModules();
          return { authStateChanged: true, needsCacheRefresh: false };
        } else {
          console.log("Cleaning data from logging out");
          await logoutDataCleanup({
            shouldClearLanguagePreferences:
              oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
          });
          if (route.name) {
            await firstLoadGuard(route.name);
          }
          return { authStateChanged: true, needsCacheRefresh: false };
        }

      return { authStateChanged: false, needsCacheRefresh: false };
    } catch (e) {
      console.error("Failed to update authentication state", e);
      return { authStateChanged: false, needsCacheRefresh: false };
    } finally {
      isAuthInitialized.value = true;
    }
  }

  async function initializeAuthState() {
    const deviceLoginStatus = await getDeviceLoginStatus();
    await updateAuthState({
      partialLoginStatus: deviceLoginStatus,
      forceRefresh: true,
    });
  }

  async function logoutDataCleanup({
    shouldClearLanguagePreferences,
  }: {
    shouldClearLanguagePreferences: boolean;
  }) {
    const platform: "mobile" | "web" = getPlatform($q.platform);

    // Clear all TanStack Query cache data
    queryClient.clear();

    await deleteDid(platform);
    resetDraft();
    clearOpinionDrafts();

    authStore.setLoginStatus({ isKnown: false });

    await loadPostData();
    clearProfileData();

    clearNotificationData();

    clearTopicsData();

    if (shouldClearLanguagePreferences) {
      await clearLanguagePreferences();
    }
  }

  return {
    sendSmsCode,
    verifyPhoneOtp,
    logoutFromServer,
    getDeviceLoginStatus,
    updateAuthState,
    initializeAuthState,
    loadAuthenticatedModules,
  };
}
