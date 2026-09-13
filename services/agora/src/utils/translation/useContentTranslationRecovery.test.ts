import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EffectScope, effectScope, nextTick, ref } from "vue";

import type { SSEContentTranslationUpdatedData } from "../../shared/types/sse";
import { publishContentTranslationEvent } from "./contentTranslationEvents";
import {
  type ContentTranslationRefreshOutcome,
  isContentTranslationEventForIdentity,
  useContentTranslationRecovery,
} from "./useContentTranslationRecovery";

function createEvent({
  status = "completed",
  timestamp = 1,
  opinionSlugId = "opinion",
}: {
  status?: "completed" | "failed";
  timestamp?: number;
  opinionSlugId?: string;
} = {}): SSEContentTranslationUpdatedData {
  return {
    subject: {
      kind: "opinion",
      conversationSlugId: "conversation",
      opinionSlugId,
      sourceVersion: "00000000-0000-4000-8000-000000000001",
    },
    targetLanguageCode: "en",
    status,
    timestamp,
  };
}

const scopes: EffectScope[] = [];

function mountRecovery(
  params: Parameters<typeof useContentTranslationRecovery>[0]
) {
  const scope = effectScope();
  scopes.push(scope);
  const recovery = scope.run(() => useContentTranslationRecovery(params));
  if (recovery === undefined) throw new Error("Test scope did not initialize");
  return { recovery, scope };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
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

  it("uses backoff polling until content settles", async () => {
    const refresh = vi
      .fn<() => Promise<ContentTranslationRefreshOutcome>>()
      .mockResolvedValueOnce("pending")
      .mockResolvedValueOnce("pending")
      .mockResolvedValue("settled");
    const { recovery } = mountRecovery({
      identity: "opinion-1",
      enabled: true,
      isPending: true,
      classifyEvent: () => "refresh",
      refresh,
      onFailure: vi.fn(),
    });

    expect(recovery.isActive.value).toBe(true);
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(refresh).toHaveBeenCalledTimes(3);
    expect(recovery.isActive.value).toBe(false);
  });

  it("coalesces repeated SSE events while refreshing", async () => {
    const first = Promise.withResolvers<ContentTranslationRefreshOutcome>();
    const refresh = vi
      .fn<() => Promise<ContentTranslationRefreshOutcome>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue("pending");
    mountRecovery({
      identity: "opinion-1",
      enabled: true,
      isPending: true,
      classifyEvent: () => "refresh",
      refresh,
      onFailure: vi.fn(),
    });

    publishContentTranslationEvent(createEvent({ timestamp: 1 }));
    publishContentTranslationEvent(createEvent({ timestamp: 2 }));
    publishContentTranslationEvent(createEvent({ timestamp: 3 }));
    expect(refresh).toHaveBeenCalledOnce();
    first.resolve("pending");
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("ignores stale events and stops on a current terminal failure", () => {
    const onFailure = vi.fn();
    const { recovery } = mountRecovery({
      identity: "opinion-1",
      enabled: true,
      isPending: true,
      classifyEvent: (data) => (data.status === "failed" ? "fail" : "refresh"),
      refresh: () => Promise.resolve("pending"),
      onFailure,
    });

    publishContentTranslationEvent(createEvent({ timestamp: 10 }));
    publishContentTranslationEvent(
      createEvent({ status: "failed", timestamp: 9 })
    );
    expect(onFailure).not.toHaveBeenCalled();
    publishContentTranslationEvent(
      createEvent({ status: "failed", timestamp: 11 })
    );
    expect(onFailure).toHaveBeenCalledOnce();
    expect(recovery.isActive.value).toBe(false);
  });

  it.each([10, 9])(
    "refreshes parallel subjects even when their timestamp is %s",
    async (timestamp) => {
      const first = Promise.withResolvers<ContentTranslationRefreshOutcome>();
      const refresh = vi
        .fn<() => Promise<ContentTranslationRefreshOutcome>>()
        .mockReturnValueOnce(first.promise)
        .mockResolvedValue("pending");
      mountRecovery({
        identity: "item-list",
        enabled: true,
        isPending: true,
        classifyEvent: () => "refresh",
        refresh,
        onFailure: vi.fn(),
      });

      publishContentTranslationEvent(
        createEvent({ opinionSlugId: "first", timestamp: 10 })
      );
      publishContentTranslationEvent(
        createEvent({ opinionSlugId: "second", timestamp })
      );
      first.resolve("pending");
      await vi.advanceTimersByTimeAsync(0);
      expect(refresh).toHaveBeenCalledTimes(2);
    }
  );

  it("retains completion during an existing request and refreshes as soon as it finishes", async () => {
    const canRefresh = ref(false);
    const refresh = vi
      .fn<() => Promise<ContentTranslationRefreshOutcome>>()
      .mockResolvedValue("settled");
    mountRecovery({
      identity: "opinion-1",
      enabled: true,
      isPending: true,
      canRefresh,
      classifyEvent: () => "refresh",
      refresh,
      onFailure: vi.fn(),
    });

    publishContentTranslationEvent(createEvent());
    expect(refresh).not.toHaveBeenCalled();
    canRefresh.value = true;
    await nextTick();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps deferred refreshes paused while the document is hidden", async () => {
    const canRefresh = ref(false);
    const visibility = vi.spyOn(document, "visibilityState", "get");
    const refresh = vi
      .fn<() => Promise<ContentTranslationRefreshOutcome>>()
      .mockResolvedValue("settled");
    mountRecovery({
      identity: "opinion-1",
      enabled: true,
      isPending: true,
      canRefresh,
      classifyEvent: () => "refresh",
      refresh,
      onFailure: vi.fn(),
    });

    publishContentTranslationEvent(createEvent());
    visibility.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    canRefresh.value = true;
    await nextTick();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).not.toHaveBeenCalled();

    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each(["stop", "identity", "disable", "settle", "dispose"] as const)(
    "discards deferred refreshes after %s",
    async (change) => {
      const canRefresh = ref(false);
      const identity = ref("opinion-1");
      const enabled = ref(true);
      const isPending = ref(true);
      const refresh = vi
        .fn<() => Promise<ContentTranslationRefreshOutcome>>()
        .mockResolvedValue("settled");
      const { recovery, scope } = mountRecovery({
        identity,
        enabled,
        isPending,
        canRefresh,
        classifyEvent: () => "refresh",
        refresh,
        onFailure: vi.fn(),
      });

      publishContentTranslationEvent(createEvent());
      switch (change) {
        case "stop":
          recovery.stop();
          break;
        case "identity":
          identity.value = "opinion-2";
          break;
        case "disable":
          enabled.value = false;
          break;
        case "settle":
          isPending.value = false;
          break;
        case "dispose":
          scope.stop();
          break;
      }
      canRefresh.value = true;
      await nextTick();
      expect(refresh).not.toHaveBeenCalled();
    }
  );

  it("restarts fast recovery when a completion event races with stale server data", async () => {
    const refresh = vi
      .fn<() => Promise<ContentTranslationRefreshOutcome>>()
      .mockResolvedValue("pending");
    mountRecovery({
      identity: "opinion-1",
      enabled: true,
      isPending: true,
      classifyEvent: () => "refresh",
      refresh,
      onFailure: vi.fn(),
    });

    await vi.advanceTimersByTimeAsync(17_000);
    expect(refresh).toHaveBeenCalledTimes(3);
    publishContentTranslationEvent(createEvent());
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(refresh).toHaveBeenCalledTimes(5);
  });

  it("ignores an old in-flight failure after the request identity changes", async () => {
    const identity = ref("opinion-1");
    const first = Promise.withResolvers<ContentTranslationRefreshOutcome>();
    const onFailure = vi.fn();
    const refresh = vi
      .fn<() => Promise<ContentTranslationRefreshOutcome>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue("settled");
    mountRecovery({
      identity,
      enabled: true,
      isPending: true,
      classifyEvent: () => "refresh",
      refresh,
      onFailure,
    });

    publishContentTranslationEvent(createEvent());
    identity.value = "opinion-2";
    await nextTick();
    first.resolve("failed");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("unsubscribes and clears recovery on disposal", async () => {
    const unsubscribe = vi.fn();
    const refresh = vi
      .fn<() => Promise<ContentTranslationRefreshOutcome>>()
      .mockResolvedValue("pending");
    const { scope } = mountRecovery({
      identity: "opinion-1",
      enabled: true,
      isPending: true,
      classifyEvent: () => "refresh",
      refresh,
      onFailure: vi.fn(),
      subscribe: () => unsubscribe,
    });

    scope.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });
});
