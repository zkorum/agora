import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: "https://763fc22c86934ac6b99980f7624eb9fb@o4510068006780928.ingest.de.sentry.io/4510772432994384",

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});
