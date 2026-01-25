import type { HandleClientError } from "@sveltejs/kit";

const isProduction =
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  !window.location.hostname.includes("staging") &&
  !window.location.hostname.includes("dev");

let sentryInitialized = false;

async function initSentry() {
  if (sentryInitialized || !isProduction) return null;

  const Sentry = await import("@sentry/sveltekit");
  Sentry.init({
    dsn: "https://763fc22c86934ac6b99980f7624eb9fb@o4510068006780928.ingest.de.sentry.io/4510772432994384",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
  sentryInitialized = true;
  return Sentry;
}

export const handleError: HandleClientError = async ({
  error,
  event: _event,
  status,
  message,
}) => {
  if (isProduction) {
    const Sentry = await initSentry();
    if (Sentry) {
      Sentry.captureException(error);
    }
  } else {
    console.error("[Client Error]", error);
  }

  return {
    message,
    status,
  };
};
