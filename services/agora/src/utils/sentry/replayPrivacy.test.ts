import {
  type Event,
  type ReplayFrameEvent,
  replayIntegration,
} from "@sentry/vue";
import {
  sanitizeReplayEvent,
  sanitizeReplayRecordingEvent,
  sanitizeReplayUrl,
  SENTRY_REPLAY_MASK_ATTRIBUTES,
} from "src/utils/sentry/replayPrivacy";
import { describe, expect, it } from "vitest";

type MaskAttribute = (
  key: string,
  value: string,
  element: HTMLElement
) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMaskAttribute(value: unknown): value is MaskAttribute {
  return typeof value === "function";
}

function getInstalledMaskAttribute(): MaskAttribute {
  const integration = replayIntegration({
    maskAllText: true,
    maskAllInputs: true,
    blockAllMedia: true,
    maskAttributes: SENTRY_REPLAY_MASK_ATTRIBUTES,
  });
  const recordingOptions: unknown = Reflect.get(
    integration,
    "_recordingOptions"
  );
  if (!isRecord(recordingOptions)) {
    throw new Error("Installed Replay recording options are unavailable");
  }
  const maskAttribute = recordingOptions.maskAttributeFn;
  if (!isMaskAttribute(maskAttribute)) {
    throw new Error("Installed Replay attribute masker is unavailable");
  }
  return maskAttribute;
}

describe("installed Replay DOM masking", () => {
  const maskAttribute = getInstalledMaskAttribute();

  it.each(SENTRY_REPLAY_MASK_ATTRIBUTES)(
    "masks the configured %s attribute before recording",
    (attribute) => {
      const value = "private@example.com/path?token=secret";
      expect(
        maskAttribute(attribute, value, document.createElement("div"))
      ).toBe("*".repeat(value.length));
    }
  );
});

describe("Replay URL privacy", () => {
  it.each([
    {
      input:
        "https://user:password@api.agoracitizen.network/api/v1/conversation/private-slug?token=secret#fragment",
      expected:
        "https://api.agoracitizen.network/api/v1/conversation/private-slug",
    },
    {
      input: "https://staging.zkorum.com/project/private-project?invite=secret",
      expected: "https://staging.zkorum.com/project/private-project",
    },
    {
      input:
        "https://agoracitizen.app/conversation/private-slug?token=secret",
      expected: "https://agoracitizen.app/conversation/private-slug",
    },
    {
      input: "/conversation/private-slug?invite=secret#fragment",
      expected: "/conversation/private-slug",
    },
    {
      input: "../project/private-project?invite=secret#fragment",
      expected: "/project/private-project",
    },
    {
      input: "https://user:password@external.example/private/path?token=secret",
      expected: "https://external.example",
    },
    {
      input: "https://agoracitizen.network.attacker.example/private",
      expected: "https://agoracitizen.network.attacker.example",
    },
  ])("sanitizes $input", ({ input, expected }) => {
    expect(sanitizeReplayUrl(input)).toBe(expected);
  });

  it.each([
    "mailto:private@example.com",
    "tel:+33123456789",
    "sms:+33123456789",
    "data:text/plain,private",
    "blob:https://agoracitizen.network/private",
    "javascript:alert('private')",
    "not a valid URL",
  ])("redacts unsafe or malformed URL %s", (url) => {
    expect(sanitizeReplayUrl(url)).toBe("[Filtered]");
  });
});

