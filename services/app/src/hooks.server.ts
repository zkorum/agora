import type { Handle, HandleServerError } from "@sveltejs/kit";

import { paraglideMiddleware } from "$lib/paraglide/server";

const isProduction =
  process.env.NODE_ENV === "production" && process.env.VITE_STAGING !== "true";

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

export const handle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(
    event.request,
    ({ request: localizedRequest, locale }) => {
      event.request = localizedRequest;
      return resolve(event, {
        transformPageChunk: ({ html }) => html.replace("%lang%", locale),
      });
    },
  );

export const handleError: HandleServerError = async ({
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
    console.error("[Server Error]", error);
  }

  return {
    message,
    status,
  };
};
