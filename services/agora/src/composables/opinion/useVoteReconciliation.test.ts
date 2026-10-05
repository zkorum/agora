import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";

import { useVoteReconciliation } from "./useVoteReconciliation";

afterEach(() => vi.useRealTimers());

describe("bounded vote reconciliation", () => {
  it("backs off and stops after six unsuccessful reads", async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    const confirm = vi.fn(() => Promise.resolve());
    scope.run(() => {
      const reconciliation = useVoteReconciliation({
        needsConfirmation: true, isBusy: false, captureSession: () => () => true, confirm,
      });
      reconciliation.restart();
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(confirm).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(confirm).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(confirm).toHaveBeenCalledTimes(6);
    scope.stop();
  });

  it("aborts an in-flight read while voting and rejects its stale callback", async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    const busy = ref(false);
    const deferred = Promise.withResolvers<void>();
    let captured: { signal: AbortSignal; isCurrent: () => boolean } | undefined;
    scope.run(() => {
      const reconciliation = useVoteReconciliation({
        needsConfirmation: true, isBusy: busy, captureSession: () => () => true,
        confirm: context => { captured = context; return deferred.promise; },
      });
      reconciliation.restart();
    });
    await vi.advanceTimersByTimeAsync(1000);
    busy.value = true;
    await vi.advanceTimersByTimeAsync(0);
    expect(captured?.signal.aborted).toBe(true);
    expect(captured?.isCurrent()).toBe(false);
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(0);
    scope.stop();
  });
});
