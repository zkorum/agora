import { describe, expect, it, vi } from "vitest";

import type { SSEContentTranslationUpdatedData } from "../../shared/types/sse";
import {
  publishContentTranslationEvent,
  subscribeToContentTranslationEvents,
} from "./contentTranslationEvents";

const event: SSEContentTranslationUpdatedData = {
  subject: {
    kind: "conversation",
    conversationSlugId: "conversation",
    sourceVersion: "00000000-0000-4000-8000-000000000001",
  },
  targetLanguageCode: "en",
  status: "completed",
  timestamp: 1,
};

describe("contentTranslationEvents", () => {
  it("isolates listeners and unsubscribes them independently", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const failingListener = vi.fn(() => {
      throw new Error("listener failed");
    });
    const healthyListener = vi.fn();
    const unsubscribeFailing =
      subscribeToContentTranslationEvents(failingListener);
    const unsubscribeHealthy =
      subscribeToContentTranslationEvents(healthyListener);

    publishContentTranslationEvent(event);

    expect(failingListener).toHaveBeenCalledOnce();
    expect(healthyListener).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledOnce();

    unsubscribeFailing();
    unsubscribeHealthy();
    publishContentTranslationEvent(event);
    expect(healthyListener).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
