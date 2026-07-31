import { describe, expect, it, vi } from "vitest";

import { createSSEConnectionGeneration } from "./connectionGeneration";

function createDeferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolvePromise = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe("SSE connection generation", () => {
  it("aborts and invalidates an attempt when a replacement starts", () => {
    const generation = createSSEConnectionGeneration();
    const firstAttempt = generation.start();

    const secondAttempt = generation.start();

    expect(firstAttempt.abortController.signal.aborted).toBe(true);
    expect(generation.isCurrent(firstAttempt)).toBe(false);
    expect(generation.isCurrent(secondAttempt)).toBe(true);
    expect(secondAttempt.abortController.signal.aborted).toBe(false);
  });

  it("prevents an old attempt from fetching after deferred auth resolves", async () => {
    const generation = createSSEConnectionGeneration();
    const authHeadersReady = createDeferred();
    const fetchWithSignal = vi.fn();
    const firstAttempt = generation.start();
    const finishFirstConnection = async (): Promise<void> => {
      await authHeadersReady.promise;
      if (!generation.isCurrent(firstAttempt)) {
        return;
      }
      fetchWithSignal(firstAttempt.abortController.signal);
    };
    const firstConnectionPromise = finishFirstConnection();

    const secondAttempt = generation.start();
    authHeadersReady.resolve();
    await firstConnectionPromise;

    expect(fetchWithSignal).not.toHaveBeenCalled();
    expect(generation.isCurrent(secondAttempt)).toBe(true);
  });
});
