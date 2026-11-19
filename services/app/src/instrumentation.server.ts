import * as Sentry from "@sentry/sveltekit";

import { sentryEnabled } from "$lib/sentry-enabled";

if (sentryEnabled) {
  Sentry.init({
    dsn: "https://763fc22c86934ac6b99980f7624eb9fb@o4510068006780928.ingest.de.sentry.io/4510772432994384",
    tracesSampleRate: 1.0,
    sendDefaultPii: false,
    enableLogs: true,
  });
}
