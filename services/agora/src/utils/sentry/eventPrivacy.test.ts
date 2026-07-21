import {
  isCefSharpCrawlerEvent,
  redactSentryBreadcrumb,
  redactSentryEvent,
  redactSentryTransaction,
  SENTRY_TRACE_PROPAGATION_TARGETS,
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
        message: "https://example.com/private",
        data: { from: "/private/from", to: "/private/to" },
      })
    ).toEqual({
      category: "navigation",
      message: undefined,
      data: undefined,
    });
  });

  it.each(["fetch", "xhr"])(
    "retains only safe method and status from %s breadcrumbs",
    (category) => {
      expect(
        redactSentryBreadcrumb({
          type: "http",
          category,
          message: "POST https://api.agoracitizen.network/private?token=secret",
          data: {
            method: "POST",
            status_code: 201,
            url: "https://api.agoracitizen.network/private?token=secret",
            request_body_size: 123,
            response_body_size: 456,
            request_body: "private request",
          },
        })
      ).toEqual({
        type: "http",
        category,
        message: undefined,
        data: { method: "POST", status_code: 201 },
      });
    }
  );

  it("fails closed for unexpected network breadcrumb values", () => {
    expect(
      redactSentryBreadcrumb({
        category: "fetch",
        data: {
          method: "/private/path",
          status_code: "private status",
          url: "https://example.com/private",
        },
      })
    ).toEqual({ category: "fetch", message: undefined, data: undefined });
  });
});

describe("Sentry error event redaction", () => {
  it("removes requests and extras while allowlisting technical contexts", () => {
    const event = redactSentryEvent({
      request: {
        url: "https://example.com/private?token=secret",
        query_string: "token=secret",
      },
      extra: {
        __serialized__: { private: "captured rejection value" },
        arbitrary: "private extra",
      },
      contexts: {
        browser: {
          name: "Mobile Safari",
          version: "18.5",
          private_field: "private browser data",
        },
        trace: {
          trace_id: "0123456789abcdef0123456789abcdef",
          span_id: "0123456789abcdef",
          op: "ui.vue",
          data: {
            route: "/conversation/private-slug",
            query: "token=secret",
            "http.url": "https://example.com/private",
            "http.request.method": "POST",
          },
        },
        browser_translation_diagnostics: {
          google_class_marker: true,
          font_element_count_bucket: "2-4",
          max_observed_font_depth_bucket: "5-9",
          font_depth_scan_truncated: false,
          private_field: "private diagnostic data",
        },
        arbitrary_context: { private: "private context" },
      },
    });

    expect(event.request).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.contexts).toEqual({
      browser: { name: "Mobile Safari", version: "18.5" },
      trace: {
        trace_id: "0123456789abcdef0123456789abcdef",
        span_id: "0123456789abcdef",
        op: "ui.vue",
      },
      browser_translation_diagnostics: {
        google_class_marker: true,
        font_element_count_bucket: "2-4",
        max_observed_font_depth_bucket: "5-9",
        font_depth_scan_truncated: false,
      },
    });
    expect(JSON.stringify(event)).not.toContain("private");
    expect(JSON.stringify(event)).not.toContain("token");
    expect(JSON.stringify(event)).not.toContain("__serialized__");
  });
});

describe("Sentry transaction redaction", () => {
  it("removes request and span URL data", () => {
    const event = redactSentryTransaction({
      type: "transaction",
      request: { url: "https://example.com/conversation/private-slug" },
      extra: { __serialized__: { route: "/private" } },
      contexts: {
        trace: {
          trace_id: "0123456789abcdef0123456789abcdef",
          span_id: "0123456789abcdef",
          op: "pageload",
          data: {
            route: "/conversation/private-slug",
            query: "invite=secret",
            "http.url": "https://example.com/private",
            "http.request.method": "GET",
          },
        },
        arbitrary_context: { content: "private" },
      },
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
    expect(event.extra).toBeUndefined();
    expect(event.contexts).toEqual({
      trace: {
        trace_id: "0123456789abcdef0123456789abcdef",
        span_id: "0123456789abcdef",
        op: "pageload",
      },
    });
    expect(event.spans?.[0]?.data).toEqual({});
    expect(event.spans?.[0]?.description).toBe("GET [REDACTED_URL]");
    expect(event.spans?.[1]?.description).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("private");
    expect(JSON.stringify(event)).not.toContain("secret");
  });
});

describe("Sentry trace propagation targets", () => {
  const matchesTarget = (url: string): boolean =>
    SENTRY_TRACE_PROPAGATION_TARGETS.some((target) => target.test(url));

  it.each([
    "https://agoracitizen.network/",
    "https://api.agoracitizen.network/api/v1/conversation",
    "https://zkorum.com/",
    "https://staging.zkorum.com/path",
  ])("matches an owned origin: %s", (url) => {
    expect(matchesTarget(url)).toBe(true);
  });

  it.each([
    "https://agoracitizen.network.attacker.example/path",
    "https://zkorum.com.evil.example/path",
    "https://notagoracitizen.network/path",
    "https://notzkorum.com/path",
    "http://agoracitizen.network/path",
  ])("rejects an unowned or insecure origin: %s", (url) => {
    expect(matchesTarget(url)).toBe(false);
  });
});
