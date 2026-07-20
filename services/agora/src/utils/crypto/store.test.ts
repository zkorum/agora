import { describe, expect, it, vi } from "vitest";

import { createExclusiveStoreManager } from "./store";

function createDeferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("createExclusiveStoreManager", () => {
  it("serializes operations and initializes the store once", async () => {
    const firstOperationStarted = createDeferred();
    const releaseFirstOperation = createDeferred();
    const initializeStore = vi.fn(() => Promise.resolve("store"));
    const secondOperation = vi.fn((store: string) =>
      Promise.resolve(`${store}-second`)
    );
    const manager = createExclusiveStoreManager<string>({
      initializeStore,
      lockManager: undefined,
      lockName: "test-store",
    });

    const firstResult = manager.runExclusive(async (store) => {
      firstOperationStarted.resolve();
      await releaseFirstOperation.promise;
      return `${store}-first`;
    });
    await firstOperationStarted.promise;

    const secondResult = manager.runExclusive(secondOperation);
    await Promise.resolve();
    expect(secondOperation).not.toHaveBeenCalled();

    releaseFirstOperation.resolve();

    await expect(firstResult).resolves.toBe("store-first");
    await expect(secondResult).resolves.toBe("store-second");
    expect(initializeStore).toHaveBeenCalledOnce();
  });

  it("uses the named cross-context lock when available", async () => {
    const requestedLockNames: string[] = [];
    const lockManager = {
      async request<Result>(
        name: string,
        operation: () => Promise<Result>
      ): Promise<Result> {
        requestedLockNames.push(name);
        return await operation();
      },
    };
    const manager = createExclusiveStoreManager<string>({
      initializeStore: () => Promise.resolve("store"),
      lockManager,
      lockName: "test-store",
    });

    await expect(
      manager.runExclusive((store) => Promise.resolve(store))
    ).resolves.toBe("store");
    expect(requestedLockNames).toEqual(["test-store"]);
  });

  it("continues processing after an operation fails", async () => {
    const manager = createExclusiveStoreManager<string>({
      initializeStore: () => Promise.resolve("store"),
      lockManager: undefined,
      lockName: "test-store",
    });

    const failedOperation = manager.runExclusive(() =>
      Promise.reject(new Error("operation failed"))
    );
    const nextOperation = manager.runExclusive((store) =>
      Promise.resolve(store)
    );

    await expect(failedOperation).rejects.toThrow("operation failed");
    await expect(nextOperation).resolves.toBe("store");
  });

  it("retries initialization after an initialization failure", async () => {
    const initializeStore = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("initialization failed"))
      .mockResolvedValueOnce("store");
    const manager = createExclusiveStoreManager<string>({
      initializeStore,
      lockManager: undefined,
      lockName: "test-store",
    });

    const failedOperation = manager.runExclusive((store) =>
      Promise.resolve(store)
    );
    await expect(failedOperation).rejects.toThrow("initialization failed");

    const retriedOperation = manager.runExclusive((store) =>
      Promise.resolve(store)
    );
    await expect(retriedOperation).resolves.toBe("store");
    expect(initializeStore).toHaveBeenCalledTimes(2);
  });
});
