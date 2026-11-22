import { QueryClient } from "@tanstack/vue-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("vote queue UUID browser compatibility", () => {
  it("initializes without native crypto.randomUUID and preserves session ordering", async () => {
    const nativeCrypto = globalThis.crypto;
    const getRandomValues = vi.fn(
      nativeCrypto.getRandomValues.bind(nativeCrypto)
    );
    vi.stubGlobal("crypto", {
      getRandomValues,
    });
    vi.resetModules();
    const { getVoteSubmissionQueue } = await import("./voteSubmissionQueue");
    const queryClient = new QueryClient();
    const queue = getVoteSubmissionQueue(queryClient);
    expect(getRandomValues).not.toHaveBeenCalled();
    const first = queue.nextAction();
    expect(getRandomValues).toHaveBeenCalledOnce();
    const second = getVoteSubmissionQueue(queryClient).nextAction();
    const independent = getVoteSubmissionQueue(new QueryClient()).nextAction();

    expect(z.uuidv4().safeParse(first.sessionId).success).toBe(true);
    expect(second).toEqual({ sessionId: first.sessionId, sequence: 2 });
    expect(first.sequence).toBe(1);
    expect(z.uuidv4().safeParse(independent.sessionId).success).toBe(true);
    expect(independent.sessionId).not.toBe(first.sessionId);
    expect(independent.sequence).toBe(1);
  });
});
