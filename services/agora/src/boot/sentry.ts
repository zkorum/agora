import { defineBoot } from "#q-app/wrappers";

import * as Sentry from "@sentry/vue";

export default defineBoot(({ app }) => {
  Sentry.init({
    app,
    dsn: "https://045c836ef8e742f3696524dd09ccdb01@o4510068006780928.ingest.de.sentry.io/4510068008484944",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
  });
});
