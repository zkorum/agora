import {
  type ApiV1AuthAuthenticatePostRequest,
  type ApiV1AuthPhoneVerifyOtpPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import {
  authenticate200,
  type AuthenticateResponse,
  type VerifyOtp200,
  verifyOtp200,
} from "src/shared/types/dto-auth";
import type { SupportedCountryCallingCode } from "src/shared/types/zod";
import { processEnv } from "src/utils/processEnv";

import { api } from "./client";
import {
  type AxiosErrorResponse,
  type AxiosSuccessResponse,
  type KeyAction,
  useCommonApi,
} from "./common";

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

export function useAuthPhoneApi() {
  const {
    buildEncodedUcan,
    createAxiosErrorResponse,
    createRawAxiosRequestConfig,
  } = useCommonApi();

  type SendSmsCodeSuccessResponse = AxiosSuccessResponse<AuthenticateResponse>;

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
        data: authenticate200.parse(otpDetails.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  type VerifyPhoneOtpSuccessResponse = AxiosSuccessResponse<VerifyOtp200>;

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
        data: verifyOtp200.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  return {
    sendSmsCode,
    verifyPhoneOtp,
  };
}
