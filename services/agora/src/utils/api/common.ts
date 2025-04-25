import { type RawAxiosRequestConfig } from "axios";
import { useQuasar } from "quasar";
import { getPlatform } from "src/utils/common";
import {
  buildAuthorizationHeader,
  buildUcan,
  createDidIfDoesNotExist,
  getDid,
} from "../crypto/ucan/operation";
import { createDidOverwriteIfAlreadyExists } from "../crypto/ucan/operation";

export type KeyAction = "overwrite" | "get" | "create";

export interface AxiosErrorResponse {
  status: "error";
  message: string;
  code:
    | "ERR_FR_TOO_MANY_REDIRECTS"
    | "ERR_BAD_OPTION_VALUE"
    | "ERR_BAD_OPTION"
    | "ERR_NETWORK"
    | "ERR_DEPRECATED"
    | "ERR_BAD_RESPONSE"
    | "ERR_BAD_REQUEST"
    | "ERR_CANCELED"
    | "ECONNABORTED"
    | "ETIMEDOUT";
}

export function useCommonApi() {
  const $q = useQuasar();

  const API_TIMEOUT_LIMIT_MS = 5000;

  interface CreateRawAxiosRequestConfigProps {
    encodedUcan?: string;
  }

  function createRawAxiosRequestConfig({
    encodedUcan,
  }: CreateRawAxiosRequestConfigProps): RawAxiosRequestConfig {
    return {
      headers: encodedUcan
        ? {
            ...buildAuthorizationHeader(encodedUcan),
          }
        : undefined,
      timeout: API_TIMEOUT_LIMIT_MS,
    };
  }

  async function buildEncodedUcan(
    url: string,
    options: RawAxiosRequestConfig,
    keyAction: KeyAction = "create" // if the key doesn't correspond to an existing logged-in user, HTTP requests requiring authentication will throw a 401 error, and the router will redirect the user to the log-in screen, which is the expected behavior
  ) {
    let platform: "mobile" | "web" = "web";

    platform = getPlatform($q.platform);

    let did: string;
    let prefixedKey: string;
    switch (keyAction) {
      case "overwrite": {
        ({ did, prefixedKey } =
          await createDidOverwriteIfAlreadyExists(platform));
        break;
      }
      case "create": {
        ({ did, prefixedKey } = await createDidIfDoesNotExist(platform));
        break;
      }
      case "get": {
        ({ did, prefixedKey } = await getDid(platform));
        break;
      }
    }
    const encodedUcan = await buildUcan({
      did,
      prefixedKey,
      pathname: url,
      method: options.method,
      platform,
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
  };
}
