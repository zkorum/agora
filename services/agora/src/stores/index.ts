import { createSentryPiniaPlugin } from "@sentry/vue";
import { createPinia } from "pinia";
import { type Router } from "vue-router";

import { defineStore } from "#q-app/wrappers";

import type { useAuthenticationStore } from "./authentication";
import type { useHomeFeedStore } from "./homeFeed";
import type { useLanguageStore } from "./language";
import type { useLoginIntentionStore } from "./loginIntention";
import type { useNavigationStore } from "./navigation";
import type { useNewPostDraftsStore } from "./newConversationDrafts";
import type { useNewOpinionDraftsStore } from "./newOpinionDrafts";
import type { useNotificationStore } from "./notification";
import type { useTopicStore } from "./topic";
import type { useUserStore } from "./user";

/*
 * When adding new properties to stores, you should also
 * extend the `PiniaCustomProperties` interface.
 * @see https://pinia.vuejs.org/core-concepts/plugins.html#typing-new-store-properties
 */
declare module "pinia" {
  export interface PiniaCustomProperties {
    readonly router: Router;
  }
}

/**
 * Aggregate type representing all Pinia store states
 * This ensures type safety when transforming state for Sentry
 */
type AllStoresState = {
  authentication: ReturnType<typeof useAuthenticationStore>;
  user: ReturnType<typeof useUserStore>;
  newPostDrafts: ReturnType<typeof useNewPostDraftsStore>;
  newOpinionDrafts: ReturnType<typeof useNewOpinionDraftsStore>;
  homeFeed: ReturnType<typeof useHomeFeedStore>;
  notification: ReturnType<typeof useNotificationStore>;
  topic: ReturnType<typeof useTopicStore>;
  navigation: ReturnType<typeof useNavigationStore>;
  language: ReturnType<typeof useLanguageStore>;
  loginIntention: ReturnType<typeof useLoginIntentionStore>;
};

/**
 * Redacts a string value while preserving structure for debugging
 * Only redacts non-empty values - empty strings/nulls are preserved as they
 * provide useful debugging information without exposing PII
 */
function redactString(value: string, fieldName: string): string {
  // Preserve empty values as they are useful for debugging
  if (value === "") {
    return value;
  }

  // Redact everything else
  return `[REDACTED_${fieldName.toUpperCase()}]`;
}

/**
 * Defensively redacts credentials from the internal _loginStatus ref.
 * _loginStatus is not part of the store's public API, but Pinia may serialize
 * it into the state snapshot. Uses runtime narrowing (no type casts) since
 * the shape is not guaranteed.
 */
function redactLoginStatusCredentials(
  authState: Record<string, unknown>
): void {
  const loginStatus = authState._loginStatus;
  if (typeof loginStatus !== "object" || loginStatus === null) {
    return;
  }
  if (!("isKnown" in loginStatus) || !loginStatus.isKnown) {
    return;
  }
  if (!("credentials" in loginStatus) || !loginStatus.credentials) {
    return;
  }

  const creds = loginStatus.credentials;
  if (typeof creds !== "object" || creds === null) {
    return;
  }

  loginStatus.credentials = {
    email:
      "email" in creds && typeof creds.email === "string"
        ? redactString(creds.email, "email")
        : null,
    phone:
      "phone" in creds && creds.phone !== null
        ? { lastTwoDigits: 0, countryCallingCode: "[REDACTED]" }
        : null,
    rarimo:
      "rarimo" in creds && creds.rarimo !== null
        ? { citizenship: "[REDACTED]", sex: "[REDACTED]" }
        : null,
  };
}

/**
 * State transformer for Sentry Pinia plugin
 * Redacts sensitive personal data to comply with GDPR while preserving
 * the data structure for debugging purposes
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/vue/features/pinia/#statetransformer-function
 */
