import type { ErrorEvent, Exception } from "@sentry/vue";

/**
 * Diagnostics for the Sentry issue reported as:
 * `RangeError: Maximum call stack size exceeded. at ? (undefined:38:249)`.
 *
 * Affected iPhone sessions had conversation-page breadcrumbs containing nested
 * `<font>` elements that Agora does not render. Browser page translators are
 * known to inject that markup, but the anonymous frame cannot prove whether the
 * translator or application code exhausted the stack. These fields let us
 * correlate future events with translated DOM and frame ownership before
 * deciding whether any product behavior or Sentry filtering should change.
 *
 * DOM inspection is limited to this exact error and records only structural,
 * bucketed metadata. It never records DOM text, HTML, language, or attributes.
 */
const MAX_FONT_ELEMENTS_TO_INSPECT = 100;
const MAX_FONT_ANCESTORS_TO_INSPECT = 50;
const MAXIMUM_CALL_STACK_ERROR = /^Maximum call stack size exceeded\.?$/;

type FrameOrigin = "in_app" | "non_app" | "unknown";
type TranslationDomEvidence = "google_class" | "nested_font" | "both" | "none";
type CountBucket = "0" | "1" | "2-4" | "5-9" | "10-49" | "50+";

function getStackOverflowExceptions(event: ErrorEvent): Exception[] {
  return (
    event.exception?.values?.filter(
      (exception) =>
        exception.type === "RangeError" &&
        exception.value !== undefined &&
        MAXIMUM_CALL_STACK_ERROR.test(exception.value)
    ) ?? []
  );
}

export function isStackOverflowEvent(event: ErrorEvent): boolean {
  return getStackOverflowExceptions(event).length > 0;
}

function getFrameOrigin(exceptions: Exception[]): FrameOrigin {
  const frames = exceptions.flatMap(
    (exception) => exception.stacktrace?.frames ?? []
  );
  if (frames.some((frame) => frame.in_app === true)) {
    return "in_app";
  }
  if (frames.length > 0 && frames.every((frame) => frame.in_app === false)) {
    return "non_app";
  }
  return "unknown";
}

function getTranslationDomEvidence({
  hasGoogleClass,
  hasNestedFont,
}: {
  hasGoogleClass: boolean;
  hasNestedFont: boolean;
}): TranslationDomEvidence {
  if (hasGoogleClass && hasNestedFont) {
    return "both";
  }
  if (hasGoogleClass) {
    return "google_class";
  }
  if (hasNestedFont) {
    return "nested_font";
  }
  return "none";
}

function getCountBucket(count: number): CountBucket {
  if (count === 0) {
    return "0";
  }
  if (count === 1) {
    return "1";
  }
  if (count < 5) {
    return "2-4";
  }
  if (count < 10) {
    return "5-9";
  }
  if (count < 50) {
    return "10-49";
  }
  return "50+";
}

export function addStackOverflowDiagnostics({
  event,
  documentRoot,
}: {
  event: ErrorEvent;
  documentRoot: Document;
}): ErrorEvent {
  const exceptions = getStackOverflowExceptions(event);
  if (exceptions.length === 0) {
    return event;
  }

  const rootClasses = documentRoot.documentElement.classList;
  const bodyClasses = documentRoot.body?.classList;
  const hasGoogleClass = [rootClasses, bodyClasses].some(
    (classes) =>
      classes?.contains("translated-ltr") === true ||
      classes?.contains("translated-rtl") === true
  );

  const fontElements = documentRoot.getElementsByTagName("font");
  const hasNestedFont = documentRoot.querySelector("font > font") !== null;
  const inspectedFontElementCount = Math.min(
    fontElements.length,
    MAX_FONT_ELEMENTS_TO_INSPECT
  );
  let maxObservedFontDepth = 0;
  let depthScanTruncated = false;

  for (let index = 0; index < inspectedFontElementCount; index += 1) {
    let element: Element | null = fontElements.item(index);
    let depth = 0;
    while (
      element?.tagName === "FONT" &&
      depth < MAX_FONT_ANCESTORS_TO_INSPECT
    ) {
      depth += 1;
      element = element.parentElement;
    }
    if (element?.tagName === "FONT") {
      depthScanTruncated = true;
    }
    maxObservedFontDepth = Math.max(maxObservedFontDepth, depth);
  }

  const translationDomEvidence = getTranslationDomEvidence({
    hasGoogleClass,
    hasNestedFont,
  });

  return {
    ...event,
    tags: {
      ...event.tags,
      browser_translation_dom: translationDomEvidence,
      stack_overflow_frame_origin: getFrameOrigin(exceptions),
    },
    contexts: {
      ...event.contexts,
      // Keep diagnostics structural and coarse: translated DOM may contain user text.
      browser_translation_diagnostics: {
        google_class_marker: hasGoogleClass,
        font_element_count_bucket: getCountBucket(fontElements.length),
        max_observed_font_depth_bucket: getCountBucket(maxObservedFontDepth),
        font_depth_scan_truncated:
          fontElements.length > MAX_FONT_ELEMENTS_TO_INSPECT ||
          depthScanTruncated,
      },
    },
  };
}
