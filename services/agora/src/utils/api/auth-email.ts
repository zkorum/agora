import {
  type ApiV1AuthEmailAuthenticatePostRequest,
  type ApiV1AuthEmailVerifyOtpPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import {
  authenticateEmail200,
  type AuthenticateEmailResponse,
  type VerifyOtp200,
  verifyOtp200,
} from "src/shared/types/dto-auth";
import { processEnv } from "src/utils/processEnv";

import { api } from "./client";
import {
  type AxiosErrorResponse,
  type AxiosSuccessResponse,
  type KeyAction,
  useCommonApi,
} from "./common";

interface SendEmailCodeProps {
  email: string;
  isRequestingNewCode: boolean;
  keyAction?: KeyAction;
}

interface VerifyEmailOtpProps {
  code: number;
  email: string;
}

export function useAuthEmailApi() {
  const {
    buildEncodedUcan,
    createAxiosErrorResponse,
    createRawAxiosRequestConfig,
  } = useCommonApi();

  type SendEmailCodeSuccessResponse =
    AxiosSuccessResponse<AuthenticateEmailResponse>;

  type SendEmailCodeResponse = SendEmailCodeSuccessResponse | AxiosErrorResponse;

  async function sendEmailCode({
    email,
    isRequestingNewCode,
    keyAction,
  }: SendEmailCodeProps): Promise<SendEmailCodeResponse> {
    try {
      const params: ApiV1AuthEmailAuthenticatePostRequest = {
        email: email,
        isRequestingNewCode: isRequestingNewCode,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AuthEmailAuthenticatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options, keyAction);
      const otpDetails = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AuthEmailAuthenticatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );
      return {
        status: "success",
        data: authenticateEmail200.parse(otpDetails.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  type VerifyEmailOtpSuccessResponse = AxiosSuccessResponse<VerifyOtp200>;

  type VerifyEmailOtpResponse =
    | VerifyEmailOtpSuccessResponse
    | AxiosErrorResponse;

  async function verifyEmailOtp({
    code,
    email,
  }: VerifyEmailOtpProps): Promise<VerifyEmailOtpResponse> {
    const authorizedEmails =
      processEnv.VITE_DEV_AUTHORIZED_EMAILS?.split(",").map((e) =>
        e.trim()
      ) ?? [];
    if (authorizedEmails.includes(email)) {
      code = 0;
    }

    try {
      const params: ApiV1AuthEmailVerifyOtpPostRequest = {
        code: code,
        email: email,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AuthEmailVerifyOtpPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AuthEmailVerifyOtpPost(
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
    sendEmailCode,
    verifyEmailOtp,
  };
}
