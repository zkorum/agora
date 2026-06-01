import * as BrowserCrypto from "../crypto/ucan/implementation/browser.js";
import { type Implementation } from "./ucan/implementation.js";

const WEB_CRYPTO_STORE_NAME = "agora-keys";

let webCryptoStore: Implementation | undefined = undefined;
let initPromise: Promise<Implementation> | undefined = undefined;

async function initializeWebCryptoStore(): Promise<Implementation> {
  const store = await BrowserCrypto.implementation({
    storeName: WEB_CRYPTO_STORE_NAME,
  });
  webCryptoStore = store;
  return store;
}

function resetWebCryptoStoreCache(): void {
  webCryptoStore = undefined;
  initPromise = undefined;
}

async function deleteIndexedDbDatabase(databaseName: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);

    request.onerror = () => {
      reject(
        request.error ??
          new Error(`Failed to delete IndexedDB database ${databaseName}`)
      );
    };
    request.onsuccess = () => {
      resolve();
    };
    request.onblocked = () => {
      console.warn(
        `Deletion of IndexedDB database ${databaseName} is blocked by another tab`
      );
      resolve();
    };
  });
}

export async function getWebCryptoStore(): Promise<Implementation> {
  if (webCryptoStore !== undefined) {
    return webCryptoStore;
  }
  if (initPromise === undefined) {
    initPromise = initializeWebCryptoStore();
  }
  try {
    return await initPromise;
  } finally {
    initPromise = undefined;
  }
}

export async function clearWebCryptoStore(): Promise<void> {
  try {
    const store = webCryptoStore ?? (await getWebCryptoStore());
    await store.keystore.clearStore();
  } catch (error) {
    console.warn("Falling back to IndexedDB crypto store deletion", error);
    await deleteIndexedDbDatabase(WEB_CRYPTO_STORE_NAME);
  } finally {
    resetWebCryptoStoreCache();
  }
}
