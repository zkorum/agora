import * as Sentry from "@sentry/vue";
import {
  redactSentryBreadcrumb,
  redactSentryTransaction,
  shouldIgnoreSentryEvent,
} from "src/utils/sentry/eventPrivacy";
import { createPiniaStateAttachment } from "src/utils/sentry/piniaState";
import { addStackOverflowDiagnostics } from "src/utils/sentry/stackOverflowDiagnostics";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app, router, store }) => {
  Sentry.init({
    app,
    dsn: "https://1a115ad14fb74824a573dce151352b58@o4510068006780928.ingest.de.sentry.io/4510068713979984",
    // With sendDefaultPii: false, Sentry still infers IP addresses from HTTP requests
    // for debugging purposes, but does not collect cookies or user credentials
    // Note: users who want to maintain their privacy are encouraged to use Tor
    sendDefaultPii: false,
    beforeBreadcrumb: redactSentryBreadcrumb,
    beforeSendTransaction: redactSentryTransaction,
    beforeSend(event, hint) {
      if (shouldIgnoreSentryEvent(event)) {
        return null;
      }
      hint.attachments = [
        ...(hint.attachments ?? []),
        createPiniaStateAttachment(store.state.value),
      ];
      const eventWithDiagnostics = addStackOverflowDiagnostics({
        event,
        documentRoot: document,
      });
      return { ...eventWithDiagnostics, request: undefined };
    },
    integrations: (defaultIntegrations) => [
      ...defaultIntegrations.filter(
        (integration) =>
          integration.name !== "HttpContext" && integration.name !== "Vue"
      ),
      Sentry.vueIntegration({
        tracingOptions: {
          // see https://docs.sentry.io/platforms/javascript/guides/vue/features/component-tracking/
          trackComponents: true,
        },
      }),
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
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
});
