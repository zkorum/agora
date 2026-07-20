import * as BrowserCrypto from "../crypto/ucan/implementation/browser.js";
import { type Implementation } from "./ucan/implementation.js";

const WEB_CRYPTO_STORE_NAME = "agora-keys";
const WEB_CRYPTO_STORE_LOCK_NAME = "agora-web-crypto-store";

interface CreateExclusiveStoreManagerParams<Store> {
  initializeStore: () => Promise<Store>;
  lockManager: LockManager | undefined;
  lockName: string;
}

export interface ExclusiveStoreManager<Store> {
  runExclusive: <Result>(
    operation: (store: Store) => Promise<Result>
  ) => Promise<Result>;
}

// Key creation spans multiple IndexedDB transactions, so initialization,
// signing, and clearing must share one lifecycle lock.
export function createExclusiveStoreManager<Store>({
  initializeStore,
  lockManager,
  lockName,
}: CreateExclusiveStoreManagerParams<Store>): ExclusiveStoreManager<Store> {
  let store: Store | undefined = undefined;
  let operationQueue = Promise.resolve();

  async function runExclusive<Result>(
    operation: (store: Store) => Promise<Result>
  ): Promise<Result> {
    const precedingOperation = operationQueue;
    let releaseOperation = (): void => undefined;
    operationQueue = new Promise<void>((resolve) => {
      releaseOperation = resolve;
    });

    await precedingOperation;

    try {
      const runWithStore = async (): Promise<Result> => {
        if (store === undefined) {
          store = await initializeStore();
        }
        return await operation(store);
      };

      if (lockManager === undefined) {
        return await runWithStore();
      }
      return await lockManager.request(lockName, runWithStore);
    } finally {
      releaseOperation();
    }
  }

  return { runExclusive };
}

const webCryptoStoreManager = createExclusiveStoreManager<Implementation>({
  initializeStore: async () =>
    await BrowserCrypto.implementation({ storeName: WEB_CRYPTO_STORE_NAME }),
  lockManager: navigator.locks,
  lockName: WEB_CRYPTO_STORE_LOCK_NAME,
});

export async function withWebCryptoStore<Result>(
  operation: (store: Implementation) => Promise<Result>
): Promise<Result> {
  return await webCryptoStoreManager.runExclusive(operation);
}

export async function clearWebCryptoStore(): Promise<void> {
  await withWebCryptoStore(async (store) => {
    await store.keystore.clearStore();
  });
}
