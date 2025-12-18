import * as Sentry from "@sentry/vue";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app, router }) => {
  Sentry.init({
    app,
    dsn: "https://1a115ad14fb74824a573dce151352b58@o4510068006780928.ingest.de.sentry.io/4510068713979984",
    // With sendDefaultPii: false, Sentry still infers IP addresses from HTTP requests
    // for debugging purposes, but does not collect cookies or user credentials
    // Note: users who want to maintain their privacy are encouraged to use Tor
    sendDefaultPii: false,
    // Filter out default `Vue` integration
    // see https://docs.sentry.io/platforms/javascript/guides/vue/#configuration-for-late-defined-vue-apps
    // integrations: (integrations) =>
    //   integrations.filter((integration) => integration.name !== "Vue"),
    integrations: [
      Sentry.vueIntegration({
        tracingOptions: {
          // see https://docs.sentry.io/platforms/javascript/guides/vue/features/component-tracking/
          trackComponents: true,
        },
      }),
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        // Additional SDK configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    tracePropagationTargets: [
      /^https?:\/\/(?:.*\.)?agoracitizen\.network/,
      /^https?:\/\/(?:.*\.)?zkorum\.com/,
    ],
  });
  // To run code after mounting, you can do:
  // app.mixin({
  //   mounted() {
  //     if (!this.$parent) {
  //       console.log("Root component mounted, adding Sentry integration");
  //       Sentry.addIntegration(Sentry.vueIntegration({ app }));
  //     }
  //   },
  // });
});
