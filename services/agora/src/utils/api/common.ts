import type { AxiosError } from "axios";
import { type RawAxiosRequestConfig } from "axios";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  buildAuthorizationHeader,
  buildUcan,
  createDidIfDoesNotExist,
  createDidOverwriteIfAlreadyExists,
  getDid,
} from "../crypto/ucan/operation";
import { useNotify } from "../ui/notify";
import {
  type CommonApiTranslations,
  commonApiTranslations,
} from "./common.i18n";

export type KeyAction = "overwrite" | "get" | "create";

export type ApiTimeoutProfile = "standard" | "extended" | "file-upload";

export type AxiosErrorCode =
  | typeof AxiosError.ERR_FR_TOO_MANY_REDIRECTS
  | typeof AxiosError.ERR_BAD_OPTION_VALUE
  | typeof AxiosError.ERR_BAD_OPTION
  | typeof AxiosError.ERR_NETWORK
  | typeof AxiosError.ERR_DEPRECATED
  | typeof AxiosError.ERR_BAD_RESPONSE
  | typeof AxiosError.ERR_BAD_REQUEST
  | typeof AxiosError.ERR_NOT_SUPPORT
  | typeof AxiosError.ERR_INVALID_URL
  | typeof AxiosError.ERR_CANCELED
  | typeof AxiosError.ECONNABORTED
  | typeof AxiosError.ETIMEDOUT;

export interface AxiosSuccessResponse<T> {
  data: T;
  status: "success";
}

export interface AxiosErrorResponse {
  status: "error";
  message: string;
  name: string;
  code: AxiosErrorCode;
}

// Error categorization utilities
export function isTimeoutError(code: AxiosErrorCode): boolean {
  return code === "ECONNABORTED" || code === "ETIMEDOUT";
}

export function isNetworkError(code: AxiosErrorCode): boolean {
  return code === "ERR_NETWORK" || code === "ECONNABORTED";
}

export function isClientError(code: AxiosErrorCode): boolean {
  return (
    code === "ERR_BAD_REQUEST" ||
    code === "ERR_BAD_OPTION" ||
    code === "ERR_BAD_OPTION_VALUE" ||
    code === "ERR_INVALID_URL" ||
    code === "ERR_NOT_SUPPORT"
  );
}

export function isServerError(code: AxiosErrorCode): boolean {
  return code === "ERR_BAD_RESPONSE";
}

export function isCancellationError(code: AxiosErrorCode): boolean {
  return code === "ERR_CANCELED";
}

export function shouldRetryError(code: AxiosErrorCode): boolean {
  // Retry timeouts, network errors, and server errors
  // Don't retry client errors or cancellations
  return (
    isTimeoutError(code) ||
    code === "ERR_NETWORK" ||
    code === "ERR_BAD_RESPONSE"
  );
}

