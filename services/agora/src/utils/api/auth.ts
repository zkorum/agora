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
import {
  DeviceLoginStatus,
  SupportedCountryCallingCode,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useNotificationStore } from "src/stores/notification";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";
import { RouteMap, useRoute, useRouter } from "vue-router";
import { useNewPostDraftsStore } from "../../stores/newConversationDrafts";
import { getPlatform } from "../common";
import { buildAuthorizationHeader, deleteDid } from "../crypto/ucan/operation";
import { useNotify } from "../ui/notify";
import { useCommonApi, type KeyAction } from "./common";

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
  const { buildEncodedUcan } = useCommonApi();
  const authStore = useAuthenticationStore();
  const { isAuthInitialized } = storeToRefs(authStore);
  const { loadPostData } = usePostStore();
  const { loadUserProfile, clearProfileData } = useUserStore();
  const { loadNotificationData } = useNotificationStore();
  const { clearConversationDrafts } = useNewPostDraftsStore();
  const { clearOpinionDrafts } = useNewOpinionDraftsStore();

  const $q = useQuasar();

  const { showNotifyMessage } = useNotify();
  const router = useRouter();
  const route = useRoute();

  async function sendSmsCode({
    phoneNumber,
    defaultCallingCode,
    isRequestingNewCode,
    keyAction,
  }: SendSmsCodeProps): Promise<ApiV1AuthAuthenticatePost200Response> {
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
    ).apiV1AuthAuthenticatePost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return otpDetails.data;
  }

  async function verifyPhoneOtp({
    code,
    phoneNumber,
    defaultCallingCode,
  }: VerifyPhoneOtpProps): Promise<ApiV1AuthPhoneVerifyOtpPost200Response> {
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
    ).apiV1AuthPhoneVerifyOtpPost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return response.data;
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
      loadPostData(false),
      loadNotificationData(false),
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
        await logoutDataCleanup({ doDeleteKeypair: false });
        setTimeout(async function () {
          const needRedirect = needRedirectUnauthenticatedUser();
          if (needRedirect) {
            await showLogoutMessageAndRedirect();
          } else {
            await loadPostData(false);
          }
        }, 500);
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
          await logoutDataCleanup({ doDeleteKeypair: true });
          setTimeout(async function () {
            const needRedirect = needRedirectUnauthenticatedUser();
            if (needRedirect) {
              await showLogoutMessageAndRedirect();
            } else {
              await loadPostData(false);
            }
          }, 500);
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

  async function showLogoutMessageAndRedirect() {
    showNotifyMessage("Logged out");
    await router.push({ name: "/welcome/" });
  }

  function needRedirectUnauthenticatedUser(): boolean {
    const currentRouteName = route.name;
    if (currentRouteName) {
      const whiteListedRoutes: (keyof RouteMap)[] = [
        "/",
        "/conversation/[postSlugId]",
        "/conversation/create/",
        "/legal/privacy/",
        "/legal/terms/",
        "/onboarding/step1-login/",
        "/onboarding/step1-signup/",
        "/onboarding/step2-signup/",
        "/onboarding/step3-passport/",
        "/onboarding/step3-phone-1/",
        "/onboarding/step3-phone-2/",
        "/onboarding/step4-username/",
        "/onboarding/step5-experience-deprecated/",
        "/onboarding/step5-preferences-deprecated/",
      ];
      if (whiteListedRoutes.includes(currentRouteName)) {
        return false;
      } else {
        return true;
      }
    } else {
      console.log(`Failed to detect current route name: ${currentRouteName}`);
      return true;
    }
  }

  async function logoutDataCleanup({
    doDeleteKeypair,
  }: {
    doDeleteKeypair: boolean;
  }) {
    const platform: "mobile" | "web" = getPlatform($q.platform);

    if (doDeleteKeypair) {
      await deleteDid(platform);
    }
    clearConversationDrafts();
    clearOpinionDrafts();

    authStore.setLoginStatus({ isKnown: false });

    await loadPostData(false);
    clearProfileData();
  }

  return {
    sendSmsCode,
    verifyPhoneOtp,
    logoutFromServer,
    getDeviceLoginStatus,
    updateAuthState,
    initializeAuthState,
    logoutDataCleanup,
    showLogoutMessageAndRedirect,
  };
}
