import {
  type ApiV1AuthAuthenticatePost200Response,
  type ApiV1AuthAuthenticatePostRequest,
  type ApiV1AuthVerifyPhoneOtpPost200Response,
  type ApiV1AuthVerifyPhoneOtpPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { axios, api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi, type KeyAction } from "./common";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";
import { storeToRefs } from "pinia";

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
  const { loadUserProfile } = useUserStore();

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
  ): Promise<ApiV1AuthVerifyPhoneOtpPost200Response> {
    const params: ApiV1AuthVerifyPhoneOtpPostRequest = {
      code: code,
    };
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthVerifyPhoneOtpPost(params);
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthVerifyPhoneOtpPost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return response.data;
  }

  async function deviceIsLoggedIn() {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthCheckLoginStatusPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
  }

  async function logout() {
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

  function loadAuthenticatedModules() {
    loadUserProfile();
  }

  async function initializeAuthState() {
    try {
      await deviceIsLoggedIn();
      isAuthenticated.value = true;
      loadAuthenticatedModules();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 401 || e.response?.status === 403) {
          // unauthorized or forbidden
          isAuthenticated.value = false;
        } else {
          console.error(
            "Unexpected status when checking if device is logged-in",
            e
          );
          // properly present error and recover
          isAuthenticated.value = false;
        }
      } else {
        console.error(
          "Unexpected error when checking if device is logged-in",
          e
        );
        // properly present error and recover
        isAuthenticated.value = false;
      }
    } finally {
      loadPostData(false);
    }
  }

  return {
    sendSmsCode,
    verifyPhoneOtp,
    logout,
    deviceIsLoggedIn,
    initializeAuthState,
  };
}
