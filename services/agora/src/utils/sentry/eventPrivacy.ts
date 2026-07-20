import type { Breadcrumb, Event } from "@sentry/vue";

type SentryTransactionEvent = Event & { type: "transaction" };

const CEF_SHARP_CRAWLER_ERROR =
  /^Non-Error promise rejection captured with value: Object Not Found Matching Id:\d+, MethodName:[^,\s]+, ParamCount:\d+$/;
const RESIZE_OBSERVER_ERROR =
  /^ResizeObserver loop (?:limit exceeded|completed with undelivered notifications\.)$/;

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
    return { ...breadcrumb, data: undefined };
  }
  return breadcrumb;
}

export function redactSentryTransaction(
  event: SentryTransactionEvent
): SentryTransactionEvent {
  return {
    ...event,
    request: undefined,
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
