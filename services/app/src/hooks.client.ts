import type { HandleClientError } from "@sveltejs/kit";

import { recoverFromDynamicImportError } from "$logic/shared/dynamic-import-error";

const isProduction =
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  !window.location.hostname.includes("staging") &&
  !window.location.hostname.includes("dev");

let sentryPromise: ReturnType<typeof initializeSentry> | undefined;

async function initSentry() {
  if (!isProduction) return undefined;

  sentryPromise ??= initializeSentry();
  return await sentryPromise;
}

async function initializeSentry() {
  const sentry = await import("@sentry/sveltekit");
  sentry.init({
    dsn: "https://763fc22c86934ac6b99980f7624eb9fb@o4510068006780928.ingest.de.sentry.io/4510772432994384",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
  return sentry;
}

async function reportError(error: unknown): Promise<void> {
  try {
    const sentry = await initSentry();
    sentry?.captureException(error);
  } catch (reportingError) {
    console.error("[Sentry] Failed to report client error", reportingError);
  }
}

export const handleError: HandleClientError = async ({
  error,
  event: _event,
  status,
  message,
}) => {
  if (recoverFromDynamicImportError(error)) {
    return { message, status };
  }

  if (isProduction) {
    await reportError(error);
  } else {
    console.error("[Client Error]", error);
  }

  return {
    message,
    status,
  };
};
