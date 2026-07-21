import type { Breadcrumb, Event } from "@sentry/vue";
import { z } from "zod";

type SentryTransactionEvent = Event & { type: "transaction" };

export const SENTRY_TRACE_PROPAGATION_TARGETS: RegExp[] = [
  /^https:\/\/(?:[a-z0-9-]+\.)*agoracitizen\.network(?::\d+)?(?:[/?#]|$)/i,
  /^https:\/\/(?:[a-z0-9-]+\.)*zkorum\.com(?::\d+)?(?:[/?#]|$)/i,
];

const CEF_SHARP_CRAWLER_ERROR =
  /^Non-Error promise rejection captured with value: Object Not Found Matching Id:\d+, MethodName:[^,\s]+, ParamCount:\d+$/;
const RESIZE_OBSERVER_ERROR =
  /^ResizeObserver loop (?:limit exceeded|completed with undelivered notifications\.)$/;
const httpMethodSchema = z.enum([
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
const httpStatusSchema = z.number().int().min(100).max(599);
const countBucketSchema = z.enum(["0", "1", "2-4", "5-9", "10-49", "50+"]);
const safeContextsSchema = z.object({
  app: z
    .object({
      app_name: z.string().optional(),
      app_version: z.string().optional(),
      app_identifier: z.string().optional(),
      build_type: z.string().optional(),
    })
    .optional(),
  browser: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
  device: z
    .object({
      family: z.string().optional(),
      model: z.string().optional(),
      arch: z.string().optional(),
      manufacturer: z.string().optional(),
      brand: z.string().optional(),
      orientation: z.enum(["portrait", "landscape"]).optional(),
    })
    .optional(),
  os: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
      build: z.string().optional(),
    })
    .optional(),
  runtime: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
  trace: z
    .object({
      op: z.string().optional(),
      parent_span_id: z.string().optional(),
      span_id: z.string(),
      status: z.string().optional(),
      trace_id: z.string(),
    })
    .optional(),
  browser_translation_diagnostics: z
    .object({
      google_class_marker: z.boolean(),
      font_element_count_bucket: countBucketSchema,
      max_observed_font_depth_bucket: countBucketSchema,
      font_depth_scan_truncated: z.boolean(),
    })
    .optional(),
});

function isSingleNonAppExceptionMatching({
  event,
  pattern,
}: {
  event: Event;
  pattern: RegExp;
}): boolean {
  const exceptions = event.exception?.values;
  if (exceptions?.length !== 1) {
    return false;
  }
  const exception = exceptions[0];
  return (
    exception?.value !== undefined &&
    pattern.test(exception.value) &&
    exception.stacktrace?.frames?.some((frame) => frame.in_app === true) !==
      true
  );
}

export function isCefSharpCrawlerEvent(event: Event): boolean {
  const exceptions = event.exception?.values;
  if (exceptions?.length !== 1) {
    return false;
  }

  const exception = exceptions[0];
  if (
    exception === undefined ||
    exception.type !== "UnhandledRejection" ||
    exception.value === undefined ||
    !CEF_SHARP_CRAWLER_ERROR.test(exception.value) ||
    !exception.mechanism?.type.includes("onunhandledrejection")
  ) {
    return false;
  }

  return !exception.stacktrace?.frames?.some((frame) => frame.in_app === true);
}

export function shouldIgnoreSentryEvent(event: Event): boolean {
  return (
    isCefSharpCrawlerEvent(event) ||
    isSingleNonAppExceptionMatching({ event, pattern: RESIZE_OBSERVER_ERROR })
  );
}

function sanitizeSentryContexts(
  contexts: Event["contexts"]
): Event["contexts"] | undefined {
  if (contexts === undefined) {
    return undefined;
  }

  try {
    const result = safeContextsSchema.safeParse(contexts);
    if (!result.success || Object.keys(result.data).length === 0) {
      return undefined;
    }
    return result.data;
  } catch {
    return undefined;
  }
}

function sanitizeNetworkBreadcrumbData(
  data: Breadcrumb["data"]
): Breadcrumb["data"] | undefined {
  if (data === undefined) {
    return undefined;
  }

  const methodResult = httpMethodSchema.safeParse(data.method);
  const statusResult = httpStatusSchema.safeParse(data.status_code);
  const safeData: Breadcrumb["data"] = {};

  if (methodResult.success) {
    safeData.method = methodResult.data;
  }
  if (statusResult.success) {
    safeData.status_code = statusResult.data;
  }

  return Object.keys(safeData).length > 0 ? safeData : undefined;
}

export function redactSentryBreadcrumb(
  breadcrumb: Breadcrumb
): Breadcrumb | null {
  if (
    breadcrumb.category === "console" ||
    breadcrumb.category?.startsWith("ui.") === true
  ) {
    return null;
  }
  if (breadcrumb.category === "navigation") {
    return { ...breadcrumb, message: undefined, data: undefined };
  }
  if (["fetch", "xhr", "http"].includes(breadcrumb.category ?? "")) {
    return {
      ...breadcrumb,
      message: undefined,
      data: sanitizeNetworkBreadcrumbData(breadcrumb.data),
    };
  }
  return breadcrumb;
}

export function redactSentryEvent<T extends Event>(event: T): T {
  return {
    ...event,
    request: undefined,
    extra: undefined,
    contexts: sanitizeSentryContexts(event.contexts),
  };
}

export function redactSentryTransaction(
  event: SentryTransactionEvent
): SentryTransactionEvent {
  return {
    ...event,
    request: undefined,
    extra: undefined,
    contexts: sanitizeSentryContexts(event.contexts),
    spans: event.spans?.map((span) => ({
      ...span,
      data: {},
      description:
        span.op === "navigation" || span.op === "pageload"
          ? undefined
          : span.description?.replace(/https?:\/\/[^\s]+/g, "[REDACTED_URL]"),
    })),
  };
}
