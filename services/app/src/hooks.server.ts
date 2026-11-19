import type { Handle, HandleServerError } from "@sveltejs/kit";

import { baseLocale, locales } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { sentryEnabled } from "$lib/sentry-enabled";

export const handle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(
    event.request,
    ({ request: localizedRequest, locale }) => {
      event.request = localizedRequest;
      return resolve(event, {
        transformPageChunk: ({ html }) =>
          html
            .replace("%lang%", locale)
            .replace("%locales%", locales.join(","))
            .replace("%baseLocale%", baseLocale)
            .replace(
              "%dir%",
              ["ar", "fa", "he"].includes(locale) ? "rtl" : "ltr",
            ),
      });
    },
  );

export const handleError: HandleServerError = async ({
  error,
  event: _event,
  status,
  message,
}) => {
  if (sentryEnabled) {
    const Sentry = await import("@sentry/sveltekit");
    Sentry.captureException(error);
  } else {
    console.error("[Server Error]", error);
  }

  return {
    message,
    status,
  };
};