export function useCommonApi() {
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<CommonApiTranslations>(commonApiTranslations);

  const STANDARD_TIMEOUT_MS = 8000;
  const EXTENDED_TIMEOUT_MS = 20000;
  const FILE_UPLOAD_TIMEOUT_MS = 90000;

  interface CreateRawAxiosRequestConfigProps {
    encodedUcan?: string;
    timeoutProfile?: ApiTimeoutProfile;
  }

  interface HandleAxiosStatusCodesProps {
    axiosErrorCode: AxiosErrorCode;
    defaultMessage: string;
  }

  function getErrorMessage(error: AxiosErrorResponse): string {
    if (isTimeoutError(error.code)) {
      return t("timeoutError");
    }

    if (isNetworkError(error.code)) {
      return t("networkError");
    }

    if (isCancellationError(error.code)) {
      return t("requestCanceled");
    }

    // Specific error messages for each code
    switch (error.code) {
      case "ERR_BAD_REQUEST":
        return t("invalidRequest");
      case "ERR_BAD_RESPONSE":
        return t("serverError");
      case "ERR_FR_TOO_MANY_REDIRECTS":
        return t("tooManyRedirects");
      case "ERR_BAD_OPTION":
      case "ERR_BAD_OPTION_VALUE":
        return t("configurationError");
      case "ERR_DEPRECATED":
        return t("featureNotSupported");
      case "ERR_NOT_SUPPORT":
        return t("operationNotSupported");
      case "ERR_INVALID_URL":
        return t("invalidUrl");
      case "ERR_NETWORK":
        return t("networkError");
      case "ERR_CANCELED":
        return t("requestCanceled");
      case "ECONNABORTED":
      case "ETIMEDOUT":
        return t("timeoutError");
      default:
        return error.message || t("unexpectedError");
    }
  }

  function handleAxiosErrorStatusCodes({
    axiosErrorCode,
    defaultMessage,
  }: HandleAxiosStatusCodesProps): void {
    if (axiosErrorCode == "ECONNABORTED") {
      showNotifyMessage(t("noInternetConnection"));
    } else {
      showNotifyMessage(defaultMessage);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createAxiosErrorResponse(error: any): AxiosErrorResponse {
    if ("message" in error && "code" in error && "name" in error) {
      return {
        status: "error",
        message: error.message,
        code: error.code,
        name: error.name,
      };
    } else {
      console.error("Unknown error response");
      return {
        status: "error",
        message: "",
        code: "ECONNABORTED",
        name: error.name,
      };
    }
  }

  function getTimeoutForProfile(profile: ApiTimeoutProfile): number {
    switch (profile) {
      case "standard":
        return STANDARD_TIMEOUT_MS;
      case "extended":
        return EXTENDED_TIMEOUT_MS;
      case "file-upload":
        return FILE_UPLOAD_TIMEOUT_MS;
      default:
        return STANDARD_TIMEOUT_MS;
    }
  }

  function createRawAxiosRequestConfig({
    encodedUcan,
    timeoutProfile = "standard",
  }: CreateRawAxiosRequestConfigProps): RawAxiosRequestConfig {
    return {
      headers: encodedUcan
        ? {
            ...buildAuthorizationHeader(encodedUcan),
          }
        : undefined,
      timeout: getTimeoutForProfile(timeoutProfile),
    };
  }

  async function buildEncodedUcan(
    url: string,
    options: RawAxiosRequestConfig,
    keyAction: KeyAction = "create", // if the key doesn't correspond to an existing logged-in user, HTTP requests requiring authentication will throw a 401 error, and the router will redirect the user to the log-in screen, which is the expected behavior
    lifetimeInSeconds?: number
  ) {
    let did: string;
    let prefixedKey: string;
    switch (keyAction) {
      case "overwrite": {
        ({ did, prefixedKey } =
          await createDidOverwriteIfAlreadyExists());
        break;
      }
      case "create": {
        ({ did, prefixedKey } = await createDidIfDoesNotExist());
        break;
      }
      case "get": {
        ({ did, prefixedKey } = await getDid());
        break;
      }
    }
    const encodedUcan = await buildUcan({
      did,
      prefixedKey,
      pathname: url,
      method: options.method,
      lifetimeInSeconds,
    });
    return encodedUcan;
    // TODO: get DID if exist, else create it
    // then create UCAN, then inject it below
    // if we create it, create a unique cryptographic random ID that is linked to the email address
    // return this so we can go to /onboarding/verify/email/{id}
    // store in Pinia and in secure storage:
    // - email => prefixedKey
    // - flowId => email
    // later after verification, will store UUID => prefixedKey
  }

  return {
    createRawAxiosRequestConfig,
    buildEncodedUcan,
    createAxiosErrorResponse,
    handleAxiosErrorStatusCodes,
    getErrorMessage,
  };
}

// Standalone version for backwards compatibility
export function getErrorMessage(error: AxiosErrorResponse): string {
  const { t } = useComponentI18n<CommonApiTranslations>(commonApiTranslations);

  if (isTimeoutError(error.code)) {
    return t("timeoutError");
  }

  if (isNetworkError(error.code)) {
    return t("networkError");
  }

  if (isCancellationError(error.code)) {
    return t("requestCanceled");
  }

  // Specific error messages for each code
  switch (error.code) {
    case "ERR_BAD_REQUEST":
      return t("invalidRequest");
    case "ERR_BAD_RESPONSE":
      return t("serverError");
    case "ERR_FR_TOO_MANY_REDIRECTS":
      return t("tooManyRedirects");
    case "ERR_BAD_OPTION":
    case "ERR_BAD_OPTION_VALUE":
      return t("configurationError");
    case "ERR_DEPRECATED":
      return t("featureNotSupported");
    case "ERR_NOT_SUPPORT":
      return t("operationNotSupported");
    case "ERR_INVALID_URL":
      return t("invalidUrl");
    case "ERR_NETWORK":
      return t("networkError");
    case "ERR_CANCELED":
      return t("requestCanceled");
    case "ECONNABORTED":
    case "ETIMEDOUT":
      return t("timeoutError");
    default:
      return error.message || t("unexpectedError");
  }
}
