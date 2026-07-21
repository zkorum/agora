import * as Sentry from "@sentry/vue";
import {
  redactSentryBreadcrumb,
  redactSentryEvent,
  redactSentryTransaction,
  SENTRY_TRACE_PROPAGATION_TARGETS,
  shouldIgnoreSentryEvent,
} from "src/utils/sentry/eventPrivacy";
import { createPiniaStateAttachment } from "src/utils/sentry/piniaState";
import {
  sanitizeReplayEvent,
  sanitizeReplayRecordingEvent,
  SENTRY_REPLAY_MASK_ATTRIBUTES,
} from "src/utils/sentry/replayPrivacy";
import {
  addStackOverflowDiagnostics,
  isStackOverflowEvent,
} from "src/utils/sentry/stackOverflowDiagnostics";

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
      if (isStackOverflowEvent(event)) {
        hint.attachments = [
          ...(hint.attachments ?? []),
          createPiniaStateAttachment(store.state.value),
        ];
      }
      const eventWithDiagnostics = addStackOverflowDiagnostics({
        event,
        documentRoot: document,
      });
      return redactSentryEvent(eventWithDiagnostics);
    },
    integrations: (defaultIntegrations) => [
      ...defaultIntegrations.filter(
        (integration) =>
          integration.name !== "HttpContext" && integration.name !== "Vue"
      ),
      Sentry.vueIntegration(),
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        maskAttributes: SENTRY_REPLAY_MASK_ATTRIBUTES,
        networkCaptureBodies: false,
        networkDetailAllowUrls: [],
        networkRequestHeaders: [],
        networkResponseHeaders: [],
        attachRawBodyFromRequest: false,
        beforeAddRecordingEvent: sanitizeReplayRecordingEvent,
        beforeErrorSampling: (event) => !shouldIgnoreSentryEvent(event),
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    tracePropagationTargets: SENTRY_TRACE_PROPAGATION_TARGETS,
  });
  Sentry.addEventProcessor(sanitizeReplayEvent);
});
