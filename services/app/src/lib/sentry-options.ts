import type { BrowserOptions, NodeOptions } from "@sentry/sveltekit";

const identifyingFields = {
  deny: ["forwarded", "-ip", "remote-", "via", "-user"],
};

// Sentry 11 collects more data by default; retain the restrictive v10 baseline.
// https://docs.sentry.io/platforms/javascript/guides/sveltekit/migration/v10-to-v11/#data-collection
export const sentryOptions = {
  dsn: "https://763fc22c86934ac6b99980f7624eb9fb@o4510068006780928.ingest.de.sentry.io/4510772432994384",
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: identifyingFields,
    httpBodies: [],
    urlQueryParams: identifyingFields,
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
    databaseQueryData: false,
    graphQL: { document: false, variables: false },
    queues: false,
    frameContextLines: 7,
  },
  attachStacktrace: false,
  traceLifecycle: "stream",
} satisfies BrowserOptions & NodeOptions;
