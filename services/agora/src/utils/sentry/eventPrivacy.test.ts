import {
  isCefSharpCrawlerEvent,
  redactSentryBreadcrumb,
  redactSentryTransaction,
  shouldIgnoreSentryEvent,
} from "src/utils/sentry/eventPrivacy";
import { describe, expect, it } from "vitest";

const crawlerValue =
  "Non-Error promise rejection captured with value: Object Not Found Matching Id:1, MethodName:update, ParamCount:4";

describe("CefSharp crawler event detection", () => {
  it("recognizes the exact unhandled non-Error rejection", () => {
    expect(
      isCefSharpCrawlerEvent({
        exception: {
          values: [
            {
              type: "UnhandledRejection",
              value: crawlerValue,
              mechanism: {
                type: "auto.browser.global_handlers.onunhandledrejection",
                handled: false,
              },
            },
          ],
        },
      })
    ).toBe(true);
  });

  it.each([
    {
      exception: {
        values: [{ type: "Error", value: crawlerValue }],
      },
    },
    {
      exception: {
        values: [
          {
            type: "UnhandledRejection",
            value: crawlerValue,
            mechanism: { type: "onunhandledrejection" },
            stacktrace: { frames: [{ in_app: true }] },
          },
        ],
      },
    },
    {
      exception: {
        values: [
          {
            type: "UnhandledRejection",
            value: crawlerValue,
            mechanism: { type: "onunhandledrejection" },
          },
          { type: "Error", value: "Application failure" },
        ],
      },
    },
  ])("retains application and mixed events", (event) => {
    expect(isCefSharpCrawlerEvent(event)).toBe(false);
  });
});

describe("ignored Sentry events", () => {
  it.each([
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
  ])("ignores known benign error: %s", (value) => {
    expect(
      shouldIgnoreSentryEvent({ exception: { values: [{ value }] } })
    ).toBe(true);
  });

  it("retains unrelated errors", () => {
    expect(
      shouldIgnoreSentryEvent({
        exception: { values: [{ type: "Error", value: "Request failed" }] },
      })
    ).toBe(false);
    expect(
      shouldIgnoreSentryEvent({
        exception: {
          values: [{ type: "Error", value: "Telegram postEvent failed" }],
        },
      })
    ).toBe(false);
  });

  it("retains mixed and in-app ResizeObserver events", () => {
    expect(
      shouldIgnoreSentryEvent({
        exception: {
          values: [
            {
              value: "ResizeObserver loop limit exceeded",
              stacktrace: { frames: [{ in_app: true }] },
            },
          ],
        },
      })
    ).toBe(false);
    expect(
      shouldIgnoreSentryEvent({
        exception: {
          values: [
            { value: "ResizeObserver loop limit exceeded" },
            { value: "Application failure" },
          ],
        },
      })
    ).toBe(false);
  });
});

describe("Sentry breadcrumb redaction", () => {
  it("drops console and UI breadcrumbs that may contain user data", () => {
    expect(redactSentryBreadcrumb({ category: "console" })).toBeNull();
    expect(redactSentryBreadcrumb({ category: "ui.click" })).toBeNull();
  });

  it("removes URLs from navigation breadcrumbs", () => {
    expect(
      redactSentryBreadcrumb({
        category: "navigation",
        data: { from: "/private/from", to: "/private/to" },
      })
    ).toEqual({ category: "navigation", data: undefined });
  });

  it("retains operational breadcrumbs", () => {
    const breadcrumb = { category: "http", data: { status_code: 500 } };
    expect(redactSentryBreadcrumb(breadcrumb)).toBe(breadcrumb);
  });
});

describe("Sentry transaction redaction", () => {
  it("removes request and span URL data", () => {
    const event = redactSentryTransaction({
      type: "transaction",
      request: { url: "https://example.com/conversation/private-slug" },
      spans: [
        {
          data: { url: "https://example.com/private" },
          description: "GET https://example.com/private",
          span_id: "0123456789abcdef",
          trace_id: "0123456789abcdef0123456789abcdef",
          start_timestamp: 1,
        },
        {
          data: {},
          description: "/conversation/private-slug",
          op: "navigation",
          span_id: "fedcba9876543210",
          trace_id: "0123456789abcdef0123456789abcdef",
          start_timestamp: 1,
        },
      ],
    });

    expect(event.request).toBeUndefined();
    expect(event.spans?.[0]?.data).toEqual({});
    expect(event.spans?.[0]?.description).toBe("GET [REDACTED_URL]");
    expect(event.spans?.[1]?.description).toBeUndefined();
  });
});
