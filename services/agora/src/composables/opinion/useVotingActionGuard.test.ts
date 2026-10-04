import { describe, expect, it, vi } from "vitest";

import { useVotingActionGuard } from "./useVotingActionGuard";

describe("voting action coordination", () => {
  it("locks before participation checks and rejects overlapping writes", async () => {
    const guard = useVotingActionGuard();
    const pending = Promise.withResolvers<void>();
    const secondWrite = vi.fn();
    const first = guard.run(async () => {
      await pending.promise;
      return "saved";
    });

    expect(guard.isPending.value).toBe(true);
    await expect(guard.run(secondWrite)).resolves.toBeUndefined();
    expect(secondWrite).not.toHaveBeenCalled();
    pending.resolve();
    await expect(first).resolves.toBe("saved");
    expect(guard.isPending.value).toBe(false);
  });

  it("does not release a new session's lock when an old request completes", async () => {
    const guard = useVotingActionGuard();
    const oldRequest = Promise.withResolvers<void>();
    const newRequest = Promise.withResolvers<void>();
    const oldIsCurrent = guard.capture();
    const oldAction = guard.run(async () => {
      await oldRequest.promise;
      return "old";
    });
    guard.invalidate();
    const newAction = guard.run(async () => {
      await newRequest.promise;
      return "new";
    });

    oldRequest.resolve();
    await expect(oldAction).resolves.toBeUndefined();
    expect(oldIsCurrent()).toBe(false);
    expect(guard.isPending.value).toBe(true);
    newRequest.resolve();
    await expect(newAction).resolves.toBe("new");
    expect(guard.isPending.value).toBe(false);
  });

  it("permits retry after a failed write", async () => {
    const guard = useVotingActionGuard();
    await expect(guard.run(() => Promise.reject(new Error("network failure"))))
      .rejects.toThrow("network failure");
    expect(guard.isPending.value).toBe(false);
    await expect(guard.run(() => Promise.resolve("retried"))).resolves.toBe("retried");
  });
});
