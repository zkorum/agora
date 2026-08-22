<template>
  <PersistentLayout v-if="isDrawerLayout">
    <router-view v-slot="{ Component }">
      <keep-alive :include="keepAliveRoutes">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </PersistentLayout>

  <!-- Non-drawer pages (onboarding, project, embed, welcome, survey onboarding, 404) render their own layout -->
  <router-view v-else />

  <PostSignupPreferencesDialog />
  <EmbeddedBrowserWarningDialog />

  <!-- Global Zupass iframe container - shared by all components -->
  <!-- Parcnet creates its own dialog with overlay, positioned fixed -->
  <div ref="zupassIframeContainer" class="zupass-iframe-container"></div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";

import { type AppTranslations, appTranslations } from "./App.i18n";
import EmbeddedBrowserWarningDialog from "./components/embeddedBrowser/EmbeddedBrowserWarningDialog.vue";
import PostSignupPreferencesDialog from "./components/onboarding/dialogs/PostSignupPreferencesDialog.vue";
import { createOfflineNotificationController } from "./composables/offlineNotification";
import { useComponentI18n } from "./composables/ui/useComponentI18n";
import { isNetworkOffline } from "./composables/useNetworkStatus";
import { useRealtimeSSE } from "./composables/useRealtimeSSE";
import { useZupassVerification } from "./composables/zupass/useZupassVerification";
import PersistentLayout from "./layouts/PersistentLayout.vue";
import {
  buildContentTranslationTopic,
  buildProjectContentTranslationTopic,
} from "./shared/types/dto";
import { useAuthenticationStore } from "./stores/authentication";
import { useLanguageStore } from "./stores/language";
import { useBackendAuthApi } from "./utils/api/auth";
import { createAuthInitializationController } from "./utils/auth/authInitialization";
import { useHtmlNodeCssPatch } from "./utils/css/htmlNodeCssPatch";
import { shouldUseDrawerLayout } from "./utils/router/appLayout";
import {
  isConversationRouteName,
  isProjectRouteName,
} from "./utils/router/conversationRouteContext";
import { getSingleRouteParam } from "./utils/router/params";
import { useNotify } from "./utils/ui/notify";

const { t } = useComponentI18n<AppTranslations>(appTranslations);

const keepAliveRoutes = ["HomePage", "NotificationPage", "UserProfilePage"];

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

// Initialize global Zupass iframe container
const { zupassIframeContainer } = useZupassVerification();

// Determine layout mode from route name
const route = useRoute();
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
  const topics: string[] = [];
  if (realtimeConversationSlugId.value !== undefined) {
    topics.push(
      buildContentTranslationTopic({
        conversationSlugId: realtimeConversationSlugId.value,
        targetLanguageCode: languageStore.displayLanguage,
      })
    );
  }

  const projectSlug = realtimeProjectSlug.value;
  if (projectSlug !== undefined) {
    topics.push(
      buildProjectContentTranslationTopic({
        projectSlug,
        targetLanguageCode: languageStore.displayLanguage,
      })
    );
  }

  return topics;
});

// Initialize SSE for real-time events after auth initialization.
// Authenticated users get personal notifications + global events; anonymous
// users get the public stream and conversation subscriptions when applicable.
useRealtimeSSE({
  subscribedConversationSlugId: realtimeConversationSlugId,
  subscribedTopics: realtimeTopics,
});
const isDrawerLayout = computed(() => shouldUseDrawerLayout(route.name));

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

<style lang="scss">
.zupass-iframe-container {
  // Empty container - Parcnet will inject iframe and dialog
  // Dialog is positioned fixed with its own backdrop, doesn't need special styling here
}
</style>
