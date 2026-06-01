export type BrowserLogLevel = "debug" | "info" | "log" | "warn" | "error";

export type BrowserLogMetadataValue = string | number | boolean | null;

export interface BrowserLogEvent {
  level: BrowserLogLevel;
  category: string;
  message: string;
  stack?: string | undefined;
  metadata?: Record<string, BrowserLogMetadataValue> | undefined;
}

const DEV_BROWSER_LOG_ENDPOINT = "/__agora_dev_browser_log";
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_STACK_LENGTH = 8_000;
const MAX_METADATA_LENGTH = 1_000;

let sequence = 0;

function truncate({
  value,
  maxLength,
}: {
  value: string;
  maxLength: number;
}): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...[truncated]`;
}

function serializeUnknown(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "symbol") {
    return value.description === undefined
      ? "Symbol()"
      : `Symbol(${value.description})`;
  }
  if (typeof value === "function") {
    return value.name ? `[function ${value.name}]` : "[function]";
  }
  try {
    return JSON.stringify(value) ?? Object.prototype.toString.call(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function normalizeMetadata(
  metadata: Record<string, BrowserLogMetadataValue> | undefined
): Record<string, BrowserLogMetadataValue> | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      typeof value === "string"
        ? truncate({ value, maxLength: MAX_METADATA_LENGTH })
        : value,
    ])
  );
}

function browserRoute(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function serializeBrowserLogValue(value: unknown): string {
  return truncate({
    value: serializeUnknown(value),
    maxLength: MAX_MESSAGE_LENGTH,
  });
}

export function logBrowserEvent(event: BrowserLogEvent): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const payload = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    sequence,
    url: window.location.href,
    route: browserRoute(),
    level: event.level,
    category: event.category,
    message: truncate({ value: event.message, maxLength: MAX_MESSAGE_LENGTH }),
    stack:
      event.stack === undefined
        ? undefined
        : truncate({ value: event.stack, maxLength: MAX_STACK_LENGTH }),
    metadata: normalizeMetadata(event.metadata),
  };
  sequence += 1;

  const body = JSON.stringify(payload);

  // sendBeacon keeps logs more reliable during reloads or route changes.
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      DEV_BROWSER_LOG_ENDPOINT,
      new Blob([body], { type: "application/json" })
    );
    if (sent) {
      return;
    }
  }

  void fetch(DEV_BROWSER_LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
