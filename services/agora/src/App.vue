<template>
  <div
    v-show="languageStore.isDisplayLanguageReady"
    :inert="isOnboarding || undefined"
    :aria-hidden="isOnboarding || undefined"
  >
    <ApplicationRouteView
      v-if="background.kind === 'ready'"
      :route="background.route"
    />
  </div>
  <div v-if="isOnboarding" v-show="languageStore.isDisplayLanguageReady">
    <router-view />
  </div>
  <PageLoadingSpinner v-if="!languageStore.isDisplayLanguageReady" />

  <ConversationPageMetadata
    v-if="metadataConversationSlugId !== undefined"
    :conversation-slug-id="metadataConversationSlugId"
  />

  <PostSignupPreferencesDialog />
  <EmbeddedBrowserWarningDialog />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";

import { type AppTranslations, appTranslations } from "./App.i18n";
import EmbeddedBrowserWarningDialog from "./components/embeddedBrowser/EmbeddedBrowserWarningDialog.vue";
import ConversationPageMetadata from "./components/metadata/ConversationPageMetadata.vue";
import ApplicationRouteView from "./components/navigation/ApplicationRouteView.vue";
import PostSignupPreferencesDialog from "./components/onboarding/dialogs/PostSignupPreferencesDialog.vue";
import PageLoadingSpinner from "./components/ui/PageLoadingSpinner.vue";
import { useConversationLanguageFallback } from "./composables/conversation/useConversationLanguageFallback";
import { useOnboardingBackgroundRoute } from "./composables/conversation/useOnboardingBackgroundRoute";
import { createOfflineNotificationController } from "./composables/offlineNotification";
import { useComponentI18n } from "./composables/ui/useComponentI18n";
import { isNetworkOffline } from "./composables/useNetworkStatus";
import { useRealtimeSSE } from "./composables/useRealtimeSSE";
import {
  buildContentTranslationTopic,
  buildProjectContentTranslationTopic,
} from "./shared/types/dto";
import { useAuthenticationStore } from "./stores/authentication";
import { useLanguageStore } from "./stores/language";
import { useBackendAuthApi } from "./utils/api/auth";
import { createAuthInitializationController } from "./utils/auth/authInitialization";
import { useHtmlNodeCssPatch } from "./utils/css/htmlNodeCssPatch";
import { getConversationMetadataSlugId } from "./utils/router/conversationMetadataRoute";
import {
  isConversationRouteName,
  isProjectRouteName,
} from "./utils/router/conversationRouteContext";
import { getSingleRouteParam } from "./utils/router/params";
import { qvStatsTopics } from "./utils/sse/qvStatsSubscriptions";
import { contentTranslationSubscriptions } from "./utils/translation/contentTranslationSubscriptions";
import { useNotify } from "./utils/ui/notify";

const { t } = useComponentI18n<AppTranslations>(appTranslations);

const { background, isOnboarding } = useOnboardingBackgroundRoute();

const authenticationApi = useBackendAuthApi();
const authenticationStore = useAuthenticationStore();
const languageStore = useLanguageStore();

const authInitializationController = createAuthInitializationController({
  refreshAuthState: authenticationApi.refreshAuthState,
  markInitialized: () => {
    authenticationStore.isAuthInitialized = true;
  },
  onError: (error) => {
    console.error("Error while trying to get logged-in status", error);
  },
});

useHtmlNodeCssPatch();

// Determine layout mode from route name
const route = useRoute();
const metadataConversationSlugId = computed(() =>
  getConversationMetadataSlugId(route)
);
useConversationLanguageFallback({
  conversationSlugId: metadataConversationSlugId,
});
const realtimeConversationSlugId = computed(() => {
  if (!isConversationRouteName(route.name)) {
    return undefined;
  }

  if (!("postSlugId" in route.params)) {
    return undefined;
  }

  return getSingleRouteParam(route.params.postSlugId) || undefined;
});
const realtimeProjectSlug = computed(() => {
  if (!isProjectRouteName(route.name)) {
    return undefined;
  }

  if (!("projectSlug" in route.params)) {
    return undefined;
  }

  return getSingleRouteParam(route.params.projectSlug) || undefined;
});
const realtimeTopics = computed(() => {
  const topics = new Set(contentTranslationSubscriptions.topics.value);
  for (const topic of qvStatsTopics.value) topics.add(topic);
  if (realtimeConversationSlugId.value !== undefined) {
    topics.add(
      buildContentTranslationTopic({
        conversationSlugId: realtimeConversationSlugId.value,
        targetLanguageCode: languageStore.displayLanguage,
      })
    );
  }

  const projectSlug = realtimeProjectSlug.value;
  if (projectSlug !== undefined) {
    topics.add(
      buildProjectContentTranslationTopic({
        projectSlug,
        targetLanguageCode: languageStore.displayLanguage,
      })
    );
  }

  return [...topics].sort();
});

// Initialize SSE for real-time events after auth initialization.
// Authenticated users get personal notifications + global events; anonymous
// users get the public stream and conversation subscriptions when applicable.
useRealtimeSSE({
  subscribedConversationSlugId: realtimeConversationSlugId,
  subscribedTopics: realtimeTopics,
});

const { showNotifyMessage, showPersistentNotifyMessage } = useNotify();

// Offline notification — state machine handles show/dismiss logic.
// Quasar dismiss reference tracked here (not in the state machine) since
// it is a framework-specific side effect.
let dismissOfflineFn: (() => void) | null = null;

const offlineController = createOfflineNotificationController({
  showOffline: () => {
    let thisDismiss: (() => void) | null = null;
    thisDismiss = showPersistentNotifyMessage({
      message: t("connectionLost"),
      caption: t("reconnecting"),
      showSpinner: true,
      group: "offline-notification",
      onDismiss: () => {
        if (dismissOfflineFn === thisDismiss) {
          dismissOfflineFn = null;
        }
      },
    });
    dismissOfflineFn = thisDismiss;
  },
  dismissOffline: () => {
    dismissOfflineFn?.();
    dismissOfflineFn = null;
  },
  showConnected: () => {
    showNotifyMessage(t("connected"));
  },
});

function retryAuthInitialization(): void {
  void authInitializationController.retryNow();
}

function retryAuthInitializationWhenVisible(): void {
  if (!document.hidden) {
    retryAuthInitialization();
  }
}

watch(
  isNetworkOffline,
  (offline) => {
    if (offline) {
      offlineController.onWentOffline();
    } else {
      offlineController.onWentOnline();
    }
  },
  { flush: "sync" }
);

onMounted(async () => {
  languageStore.startBackgroundLanguageRecovery();
  window.addEventListener("online", retryAuthInitialization);
  document.addEventListener(
    "visibilitychange",
    retryAuthInitializationWhenVisible
  );
  // Remove SPA splash screen (only present in SPA builds, see index.html)
  const splash = document.getElementById("app-loading");
  if (splash) {
    splash.classList.add("fade-out");
    splash.addEventListener("transitionend", () => splash.remove(), {
      once: true,
    });
    setTimeout(() => splash.remove(), 500);
  }

  await authInitializationController.initialize();
});

onUnmounted(() => {
  window.removeEventListener("online", retryAuthInitialization);
  document.removeEventListener(
    "visibilitychange",
    retryAuthInitializationWhenVisible
  );
  authInitializationController.stop();
});
</script>
