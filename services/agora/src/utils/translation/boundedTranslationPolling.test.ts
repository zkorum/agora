import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";

import { useBoundedTranslationPolling } from "./boundedTranslationPolling";

afterEach(() => {
  vi.useRealTimers();
});

describe("useBoundedTranslationPolling", () => {
  it("retries transient request failures up to the configured bound", () => {
    vi.useFakeTimers();
    const onRequestFailureLimit = vi.fn();
    const onTimeout = vi.fn();
    const scope = effectScope();
    const polling = scope.run(() =>
      useBoundedTranslationPolling({
        intervalMs: 500,
        maxDurationMs: 30_000,
        maxConsecutiveRequestFailures: 3,
        onRequestFailureLimit,
        onTimeout,
      })
    );

    expect(polling).toBeDefined();
    if (polling === undefined) return;
    polling.start();
    polling.recordRequestFailure();
    polling.recordRequestFailure();

    expect(polling.isActive.value).toBe(true);
    expect(onRequestFailureLimit).not.toHaveBeenCalled();

    polling.recordRequestFailure();

    expect(polling.isActive.value).toBe(false);
    expect(onRequestFailureLimit).toHaveBeenCalledOnce();
    expect(onTimeout).not.toHaveBeenCalled();
    scope.stop();
  });

  it("resets consecutive failures after a successful status response", () => {
    const onRequestFailureLimit = vi.fn();
    const scope = effectScope();
    const polling = scope.run(() =>
      useBoundedTranslationPolling({
        intervalMs: 500,
        maxDurationMs: 30_000,
        maxConsecutiveRequestFailures: 2,
        onRequestFailureLimit,
        onTimeout: vi.fn(),
      })
    );

    expect(polling).toBeDefined();
    if (polling === undefined) return;
    polling.start();
    polling.recordRequestFailure();
    polling.recordRequestSuccess();
    polling.recordRequestFailure();

    expect(polling.isActive.value).toBe(true);
    expect(onRequestFailureLimit).not.toHaveBeenCalled();
    scope.stop();
  });
});
