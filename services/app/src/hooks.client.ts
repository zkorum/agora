import type { ClientCaughtError, HandleClientError } from "@sveltejs/kit/hooks";

import { sentryEnabled } from "#lib/sentry-enabled.js";
import { sentryOptions } from "#lib/sentry-options.js";
import { recoverFromDynamicImportError } from "$logic/shared/dynamic-import-error";

let sentryPromise: ReturnType<typeof initializeSentry> | undefined;

async function initializeSentry() {
  try {
    const sentry = await import("@sentry/sveltekit");
    sentry.init({
      ...sentryOptions,
      tracesSampleRate: 0.1,
    });
    return sentry;
  } catch (error) {
    // Share an in-flight attempt, but do not permanently cache a failed SDK load.
    sentryPromise = undefined;
    throw error;
  }
}

async function reportError(error: unknown): Promise<void> {
  try {
    sentryPromise ??= initializeSentry();
    const sentry = await sentryPromise;
    sentry.captureException(error);
  } catch (reportingError) {
    console.error("[Sentry] Failed to report client error", reportingError);
  }
}

export const handleError = (({ kind, error }: ClientCaughtError) => {
  if (kind !== "unknown") return;

  if (recoverFromDynamicImportError(error)) {
    return;
  }

  if (sentryEnabled) {
    // Rendering errors require a synchronous hook unless experimental async is enabled.
    void reportError(error);
  } else {
    console.error("[Client Error]", error);
  }
}) satisfies HandleClientError;
