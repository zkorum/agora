import { type RawAxiosRequestConfig } from "axios";
import { useQuasar } from "quasar";
import { getPlatform } from "src/utils/common";
import {
  buildUcan,
  createDidIfDoesNotExist,
  getDid,
} from "../crypto/ucan/operation";
import { createDidOverwriteIfAlreadyExists } from "../crypto/ucan/operation";

export type KeyAction = "overwrite" | "get" | "create";

export function useCommonApi() {
  const $q = useQuasar();

  async function buildEncodedUcan(
    url: string,
    options: RawAxiosRequestConfig,
    keyAction: KeyAction = "create" // if the key doesn't correspond to an existing logged-in user, HTTP requests requiring authentication will throw a 401 error, and the router will redirect the user to the log-in screen, which is the expected behavior
  ) {
    let platform: "mobile" | "web" = "web";

    platform = getPlatform($q.platform);

    console.log("Build UCAN");

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

  return { buildEncodedUcan };
}
