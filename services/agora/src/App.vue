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
import { onMounted } from "vue";

import EmbeddedBrowserWarningDialog from "./components/embeddedBrowser/EmbeddedBrowserWarningDialog.vue";
import PostSignupPreferencesDialog from "./components/onboarding/dialogs/PostSignupPreferencesDialog.vue";
import { useRealtimeSSE } from "./composables/useRealtimeSSE";
import { useZupassVerification } from "./composables/zupass/useZupassVerification";
import { useBackendAuthApi } from "./utils/api/auth";
import { useHtmlNodeCssPatch } from "./utils/css/htmlNodeCssPatch";

const keepAliveRoutes = ["HomePage", "NotificationPage", "UserProfilePage"];

const authenticationStore = useBackendAuthApi();

useHtmlNodeCssPatch();

// Initialize global Zupass iframe container
const { zupassIframeContainer } = useZupassVerification();

// Initialize SSE for real-time events (notifications + feed updates).
// Always connected: authenticated users get personal notifications + global
// events; anonymous users get only global events (e.g. new_conversation).
useRealtimeSSE();

onMounted(async () => {
  try {
    await authenticationStore.initializeAuthState();
  } catch (e) {
    console.error("Error while trying to get logged-in status", e);
    // TODO: create a unified error handling to notify the user _once_ only if the backend is down?
  }
});
</script>

<style lang="scss">
.zupass-iframe-container {
  // Empty container - Parcnet will inject iframe and dialog
  // Dialog is positioned fixed with its own backdrop, doesn't need special styling here
}
</style>