function stateTransformer(
  state: Partial<AllStoresState>
): unknown {
  // Output is Record<string, unknown> — the redacted shape doesn't match store
  // types (e.g. "[REDACTED_EVENT]" is not a valid EventSlug), and that's correct.
  // We read from `state` (typed) for autocomplete, write to `output` (untyped).
  const output: Record<string, unknown> = { ...state };

  // Redact authentication store sensitive data
  if (state.authentication) {
    const userId = state.authentication.userId;

    // Spread into Record<string, unknown> so we can access internal _loginStatus
    const redactedAuth: Record<string, unknown> = {
      ...state.authentication,
      verificationPhoneNumber: redactString(
        state.authentication.verificationPhoneNumber,
        "phone_number"
      ),
      verificationDefaultCallingCode: redactString(
        state.authentication.verificationDefaultCallingCode,
        "calling_code"
      ),
      // Redact userId computed property (exposed from store)
      userId: userId ? redactString(userId, "user_id") : userId,
    };

    // Redact credentials PII from internal _loginStatus ref
    // _loginStatus is not returned from the store, but we redact defensively
    // in case Pinia serializes it into the state snapshot
    redactLoginStatusCredentials(redactedAuth);

    output.authentication = redactedAuth;
  }

  // Redact newPostDrafts store sensitive data
  if (state.newPostDrafts) {
    const conversationDraft = state.newPostDrafts.conversationDraft;

    output.newPostDrafts = {
      ...state.newPostDrafts,
      conversationDraft: {
        ...conversationDraft,
        title: redactString(conversationDraft.title, "title"),
        content: redactString(conversationDraft.content, "content"),
        seedOpinions: conversationDraft.seedOpinions.map(
          () => "[REDACTED_SEED_OPINION]"
        ),
        poll: {
          ...conversationDraft.poll,
          options: conversationDraft.poll.options.map(
            () => "[REDACTED_POLL_OPTION]"
          ),
        },
        postAs: {
          ...conversationDraft.postAs,
          organizationName: redactString(
            conversationDraft.postAs.organizationName,
            "organization_name"
          ),
        },
        importSettings: {
          ...conversationDraft.importSettings,
          polisUrl: redactString(
            conversationDraft.importSettings.polisUrl,
            "polis_url"
          ),
        },
      },
    };
  }

  // newOpinionDrafts store only contains functions (no sensitive state to redact)
  // The opinion drafts are stored in localStorage, not in the Pinia state

  // Redact notification store sensitive data
  if (state.notification) {
    output.notification = {
      ...state.notification,
      // Clear notification list - contains user activity data
      notificationList: [],
      // Keep notification count - useful for debugging
      numNewNotifications: state.notification.numNewNotifications,
    };
  }

  // Redact topic store sensitive data
  if (state.topic) {
    const followedTopicCount = state.topic.followedTopicCodeSet.size;
    output.topic = {
      ...state.topic,
      // Keep full topic list - it's public data
      fullTopicList: state.topic.fullTopicList,
      // Clear followed topics but preserve count - useful for debugging without revealing interests
      followedTopicCodeSet: new Set(
        Array.from(
          { length: followedTopicCount },
          (_, i) => `[REDACTED_TOPIC_${i + 1}]`
        )
      ),
    };
  }

  // Redact user store sensitive data
  if (state.user) {
    const profileData = state.user.profileData;
    output.user = {
      ...state.user,
      profileData: {
        ...profileData,
        // Redact precise creation timestamp - enough to identify a user
        createdAt: new Date(0),
        // Clamp to 0/1 - exact count can narrow identity
        activePostCount: profileData.activePostCount > 0 ? 1 : 0,
        // isModerator: kept as-is (boolean, useful for debugging)
        userName: redactString(profileData.userName, "username"),
        // Clear lists - they contain full post/comment data
        userPostList: [],
        userCommentList: [],
        // Redact all org fields - imageUrl/websiteUrl/description identify specific orgs
        organizationList: profileData.organizationList.map((org) => ({
          name: redactString(org.name, "org_name"),
          imageUrl: redactString(org.imageUrl, "org_image_url"),
          websiteUrl: redactString(org.websiteUrl, "org_website_url"),
          description: redactString(org.description, "org_description"),
        })),
        // Preserve count via array length, redact actual slugs
        verifiedEventTickets: profileData.verifiedEventTickets.map(
          () => "[REDACTED_EVENT]"
        ),
      },
      // Preserve verification states count but clear identifying event slugs
      ticketVerificationStates: new Map(
        Array.from(
          { length: state.user.ticketVerificationStates.size },
          (_, i) => [`[REDACTED_EVENT_${i}]`, { state: "redacted" }]
        )
      ),
    };
  }

  return output;
}

export default defineStore((/* { ssrContext } */) => {
  const pinia = createPinia();
  pinia.use(
    createSentryPiniaPlugin({
      stateTransformer,
    })
  );
  return pinia;
});
