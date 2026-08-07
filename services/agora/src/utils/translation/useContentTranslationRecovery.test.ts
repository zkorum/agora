import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";

import type { SSEContentTranslationUpdatedData } from "../../shared/types/sse";
import {
  type ContentTranslationRefreshOutcome,
  isContentTranslationEventForIdentity,
  useContentTranslationRecovery,
} from "./useContentTranslationRecovery";

function createEvent({
  status = "completed",
  timestamp = 1,
}: {
  status?: "completed" | "failed";
  timestamp?: number;
} = {}): SSEContentTranslationUpdatedData {
  return {
    subject: {
      kind: "opinion",
      conversationSlugId: "conversation",
      opinionSlugId: "opinion",
      sourceVersion: "00000000-0000-4000-8000-000000000001",
    },
    targetLanguageCode: "en",
    status,
    timestamp,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useContentTranslationRecovery", () => {
  it("matches the complete subject revision and target language", () => {
    const data = createEvent();
    const subject = data.subject;

    expect(
      isContentTranslationEventForIdentity({
        data,
        subject,
        targetLanguageCode: "en",
      })
    ).toBe(true);
    expect(
      isContentTranslationEventForIdentity({
        data,
        subject: {
          ...subject,
          sourceVersion: "00000000-0000-4000-8000-000000000002",
        },
        targetLanguageCode: "en",
      })
    ).toBe(false);
    expect(
      isContentTranslationEventForIdentity({
        data,
        subject,
        targetLanguageCode: "fr",
      })
    ).toBe(false);
  });

  it("uses exponential fallback polling until content settles", async () => {
    vi.useFakeTimers();
    const outcomes: ContentTranslationRefreshOutcome[] = [
      "pending",
      "pending",
      "settled",
    ];
    const refresh = vi.fn(() => Promise.resolve(outcomes.shift() ?? "settled"));
    const scope = effectScope();
    const recovery = scope.run(() =>
      useContentTranslationRecovery({
        identity: "opinion-1",
        enabled: true,
        isPending: true,
        classifyEvent: () => "refresh",
        refresh,
        onFailure: vi.fn(),
        subscribe: () => vi.fn(),
      })
    );

    expect(recovery?.isActive.value).toBe(true);
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(refresh).toHaveBeenCalledTimes(3);
    expect(recovery?.isActive.value).toBe(false);
    scope.stop();
  });

  it("coalesces repeated SSE events while refreshing", async () => {
    let resolveRefresh:
      | ((outcome: ContentTranslationRefreshOutcome) => void)
      | undefined;
    const refresh = vi.fn(
      async () =>
        await new Promise<ContentTranslationRefreshOutcome>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    let listener:
      | ((data: SSEContentTranslationUpdatedData) => void)
      | undefined;
    const scope = effectScope();
    scope.run(() =>
      useContentTranslationRecovery({
        identity: "opinion-1",
        enabled: true,
        isPending: true,
        classifyEvent: () => "refresh",
        refresh,
        onFailure: vi.fn(),
        subscribe: (nextListener) => {
          listener = nextListener;
          return vi.fn();
        },
      })
    );

    listener?.(createEvent({ timestamp: 1 }));
    listener?.(createEvent({ timestamp: 2 }));
    listener?.(createEvent({ timestamp: 3 }));
    expect(refresh).toHaveBeenCalledOnce();

    resolveRefresh?.("pending");
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    scope.stop();
  });

  it("ignores stale events and stops on a current terminal failure", () => {
    const onFailure = vi.fn();
    let listener:
      | ((data: SSEContentTranslationUpdatedData) => void)
      | undefined;
    const scope = effectScope();
    const recovery = scope.run(() =>
      useContentTranslationRecovery({
        identity: "opinion-1",
        enabled: true,
        isPending: true,
        classifyEvent: (data) =>
          data.status === "failed" ? "fail" : "refresh",
        refresh: () => Promise.resolve("pending"),
        onFailure,
        subscribe: (nextListener) => {
          listener = nextListener;
          return vi.fn();
        },
      })
    );

    listener?.(createEvent({ timestamp: 10 }));
    listener?.(createEvent({ status: "failed", timestamp: 9 }));
    expect(onFailure).not.toHaveBeenCalled();

    listener?.(createEvent({ status: "failed", timestamp: 11 }));
    expect(onFailure).toHaveBeenCalledOnce();
    expect(recovery?.isActive.value).toBe(false);
    scope.stop();
  });

  it("invalidates stale work when the request identity changes", async () => {
    vi.useFakeTimers();
    const identity = ref("opinion-1");
    const refresh = vi.fn(() => Promise.resolve("pending" as const));
    const scope = effectScope();
    scope.run(() =>
      useContentTranslationRecovery({
        identity,
        enabled: true,
        isPending: true,
        classifyEvent: () => "refresh",
        refresh,
        onFailure: vi.fn(),
        subscribe: () => vi.fn(),
      })
    );

    identity.value = "opinion-2";
    await nextTick();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(refresh).toHaveBeenCalledOnce();
    scope.stop();
  });

  it("unsubscribes and clears recovery on disposal", async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const refresh = vi.fn(() => Promise.resolve("pending" as const));
    const scope = effectScope();
    scope.run(() =>
      useContentTranslationRecovery({
        identity: "opinion-1",
        enabled: true,
        isPending: true,
        classifyEvent: () => "refresh",
        refresh,
        onFailure: vi.fn(),
        subscribe: () => unsubscribe,
      })
    );

    scope.stop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });
});
