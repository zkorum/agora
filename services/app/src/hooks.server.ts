import { captureException } from "@sentry/sveltekit";
import type {
  CaughtError,
  Handle,
  HandleServerError,
} from "@sveltejs/kit/hooks";

import { baseLocale, locales } from "#lib/paraglide/runtime.js";
import { paraglideMiddleware } from "#lib/paraglide/server.js";
import { sentryEnabled } from "#lib/sentry-enabled.js";
import { building, dev } from "$app/env";

export const handle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(
    event.request,
    ({ request: localizedRequest, locale }) => {
      return resolve(
        { ...event, request: localizedRequest },
        {
          preload: (asset) =>
            asset.type !== "font" ||
            asset.filename ===
              "src/lib/assets/fonts/albert-sans/AlbertSans-Variable.woff2",
          transformPageChunk: ({ html }) =>
            html
              .replace("%lang%", locale)
              .replace("%locales%", locales.join(","))
              .replace("%baseLocale%", baseLocale)
              .replace(
                "%dir%",
                ["ar", "fa", "he"].includes(locale) ? "rtl" : "ltr",
              ),
        },
      );
    },
  );

export const handleError = (({ kind, error }: CaughtError) => {
  if (kind !== "unknown") return;

  if (sentryEnabled && !building && !dev) {
    captureException(error);
  } else {
    console.error("[Server Error]", error);
  }
}) satisfies HandleServerError;
