import {
  type ApiV1AuthAuthenticatePost200Response,
  type ApiV1AuthAuthenticatePostRequest,
  type ApiV1AuthPhoneVerifyOtpPost200Response,
  type ApiV1AuthPhoneVerifyOtpPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { api } from "boot/axios";
import { buildAuthorizationHeader, deleteDid } from "../crypto/ucan/operation";
import { useCommonApi, type KeyAction } from "./common";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { getPlatform } from "../common";
import { useNotify } from "../ui/notify";
import { RouteMap, useRoute, useRouter } from "vue-router";

export interface AuthenticateReturn {
  isSuccessful: boolean;
  data: ApiV1AuthAuthenticatePost200Response | null;
  error:
    | "already_logged_in"
    | "throttled"
    | "associated_with_another_user"
    | "";
}

interface SendSmsCodeProps {
  phoneNumber: string;
  defaultCallingCode: string;
  isRequestingNewCode: boolean;
  keyAction?: KeyAction;
}

export function useBackendAuthApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { isAuthenticated } = storeToRefs(useAuthenticationStore());
  const { loadPostData } = usePostStore();
  const { loadUserProfile, clearProfileData } = useUserStore();

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

  async function verifyPhoneOtp(
    code: number
  ): Promise<ApiV1AuthPhoneVerifyOtpPost200Response> {
    const params: ApiV1AuthPhoneVerifyOtpPostRequest = {
      code: code,
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

  async function deviceIsLoggedIn(): Promise<boolean> {
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
    return resp.data.isLoggedIn;
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
    await Promise.all([loadUserProfile(), loadPostData(false)]);
  }

  async function initializeAuthState() {
    const isLoggedIn = await deviceIsLoggedIn();
    if (isLoggedIn) {
      isAuthenticated.value = true;
      await loadAuthenticatedModules();
    } else {
      await logoutDataCleanup();

      setTimeout(async function () {
        const needRedirect = needRedirectUnauthenticatedUser();
        if (needRedirect) {
          await showLogoutMessageAndRedirect();
        }
      }, 500);
    }
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
        "/onboarding/step5-preferences/",
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

  async function logoutDataCleanup() {
    const platform: "mobile" | "web" = getPlatform($q.platform);

    await deleteDid(platform);

    isAuthenticated.value = false;

    await loadPostData(false);
    clearProfileData();
  }

  return {
    sendSmsCode,
    verifyPhoneOtp,
    logoutFromServer,
    deviceIsLoggedIn,
    initializeAuthState,
    logoutDataCleanup,
    showLogoutMessageAndRedirect,
  };
}
