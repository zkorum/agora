import * as BrowserCrypto from "../crypto/ucan/implementation/browser.js";
import { type Implementation } from "./ucan/implementation.js";

let webCryptoStore: Implementation | undefined = undefined;
let initPromise: Promise<Implementation> | undefined = undefined;

export async function getWebCryptoStore(): Promise<Implementation> {
  if (webCryptoStore !== undefined) {
    return webCryptoStore;
  }
  if (initPromise === undefined) {
    initPromise = BrowserCrypto.implementation({
      storeName: "agora-keys",
    }).then((store) => {
      webCryptoStore = store;
      initPromise = undefined;
      return store;
    });
  }
  return initPromise;
}
