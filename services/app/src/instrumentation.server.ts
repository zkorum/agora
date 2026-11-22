import * as Sentry from "@sentry/sveltekit";

import { sentryEnabled } from "#lib/sentry-enabled.js";
import { sentryOptions } from "#lib/sentry-options.js";
import { building, dev } from "$app/env";

if (sentryEnabled && !building && !dev) {
  Sentry.init({
    ...sentryOptions,
    tracesSampleRate: 1.0,
  });
}
