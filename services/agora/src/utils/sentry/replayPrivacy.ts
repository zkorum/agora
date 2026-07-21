import type {
  Event,
  ReplayBreadcrumbFrame,
  ReplayFrameEvent,
  ReplaySpanFrame,
} from "@sentry/vue";
import { redactSentryEvent } from "src/utils/sentry/eventPrivacy";

export const SENTRY_REPLAY_MASK_ATTRIBUTES = [
  "action",
  "alt",
  "aria-label",
  "cite",
  "formaction",
  "name",
  "ping",
  "placeholder",
  "poster",
  "title",
  "value",
];

const FILTERED_URL = "[Filtered]";
const HTTP_METHODS = new Set([
  "CONNECT",
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
  "TRACE",
]);
const NETWORK_BREADCRUMBS = new Set([
  "eventsource",
  "fetch",
  "http",
  "server-sent-events",
  "sse",
  "xhr",
]);
const URL_DATA_FIELDS = new Set(["from", "previous", "route", "to", "url"]);
const FIRST_PARTY_DOMAINS = [
  "agoracitizen.app",
  "agoracitizen.network",
  "zkorum.com",
];

interface ReplayMetadataEvent extends Event {
  type: "replay_event";
  urls?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReplayMetadataEvent(event: Event): event is ReplayMetadataEvent {
  return event.type === "replay_event";
}

function isFirstPartyHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return FIRST_PARTY_DOMAINS.some(
    (domain) =>
      normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`)
  );
}

export function sanitizeReplayUrl(value: string): string {
  const trimmedValue = value.trim();
  const isRelativeRoute = /^(?:\/(?!\/)|\.\.?\/)/.test(trimmedValue);

  try {
    if (isRelativeRoute) {
      return new URL(trimmedValue, "https://relative.invalid").pathname;
    }

    const parsedUrl = new URL(trimmedValue);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return FILTERED_URL;
    }

    parsedUrl.username = "";
    parsedUrl.password = "";
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return isFirstPartyHostname(parsedUrl.hostname)
      ? `${parsedUrl.origin}${parsedUrl.pathname}`
      : parsedUrl.origin;
  } catch {
    return FILTERED_URL;
  }
}

function getSafeNetworkData(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }

  const method =
    typeof value.method === "string" && HTTP_METHODS.has(value.method)
      ? value.method
      : undefined;
  const rawStatusCode = value.statusCode ?? value.status_code;
  const statusCode =
    typeof rawStatusCode === "number" &&
    Number.isInteger(rawStatusCode) &&
    rawStatusCode >= 0 &&
    rawStatusCode <= 599
      ? rawStatusCode
      : undefined;
  const url =
    typeof value.url === "string" ? sanitizeReplayUrl(value.url) : undefined;

  return {
    ...(method === undefined ? {} : { method }),
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(url === undefined ? {} : { url }),
  };
}

function getSanitizedUrlData(
  value: unknown
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const output: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (URL_DATA_FIELDS.has(key) && typeof fieldValue === "string") {
      output[key] = sanitizeReplayUrl(fieldValue);
    }
  }
  return output;
}

function sanitizeClickData(
  value: unknown
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const output: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    output[key] =
      URL_DATA_FIELDS.has(key) && typeof fieldValue === "string"
        ? sanitizeReplayUrl(fieldValue)
        : fieldValue;
  }
  return output;
}

function sanitizeReplayBreadcrumb(
  breadcrumb: ReplayBreadcrumbFrame
): ReplayBreadcrumbFrame | null {
  if (breadcrumb.category === "console") {
    return null;
  }
  if (NETWORK_BREADCRUMBS.has(breadcrumb.category)) {
    return {
      ...breadcrumb,
      message: undefined,
      data: getSafeNetworkData(breadcrumb.data),
    };
  }
  if (
    breadcrumb.category === "navigation" ||
    breadcrumb.category === "replay.hydrate-error"
  ) {
    return {
      ...breadcrumb,
      message: undefined,
      data: getSanitizedUrlData(breadcrumb.data),
    };
  }
  if (
    breadcrumb.category === "ui.slowClickDetected" ||
    breadcrumb.category === "ui.multiClick"
  ) {
    return {
      ...breadcrumb,
      data: sanitizeClickData(breadcrumb.data),
    };
  }
  return breadcrumb;
}

function sanitizeReplaySpan(span: ReplaySpanFrame): ReplaySpanFrame {
  if (
    span.op === "resource.fetch" ||
    span.op === "resource.xhr" ||
    /(?:eventsource|network|sse)/i.test(span.op)
  ) {
    return {
      ...span,
      description: sanitizeReplayUrl(span.description),
      data: getSafeNetworkData(span.data),
    };
  }
  if (span.op === "navigation.push") {
    const previous = isRecord(span.data) ? span.data.previous : undefined;
    return {
      ...span,
      description: sanitizeReplayUrl(span.description),
      data: {
        previous:
          typeof previous === "string" ? sanitizeReplayUrl(previous) : undefined,
      },
    };
  }
  if (span.op.startsWith("navigation.")) {
    return { ...span, description: sanitizeReplayUrl(span.description) };
  }
  if (span.op.startsWith("resource.")) {
    return { ...span, description: sanitizeReplayUrl(span.description) };
  }
  return span;
}

export function sanitizeReplayRecordingEvent(
  event: ReplayFrameEvent
): ReplayFrameEvent | null {
  if (event.data.tag === "breadcrumb") {
    const payload = sanitizeReplayBreadcrumb(event.data.payload);
    return payload === null
      ? null
      : { ...event, data: { ...event.data, payload } };
  }
  if (event.data.tag === "performanceSpan") {
    return {
      ...event,
      data: {
        ...event.data,
        payload: sanitizeReplaySpan(event.data.payload),
      },
    };
  }
  return event;
}

export function sanitizeReplayEvent(event: Event): Event {
  if (!isReplayMetadataEvent(event)) {
    return event;
  }

  return redactSentryEvent({
    ...event,
    urls: event.urls?.map(sanitizeReplayUrl) ?? [],
    breadcrumbs: undefined,
    logentry: undefined,
    message: undefined,
    tags: undefined,
    transaction: undefined,
    user: undefined,
  });
}
