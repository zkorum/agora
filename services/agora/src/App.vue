<template>
  <router-view />
  <PostSignupPreferencesDialog />
  <EmbeddedBrowserWarningDialog />

  <!-- Global Zupass iframe container - shared by all components -->
  <!-- Parcnet creates its own dialog with overlay, positioned fixed -->
  <div ref="zupassIframeContainer" class="zupass-iframe-container"></div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted } from "vue";

import EmbeddedBrowserWarningDialog from "./components/embeddedBrowser/EmbeddedBrowserWarningDialog.vue";
import PostSignupPreferencesDialog from "./components/onboarding/dialogs/PostSignupPreferencesDialog.vue";
import { useNotificationSSE } from "./composables/useNotificationSSE";
import { useZupassVerification } from "./composables/zupass/useZupassVerification";
import { useAuthenticationStore } from "./stores/authentication";
import { useBackendAuthApi } from "./utils/api/auth";
import { useHtmlNodeCssPatch } from "./utils/css/htmlNodeCssPatch";

const authenticationStore = useBackendAuthApi();

useHtmlNodeCssPatch();

// Initialize global Zupass iframe container
const { zupassIframeContainer } = useZupassVerification();

// Initialize SSE for real-time notifications
// The composable automatically handles connecting/disconnecting based on auth state
useNotificationSSE();

onMounted(async () => {
  try {
    console.log("Initializing authentication state");
    await authenticationStore.initializeAuthState();
  } catch (e) {
    console.error("Error while trying to get logged-in status", e);
    // In dev mode over plain HTTP (e.g. LAN IP), WebCrypto is unavailable
    // (crypto.subtle requires a secure context). Force isAuthInitialized so
    // the login button still renders. In production this is always HTTPS so
    // the issue doesn't arise.
    if (process.env.DEV) {
      const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
      isAuthInitialized.value = true;
    }
  }
});
</script>

<style lang="scss">
.zupass-iframe-container {
  // Empty container - Parcnet will inject iframe and dialog
  // Dialog is positioned fixed with its own backdrop, doesn't need special styling here
}
</style>
