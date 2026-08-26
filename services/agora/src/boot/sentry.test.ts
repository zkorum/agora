import * as Sentry from "@sentry/vue";
import { createPinia } from "pinia";
import sentryBoot from "src/boot/sentry";
import { reloadForChunkError } from "src/utils/error/chunkError";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("@sentry/vue", () => ({
  addEventProcessor: vi.fn(),
  browserTracingIntegration: vi.fn(),
  init: vi.fn(),
  replayIntegration: vi.fn(),
  vueIntegration: vi.fn(),
}));

vi.mock("src/utils/sentry/eventPrivacy", () => ({
  redactSentryBreadcrumb: vi.fn((breadcrumb) => breadcrumb),
  redactSentryEvent: vi.fn((event) => event),
  redactSentryTransaction: vi.fn((event) => event),
  SENTRY_TRACE_PROPAGATION_TARGETS: [],
  shouldIgnoreSentryEvent: vi.fn(() => false),
  shouldSuppressSentryTelemetry: vi.fn(() => false),
}));

describe("Sentry chunk error filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DEV", false);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("suppresses only the exact error whose reload recovery started", async () => {
    const app = createApp({});
    const router = createRouter({ history: createMemoryHistory(), routes: [] });
    const store = createPinia();

    await sentryBoot({
      app,
      publicPath: "/",
      redirect: vi.fn(),
      router,
      store,
      urlPath: "/",
    });

    const options = vi.mocked(Sentry.init).mock.calls.at(0)?.at(0);
    if (options?.beforeSend === undefined) {
      throw new Error("Sentry beforeSend was not configured");
    }

    const recoveredError = new Error(
      "Unable to preload CSS for /assets/CommentSection.css"
    );
    expect(
      reloadForChunkError({
        error: recoveredError,
        navigateTo: window.location.href,
      })
    ).toBe("started");

    const event = { message: "chunk preload failed", type: undefined };
    expect(
      await options.beforeSend(event, { originalException: recoveredError })
    ).toBeNull();

    const distinctError = new Error(recoveredError.message);
    expect(
      await options.beforeSend(event, { originalException: distinctError })
    ).not.toBeNull();
  });
});
