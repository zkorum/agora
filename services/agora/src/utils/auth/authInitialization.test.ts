import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAuthInitializationController,
  isTransientAuthInitializationError,
} from "./authInitialization";

function createAxiosError({
  code,
  status,
}: {
  code?: string;
  status?: number;
}): AxiosError {
  return new AxiosError(
    "request failed",
    code,
    undefined,
    undefined,
    status === undefined
      ? undefined
      : {
          data: undefined,
          status,
          statusText: "failed",
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
  );
}

describe("auth initialization", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("classifies only transient Axios failures for retry", () => {
    expect(
      isTransientAuthInitializationError(
        createAxiosError({ code: "ERR_NETWORK" })
      )
    ).toBe(true);
    expect(
      isTransientAuthInitializationError(createAxiosError({ status: 503 }))
    ).toBe(true);
    expect(
      isTransientAuthInitializationError(createAxiosError({ status: 401 }))
    ).toBe(false);
    expect(isTransientAuthInitializationError(new Error("invalid data"))).toBe(
      false
    );
  });

  it("fails open and retries transient startup failures in the background", async () => {
    vi.useFakeTimers();
    const networkError = createAxiosError({ code: "ERR_NETWORK" });
    const refreshAuthState = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue();
    const markInitialized = vi.fn();
    const onError = vi.fn();
    const controller = createAuthInitializationController({
      refreshAuthState,
      markInitialized,
      onError,
      retryDelaysMs: [100],
    });

    await controller.initialize();

    expect(markInitialized).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(networkError);
    expect(refreshAuthState).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(100);

    expect(refreshAuthState).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it("backs off repeated transient failures", async () => {
    vi.useFakeTimers();
    const refreshAuthState = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(createAxiosError({ status: 503 }));
    const controller = createAuthInitializationController({
      refreshAuthState,
      markInitialized: vi.fn(),
      onError: vi.fn(),
      retryDelaysMs: [100, 300],
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(100);
    expect(refreshAuthState).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(299);
    expect(refreshAuthState).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(refreshAuthState).toHaveBeenCalledTimes(3);
    controller.stop();
  });

  it("does not retry authoritative or malformed responses", async () => {
    vi.useFakeTimers();
    const refreshAuthState = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(createAxiosError({ status: 401 }));
    const controller = createAuthInitializationController({
      refreshAuthState,
      markInitialized: vi.fn(),
      onError: vi.fn(),
      retryDelaysMs: [100],
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(refreshAuthState).toHaveBeenCalledOnce();
    controller.stop();
  });

  it("deduplicates a manual retry with an in-flight background retry", async () => {
    vi.useFakeTimers();
    let finishRetry: (() => void) | undefined;
    const refreshAuthState = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(createAxiosError({ code: "ERR_NETWORK" }))
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishRetry = resolve;
          })
      );
    const controller = createAuthInitializationController({
      refreshAuthState,
      markInitialized: vi.fn(),
      onError: vi.fn(),
      retryDelaysMs: [100],
    });
    await controller.initialize();
    await vi.advanceTimersByTimeAsync(100);

    const manualRetry = controller.retryNow();
    expect(refreshAuthState).toHaveBeenCalledTimes(2);
    finishRetry?.();
    await manualRetry;
    controller.stop();
  });
});
