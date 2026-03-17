<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="keepAliveRoutes">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <PostSignupPreferencesDialog />
  <EmbeddedBrowserWarningDialog />

  <!-- Global Zupass iframe container - shared by all components -->
  <!-- Parcnet creates its own dialog with overlay, positioned fixed -->
  <div ref="zupassIframeContainer" class="zupass-iframe-container"></div>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";

import { type AppTranslations, appTranslations } from "./App.i18n";
import EmbeddedBrowserWarningDialog from "./components/embeddedBrowser/EmbeddedBrowserWarningDialog.vue";
import PostSignupPreferencesDialog from "./components/onboarding/dialogs/PostSignupPreferencesDialog.vue";
import { createOfflineNotificationController } from "./composables/offlineNotification";
import { useComponentI18n } from "./composables/ui/useComponentI18n";
import { isNetworkOffline } from "./composables/useNetworkStatus";
import { useRealtimeSSE } from "./composables/useRealtimeSSE";
import { useZupassVerification } from "./composables/zupass/useZupassVerification";
import { useBackendAuthApi } from "./utils/api/auth";
import { useHtmlNodeCssPatch } from "./utils/css/htmlNodeCssPatch";
import { useNotify } from "./utils/ui/notify";

const { t } = useComponentI18n<AppTranslations>(appTranslations);

const keepAliveRoutes = ["HomePage", "NotificationPage", "UserProfilePage"];

const authenticationStore = useBackendAuthApi();

useHtmlNodeCssPatch();

// Initialize global Zupass iframe container
const { zupassIframeContainer } = useZupassVerification();

// Initialize SSE for real-time events (notifications + feed updates).
// Always connected: authenticated users get personal notifications + global
// events; anonymous users get only global events (e.g. new_conversation).
const { forceReconnect } = useRealtimeSSE();

const { showNotifyMessage, showPersistentNotifyMessage } = useNotify();

// Offline notification — state machine handles show/dismiss/retry logic.
// Quasar dismiss references tracked here (not in the state machine) since
// they are framework-specific side effects.
let dismissOfflineFn: (() => void) | null = null;
let dismissRetryingFn: (() => void) | null = null;

const offlineController = createOfflineNotificationController({
  showOffline: () => {
    dismissOfflineFn = showPersistentNotifyMessage({
      message: t("connectionLost"),
      caption: t("reconnecting"),
      showSpinner: true,
      actionLabel: t("retryNow"),
      onAction: () => offlineController.onRetryClicked(),
      onDismiss: () => { dismissOfflineFn = null; },
    });
  },
  dismissOffline: () => {
    dismissOfflineFn?.();
    dismissOfflineFn = null;
  },
  showRetrying: () => {
    dismissRetryingFn = showNotifyMessage({
      message: t("retrying"),
      showSpinner: true,
      force: true,
    }) ?? null;
  },
  dismissRetrying: () => {
    dismissRetryingFn?.();
    dismissRetryingFn = null;
  },
  showConnected: () => {
    showNotifyMessage(t("connected"));
  },
  triggerForceReconnect: () => {
    forceReconnect();
  },
  scheduleTimer: (callback, delayMs) => {
    const id = setTimeout(callback, delayMs);
    return () => clearTimeout(id);
  },
});

watch(isNetworkOffline, (offline) => {
  if (offline) {
    offlineController.onWentOffline();
  } else {
    offlineController.onWentOnline();
  }
}, { flush: 'sync' });

onMounted(async () => {
  try {
    await authenticationStore.initializeAuthState();
  } catch (e) {
    console.error("Error while trying to get logged-in status", e);
  }
});
</script>

<style lang="scss">
.zupass-iframe-container {
  // Empty container - Parcnet will inject iframe and dialog
  // Dialog is positioned fixed with its own backdrop, doesn't need special styling here
}
</style>
