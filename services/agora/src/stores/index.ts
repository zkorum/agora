import { defineStore } from "#q-app/wrappers";
import { createSentryPiniaPlugin } from "@sentry/vue";
import { createPinia } from "pinia";
import { type Router } from "vue-router";
import type { useAuthenticationStore } from "./authentication";
import type { useUserStore } from "./user";
import type { useNewPostDraftsStore } from "./newConversationDrafts";
import type { useNewOpinionDraftsStore } from "./newOpinionDrafts";
import type { useHomeFeedStore } from "./homeFeed";
import type { useNotificationStore } from "./notification";
import type { useTopicStore } from "./topic";
import type { useNavigationStore } from "./navigation";
import type { useLanguageStore } from "./language";
import type { useLoginIntentionStore } from "./loginIntention";

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
 * State transformer for Sentry Pinia plugin
 * Redacts sensitive personal data to comply with GDPR while preserving
 * the data structure for debugging purposes
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/vue/features/pinia/#statetransformer-function
 */
function stateTransformer(state: Partial<AllStoresState>): Partial<AllStoresState> {
  const redactedState: Partial<AllStoresState> = { ...state };

  // Redact authentication store sensitive data
  if (redactedState.authentication) {
    redactedState.authentication = {
      ...redactedState.authentication,
      verificationPhoneNumber: redactString(
        redactedState.authentication.verificationPhoneNumber,
        "phone_number"
      ),
      verificationDefaultCallingCode: redactString(
        redactedState.authentication.verificationDefaultCallingCode,
        "calling_code"
      ),
    };
  }

  // Redact newPostDrafts store sensitive data
  if (redactedState.newPostDrafts) {
    const conversationDraft = redactedState.newPostDrafts.conversationDraft;

    redactedState.newPostDrafts = {
      ...redactedState.newPostDrafts,
      conversationDraft: {
        ...conversationDraft,
        title: redactString(conversationDraft.title, "title"),
        content: redactString(conversationDraft.content, "content"),
        seedOpinions: conversationDraft.seedOpinions.map(() => "[REDACTED_SEED_OPINION]"),
        poll: {
          ...conversationDraft.poll,
          options: conversationDraft.poll.options.map(() => "[REDACTED_POLL_OPTION]"),
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
          polisUrl: redactString(conversationDraft.importSettings.polisUrl, "polis_url"),
        },
      },
    };
  }

  // newOpinionDrafts store only contains functions (no sensitive state to redact)
  // The opinion drafts are stored in localStorage, not in the Pinia state

  // Redact notification store sensitive data
  if (redactedState.notification) {
    redactedState.notification = {
      ...redactedState.notification,
      // Clear notification list - contains user activity data
      notificationList: [],
      // Keep notification count - useful for debugging
      numNewNotifications: redactedState.notification.numNewNotifications,
    };
  }

  // Redact topic store sensitive data
  if (redactedState.topic) {
    const followedTopicCount = redactedState.topic.followedTopicCodeSet.size;
    redactedState.topic = {
      ...redactedState.topic,
      // Keep full topic list - it's public data
      fullTopicList: redactedState.topic.fullTopicList,
      // Clear followed topics but preserve count - useful for debugging without revealing interests
      followedTopicCodeSet: new Set(
        Array.from({ length: followedTopicCount }, (_, i) => `[REDACTED_TOPIC_${i + 1}]`)
      ),
    };
  }

  // Redact user store sensitive data
  if (redactedState.user) {
    redactedState.user = {
      ...redactedState.user,
      profileData: {
        ...redactedState.user.profileData,
        userName: redactString(redactedState.user.profileData.userName, "username"),
        // Clear lists - they contain full post/comment data with sensitive content
        userPostList: [],
        userCommentList: [],
        organizationList: redactedState.user.profileData.organizationList.map((org) => ({
          ...org,
          name: redactString(org.name, "organization_name"),
        })),
      },
    };
  }

  return redactedState;
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
