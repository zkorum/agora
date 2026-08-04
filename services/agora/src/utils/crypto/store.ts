import { getNewInstance as createBrowserTabsLock } from "browser-tabs-lock/bundleEntry.js";

import * as BrowserCrypto from "../crypto/ucan/implementation/browser.js";
import { type Implementation } from "./ucan/implementation.js";

const WEB_CRYPTO_STORE_NAME = "agora-keys";
const WEB_CRYPTO_STORE_LOCK_NAME = "agora-web-crypto-store";
const CROSS_CONTEXT_LOCK_TIMEOUT_MS = 60_000;
const WEB_CRYPTO_CLEAR_ATTEMPTS = 3;

interface CrossContextLockManager {
  request: <Result>(
    name: string,
    operation: () => Promise<Result>
  ) => Promise<Result>;
}

interface CreateExclusiveStoreManagerParams<Store> {
  initializeStore: () => Promise<Store>;
  lockManager: CrossContextLockManager | undefined;
  lockName: string;
}

interface ExclusiveStoreManager<Store> {
  runExclusive: <Result>(
    operation: (store: Store) => Promise<Result>
  ) => Promise<Result>;
}

interface ClearStoreWithVerificationParams {
  clearStore: () => Promise<void>;
  isStoreEmpty: () => Promise<boolean>;
  maxAttempts?: number;
}

export async function clearStoreWithVerification({
  clearStore,
  isStoreEmpty,
  maxAttempts = WEB_CRYPTO_CLEAR_ATTEMPTS,
}: ClearStoreWithVerificationParams): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let clearError: unknown;
    try {
      await clearStore();
    } catch (error) {
      clearError = error;
    }

    try {
      if (await isStoreEmpty()) {
        return;
      }
      lastError =
        clearError ??
        new Error("Crypto store remained non-empty after clearing");
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error("Failed to clear browser crypto store", {
    cause: lastError,
  });
}

// Key creation spans multiple IndexedDB transactions, so initialization,
// signing, and clearing share one lifecycle lock.
export function createExclusiveStoreManager<Store>({
  initializeStore,
  lockManager,
  lockName,
}: CreateExclusiveStoreManagerParams<Store>): ExclusiveStoreManager<Store> {
  let store: Store | undefined = undefined;
  let operationQueue = Promise.resolve();
  const fallbackLock = createBrowserTabsLock();

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

      if (lockManager !== undefined) {
        return await lockManager.request(lockName, runWithStore);
      }

      const acquired = await fallbackLock.acquireLock(
        lockName,
        CROSS_CONTEXT_LOCK_TIMEOUT_MS
      );
      if (!acquired) {
        throw new Error(`Timed out acquiring cross-tab lock ${lockName}`);
      }
      try {
        return await runWithStore();
      } finally {
        await fallbackLock.releaseLock(lockName);
      }
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
    await clearStoreWithVerification({
      clearStore: store.keystore.clearStore,
      isStoreEmpty: store.keystore.isStoreEmpty,
    });
  });
}
