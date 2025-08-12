import { api } from "boot/axios";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1AuthAuthenticatePost200Response,
  type ApiV1AuthAuthenticatePostRequest,
  type ApiV1AuthPhoneVerifyOtpPost200Response,
  type ApiV1AuthPhoneVerifyOtpPostRequest,
} from "src/api";
import type {
  DeviceLoginStatus,
  SupportedCountryCallingCode,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useNotificationStore } from "src/stores/notification";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useUserStore } from "src/stores/user";
import { useNewPostDraftsStore } from "../../stores/newConversationDrafts";
import { useLanguagePreferences } from "src/composables/useLanguagePreferences";
import { getPlatform } from "../common";
import { buildAuthorizationHeader, deleteDid } from "../crypto/ucan/operation";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "./common";
import { useCommonApi, type KeyAction } from "./common";
import { useRoute } from "vue-router";
import { useRouterGuard } from "../router/guard";
import { useTopicStore } from "src/stores/topic";

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
  const { clearLanguagePreferences } = useLanguagePreferences();

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
    if (process.env.VITE_DEV_AUTHORIZED_PHONES) {
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
    ]);
  }

  // update the global state according to the change in login status
  async function updateAuthState({
    partialLoginStatus,
    forceRefresh = false,
  }: {
    partialLoginStatus: Partial<DeviceLoginStatus>;
    forceRefresh?: boolean;
  }) {
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
        await logoutDataCleanup();
        if (route.name) {
          await firstLoadGuard(route.name);
        }
        return;
      }

      if (forceRefresh || oldIsGuestOrLoggedIn !== newIsGuestOrLoggedIn)
        if (newIsGuestOrLoggedIn) {
          console.log(
            "Loading authenticated modules upon detecting new login or guest user"
          );
          await loadAuthenticatedModules();
        } else {
          console.log("Cleaning data from logging out");
          await logoutDataCleanup();
          if (route.name) {
            await firstLoadGuard(route.name);
          }
          return;
        }
    } catch (e) {
      console.error("Failed to update authentication state", e);
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

  async function logoutDataCleanup() {
    const platform: "mobile" | "web" = getPlatform($q.platform);

    await deleteDid(platform);
    resetDraft();
    clearOpinionDrafts();

    authStore.setLoginStatus({ isKnown: false });

    await loadPostData();
    clearProfileData();

    clearNotificationData();

    clearTopicsData();

    // Clear language preferences and reset to browser language
    clearLanguagePreferences();
  }

  return {
    sendSmsCode,
    verifyPhoneOtp,
    logoutFromServer,
    getDeviceLoginStatus,
    updateAuthState,
    initializeAuthState,
    logoutDataCleanup,
  };
}