describe("Replay custom recording event privacy", () => {
  const networkOperations: Array<"resource.fetch" | "resource.xhr"> = [
    "resource.fetch",
    "resource.xhr",
  ];

  it.each(networkOperations)(
    "scrubs %s URLs and bodies while retaining method/status",
    (op) => {
      const event: ReplayFrameEvent = {
        type: 5,
        timestamp: 1_700_000_000_000,
        data: {
          tag: "performanceSpan",
          payload: {
            op,
            description:
              "https://api.agoracitizen.network/api/v1/conversation/private?token=secret",
            startTimestamp: 10,
            endTimestamp: 11,
            data: {
              method: "POST",
              statusCode: 201,
              request: {
                headers: { authorization: "Bearer secret" },
                body: "private request",
              },
              response: { body: "private response" },
            },
          },
        },
      };

      expect(sanitizeReplayRecordingEvent(event)).toEqual({
        ...event,
        data: {
          tag: "performanceSpan",
          payload: {
            op,
            description:
              "https://api.agoracitizen.network/api/v1/conversation/private",
            startTimestamp: 10,
            endTimestamp: 11,
            data: { method: "POST", statusCode: 201 },
          },
        },
      });
    }
  );

  it("scrubs navigation history URLs", () => {
    const event: ReplayFrameEvent = {
      type: 5,
      timestamp: 1_700_000_000_001,
      data: {
        tag: "performanceSpan",
        payload: {
          op: "navigation.push",
          description: "/project/private?invite=secret#fragment",
          startTimestamp: 10,
          endTimestamp: 10,
          data: { previous: "/conversation/private?token=secret" },
        },
      },
    };

    expect(sanitizeReplayRecordingEvent(event)).toEqual({
      ...event,
      data: {
        tag: "performanceSpan",
        payload: {
          op: "navigation.push",
          description: "/project/private",
          startTimestamp: 10,
          endTimestamp: 10,
          data: { previous: "/conversation/private" },
        },
      },
    });
  });

  it("drops console breadcrumbs", () => {
    const event: ReplayFrameEvent = {
      type: 5,
      timestamp: 1_700_000_000_002,
      data: {
        tag: "breadcrumb",
        payload: {
          timestamp: 10,
          type: "default",
          category: "console",
          message: "private console output",
          data: { arguments: ["private"] },
        },
      },
    };

    expect(sanitizeReplayRecordingEvent(event)).toBeNull();
  });

  it("scrubs SSE/network breadcrumb URLs and arbitrary data", () => {
    const event: ReplayFrameEvent = {
      type: 5,
      timestamp: 1_700_000_000_003,
      data: {
        tag: "breadcrumb",
        payload: {
          timestamp: 10,
          type: "http",
          category: "eventsource",
          message:
            "GET https://api.agoracitizen.network/api/v1/notification/stream?token=secret",
          data: {
            method: "GET",
            status_code: 200,
            url: "https://api.agoracitizen.network/api/v1/notification/stream?token=secret",
            response: "private event body",
          },
        },
      },
    };

    expect(sanitizeReplayRecordingEvent(event)).toEqual({
      ...event,
      data: {
        tag: "breadcrumb",
        payload: {
          timestamp: 10,
          type: "http",
          category: "eventsource",
          message: undefined,
          data: {
            method: "GET",
            statusCode: 200,
            url: "https://api.agoracitizen.network/api/v1/notification/stream",
          },
        },
      },
    });
  });

  it("sanitizes navigation breadcrumb URL fields", () => {
    const event: ReplayFrameEvent = {
      type: 5,
      timestamp: 1_700_000_000_004,
      data: {
        tag: "breadcrumb",
        payload: {
          timestamp: 10,
          type: "navigation",
          category: "navigation",
          message: "private navigation",
          data: {
            from: "/conversation/private?token=secret#fragment",
            to: "https://external.example/private/path?email=private@example.com",
            arbitrary: "private data",
          },
        },
      },
    };

    expect(sanitizeReplayRecordingEvent(event)).toEqual({
      ...event,
      data: {
        tag: "breadcrumb",
        payload: {
          timestamp: 10,
          type: "navigation",
          category: "navigation",
          message: undefined,
          data: {
            from: "/conversation/private",
            to: "https://external.example",
          },
        },
      },
    });
  });

  it("retains only external origins for resource span descriptions", () => {
    const event: ReplayFrameEvent = {
      type: 5,
      timestamp: 1_700_000_000_005,
      data: {
        tag: "performanceSpan",
        payload: {
          op: "resource.script",
          description:
            "https://cdn.example.com/private.js?token=secret#fragment",
          startTimestamp: 10,
          endTimestamp: 11,
          data: { size: 1234, encodedBodySize: 1000, decodedBodySize: 2000 },
        },
      },
    };

    expect(sanitizeReplayRecordingEvent(event)).toEqual({
      ...event,
      data: {
        tag: "performanceSpan",
        payload: {
          op: "resource.script",
          description: "https://cdn.example.com",
          startTimestamp: 10,
          endTimestamp: 11,
          data: { size: 1234, encodedBodySize: 1000, decodedBodySize: 2000 },
        },
      },
    });
  });

  it("leaves non-sensitive options events unchanged", () => {
    const event: ReplayFrameEvent = {
      type: 5,
      timestamp: 1_700_000_000_006,
      data: {
        tag: "options",
        payload: {
          blockAllMedia: true,
          errorSampleRate: 1,
          maskAllInputs: true,
          maskAllText: true,
          networkCaptureBodies: false,
          networkDetailHasUrls: false,
          networkRequestHasHeaders: false,
          networkResponseHasHeaders: false,
          sessionSampleRate: 0,
          shouldRecordCanvas: false,
          useCompression: true,
          useCompressionOption: true,
        },
      },
    };

    expect(sanitizeReplayRecordingEvent(event)).toBe(event);
  });
});

describe("Replay metadata event privacy", () => {
  it("removes visited URLs and unsafe scoped metadata", () => {
    const event: Event & { type: "replay_event"; urls: string[] } = {
      type: "replay_event",
      urls: [
        "https://agoracitizen.network/conversation/private?token=secret",
        "https://external.example/private/path?email=private@example.com",
        "mailto:private@example.com",
      ],
      request: { url: "https://agoracitizen.network/private" },
      extra: { __serialized__: { secret: "private" } },
      user: { email: "private@example.com" },
      tags: { route: "/conversation/private" },
      transaction: "/conversation/private",
      contexts: {
        browser: { name: "Mobile Safari", version: "18.5" },
        arbitrary: { secret: "private" },
      },
    };

    expect(sanitizeReplayEvent(event)).toEqual({
      type: "replay_event",
      urls: [
        "https://agoracitizen.network/conversation/private",
        "https://external.example",
        "[Filtered]",
      ],
      request: undefined,
      extra: undefined,
      user: undefined,
      tags: undefined,
      transaction: undefined,
      breadcrumbs: undefined,
      logentry: undefined,
      message: undefined,
      contexts: { browser: { name: "Mobile Safari", version: "18.5" } },
    });
  });

  it("does not modify non-Replay events", () => {
    const event: Event = { message: "Application error" };
    expect(sanitizeReplayEvent(event)).toBe(event);
  });
});
