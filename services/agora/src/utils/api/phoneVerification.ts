import { useBackendAuthApi } from "src/utils/api/auth";
import type {
  ApiV1AuthAuthenticatePost200Response,
  ApiV1AuthPhoneVerifyOtpPost200Response,
} from "src/api";
import type { KeyAction } from "./common";
import { SupportedCountryCallingCode } from "src/shared/types/zod";

interface RequestCodeProps {
  isRequestingNewCode: boolean;
  phoneNumber: string;
  defaultCallingCode: SupportedCountryCallingCode;
  keyAction?: KeyAction;
}

interface SubmitCodeProps {
  code: number;
  phoneNumber: string;
  defaultCallingCode: SupportedCountryCallingCode;
}

export function useBackendPhoneVerification() {
  const { verifyPhoneOtp, sendSmsCode } = useBackendAuthApi();

  async function submitCode({
    code,
    phoneNumber,
    defaultCallingCode,
  }: SubmitCodeProps): Promise<ApiV1AuthPhoneVerifyOtpPost200Response> {
    if (process.env.VITE_DEV_AUTHORIZED_PHONES) {
      code = 0;
    }

    const response = await verifyPhoneOtp({
      code,
      phoneNumber,
      defaultCallingCode,
    });
    return response;
  }

  async function requestCode({
    isRequestingNewCode,
    phoneNumber,
    defaultCallingCode,
    keyAction,
  }: RequestCodeProps): Promise<ApiV1AuthAuthenticatePost200Response> {
    const response = await sendSmsCode({
      phoneNumber,
      defaultCallingCode,
      isRequestingNewCode,
      keyAction,
    });
    return response;
  }

  return { submitCode, requestCode };
}
