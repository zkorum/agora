import type { Event } from "@sentry/vue";
import {
  isCefSharpCrawlerEvent,
  redactSentryBreadcrumb,
  redactSentryEvent,
  redactSentryTransaction,
  SENTRY_TRACE_PROPAGATION_TARGETS,
  shouldIgnoreSentryEvent,
  shouldSuppressSentryTelemetry,
} from "src/utils/sentry/eventPrivacy";
import { describe, expect, it } from "vitest";

const crawlerValue =
  "Non-Error promise rejection captured with value: Object Not Found Matching Id:1, MethodName:update, ParamCount:4";
const metaIosBridgeValue =
  "undefined is not an object (evaluating 'window.webkit.messageHandlers')";

interface MetaPageHideFrame {
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
  in_app?: boolean;
}

interface CreateMetaPageHideEventParams {
  value?: string;
  mechanismType?: string;
  handled?: boolean;
  frames?: MetaPageHideFrame[];
  includeAdditionalException?: boolean;
}

function createMetaPageHideFrames(): MetaPageHideFrame[] {
  const filename = "app:///conversation/example/analysis";
  return [
    { filename, function: "?", lineno: 1, colno: 5421, in_app: true },
    {
      filename,
      function: "sendPageHideMessage",
      lineno: 1,
      colno: 3712,
      in_app: true,
    },
    {
      filename,
      function: "sendDataToNative",
      lineno: 1,
      colno: 1142,
      in_app: true,
    },
  ];
}

function createMetaPageHideEvent({
  value = metaIosBridgeValue,
  mechanismType = "auto.browser.global_handlers.onerror",
  handled = false,
  frames = createMetaPageHideFrames(),
  includeAdditionalException = false,
}: CreateMetaPageHideEventParams = {}): Event {
  return {
    exception: {
      values: [
        {
          type: "TypeError",
          value,
          mechanism: { type: mechanismType, handled },
          stacktrace: { frames },
        },
        ...(includeAdditionalException
          ? [{ type: "Error", value: "Application failure" }]
          : []),
      ],
    },
  };
}

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

describe("Meta iOS bridge event detection", () => {
  it("recognizes Meta's injected WKWebView page-hide failure", () => {
    expect(shouldIgnoreSentryEvent(createMetaPageHideEvent())).toBe(true);
  });

  it("recognizes the semantic signature across Meta script revisions", () => {
    const frames = createMetaPageHideFrames().map((frame, index) => ({
      ...frame,
      colno: 7000 - index,
    }));

    expect(shouldIgnoreSentryEvent(createMetaPageHideEvent({ frames }))).toBe(
      true
    );
  });

  it("accepts an unnamed initial page-hide callback", () => {
    const frames = createMetaPageHideFrames();
    const firstFrame = frames[0];
    if (firstFrame !== undefined) {
      firstFrame.function = undefined;
    }

    expect(shouldIgnoreSentryEvent(createMetaPageHideEvent({ frames }))).toBe(
      true
    );
  });

  it.each<{ name: string; event: Event }>([
    {
      name: "a similar application message",
      event: createMetaPageHideEvent({
        value: "Application failed while reading window.webkit.messageHandlers",
      }),
    },
    {
      name: "a handled exception",
      event: createMetaPageHideEvent({ handled: true }),
    },
    {
      name: "another capture mechanism",
      event: createMetaPageHideEvent({ mechanismType: "onerror" }),
    },
    {
      name: "an application asset source",
      event: createMetaPageHideEvent({
        frames: createMetaPageHideFrames().map((frame) => ({
          ...frame,
          filename: "app:///assets/application.js",
        })),
      }),
    },
    {
      name: "different frame sources",
      event: createMetaPageHideEvent({
        frames: createMetaPageHideFrames().map((frame, index) =>
          index === 1
            ? { ...frame, filename: "app:///conversation/other/analysis" }
            : frame
        ),
      }),
    },
    {
      name: "a non-inline frame",
      event: createMetaPageHideEvent({
        frames: createMetaPageHideFrames().map((frame, index) =>
          index === 1 ? { ...frame, lineno: 2 } : frame
        ),
      }),
    },
    {
      name: "a changed bridge function",
      event: createMetaPageHideEvent({
        frames: createMetaPageHideFrames().map((frame, index) =>
          index === 2 ? { ...frame, function: "applicationHandler" } : frame
        ),
      }),
    },
    {
      name: "an additional application frame",
      event: createMetaPageHideEvent({
        frames: [
          ...createMetaPageHideFrames(),
          {
            filename: "app:///assets/application.js",
            function: "applicationHandler",
          },
        ],
      }),
    },
    {
      name: "an additional application exception",
      event: createMetaPageHideEvent({ includeAdditionalException: true }),
    },
  ])("retains $name", ({ event }) => {
    expect(shouldIgnoreSentryEvent(event)).toBe(false);
  });
});

describe("injected document stack overflow detection", () => {
  function createStackOverflowEvent({
    filenames,
    functions = undefined,
    value = "Maximum call stack size exceeded.",
    includeAdditionalException = false,
  }: {
    filenames?: Array<string | undefined>;
    functions?: string[];
    value?: string;
    includeAdditionalException?: boolean;
  }): Event {
    return {
      exception: {
        values: [
          {
            type: "RangeError",
            value,
            ...(filenames === undefined
              ? {}
              : {
                  stacktrace: {
                    frames: filenames.map((filename, index) => ({
                      filename,
                      function:
                        functions?.[index] ?? (index % 2 === 0 ? "Ik" : "Gk"),
                    })),
                  },
                }),
          },
          ...(includeAdditionalException
            ? [{ type: "Error", value: "Application failure" }]
            : []),
        ],
      },
    };
  }

  it("ignores an overflow attributed entirely to one host document", () => {
    expect(
      shouldIgnoreSentryEvent(
        createStackOverflowEvent({
          filenames: Array.from(
            { length: 40 },
            () => "app:///conversation/example/"
          ),
        })
      )
    ).toBe(true);
  });

  it("accepts the browser variant without a trailing period", () => {
    expect(
      shouldIgnoreSentryEvent(
        createStackOverflowEvent({
          filenames: Array.from({ length: 20 }, () => "/conversation/example/"),
          value: "Maximum call stack size exceeded",
        })
      )
    ).toBe(true);
  });

  it.each(["/assets/application.js", "app:///src/App.vue", "src/store.ts"])(
    "retains an overflow attributed to application source %s",
    (applicationFilename) => {
      expect(
        shouldIgnoreSentryEvent(
          createStackOverflowEvent({
            filenames: Array.from({ length: 40 }, () => applicationFilename),
          })
        )
      ).toBe(false);
    }
  );

  it("retains an overflow attributed to different documents", () => {
    expect(
      shouldIgnoreSentryEvent(
        createStackOverflowEvent({
          filenames: Array.from({ length: 40 }, (_, index) =>
            index === 20 ? "/conversation/two/" : "/conversation/one/"
          ),
        })
      )
    ).toBe(false);
  });

  it("retains short, partially attributed, and non-signature stacks", () => {
    const documentFilename = "/conversation/example/";
    expect(
      shouldIgnoreSentryEvent(
        createStackOverflowEvent({
          filenames: Array.from({ length: 19 }, () => documentFilename),
        })
      )
    ).toBe(false);
    expect(
      shouldIgnoreSentryEvent(
        createStackOverflowEvent({
          filenames: Array.from({ length: 40 }, (_, index) =>
            index === 20 ? undefined : documentFilename
          ),
        })
      )
    ).toBe(false);
    expect(
      shouldIgnoreSentryEvent(
        createStackOverflowEvent({
          filenames: Array.from({ length: 40 }, () => documentFilename),
          functions: Array.from({ length: 40 }, () => "renderApplication"),
        })
      )
    ).toBe(false);
  });

  it("retains stackless and mixed events", () => {
    expect(shouldIgnoreSentryEvent(createStackOverflowEvent({}))).toBe(false);
    expect(
      shouldIgnoreSentryEvent(
        createStackOverflowEvent({
          filenames: ["/conversation/example/"],
          includeAdditionalException: true,
        })
      )
    ).toBe(false);
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

  it("ignores a ResizeObserver error with a synthetic document frame", () => {
    expect(
      shouldIgnoreSentryEvent({
        exception: {
          values: [
            {
              type: "Error",
              value: "ResizeObserver loop limit exceeded",
              stacktrace: {
                frames: [
                  {
                    filename: "/settings/languages/display-language/",
                    function: "?",
                    lineno: 0,
                    colno: 0,
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
      })
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

  it.each([
    {
      name: "a bundled application frame",
      frame: {
        filename: "/assets/application.js",
        function: "resizeLayout",
        lineno: 42,
        colno: 5,
        in_app: true,
      },
    },
    {
      name: "an inline application frame",
      frame: {
        filename: "/settings/languages/display-language/",
        function: "resizeLayout",
        lineno: 1,
        colno: 5,
        in_app: true,
      },
    },
  ])("retains a ResizeObserver error with $name", ({ frame }) => {
    expect(
      shouldIgnoreSentryEvent({
        exception: {
          values: [
            {
              value: "ResizeObserver loop limit exceeded",
              stacktrace: { frames: [frame] },
            },
          ],
        },
      })
    ).toBe(false);
  });

  it("retains mixed ResizeObserver events", () => {
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
  it("drops navigation breadcrumbs containing recipient bearer paths", () => {
    expect(
      redactSentryBreadcrumb({
        category: "navigation",
        data: {
          from: "/safe",
          to: "/email-updates/preferences/secret-token",
        },
      })
    ).toBeNull();
  });

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
  it("suppresses telemetry while the current route contains a bearer token", () => {
    window.history.replaceState({}, "", "/email-updates/report/secret-token");
    expect(shouldSuppressSentryTelemetry({ message: "failure" })).toBe(true);
    window.history.replaceState({}, "", "/");
  });

  it("suppresses events that captured a recipient bearer path", () => {
    expect(
      shouldSuppressSentryTelemetry({
        request: {
          url: "https://agoracitizen.network/email-updates/unsubscribe/secret-token",
        },
      })
    ).toBe(true);
  });

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
