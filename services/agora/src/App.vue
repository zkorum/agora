<template>
  <!-- Persistent drawer layout for most app pages -->
  <q-layout v-if="isDrawerLayout" view="lHh LpR lFf">
    <q-header
      :reveal="enableHeaderReveal"
      :model-value="layoutConfig.enableHeader"
      class="headerStyle"
      @reveal="captureHeaderReveal"
    >
      <div id="page-header"></div>
    </q-header>

    <q-footer
      v-if="drawerBehavior === 'mobile' && layoutConfig.enableFooter"
      :reveal="revealHeader"
      class="footerBackground"
    >
      <FooterBar />
    </q-footer>

    <q-page-container>
      <q-page>
        <div
          :class="{
            bottomPagePadding: layoutConfig.addBottomPadding,
            generalPagePadding: layoutConfig.addGeneralPadding,
          }"
        >
          <WidthWrapper :enable="layoutConfig.reducedWidth">
            <router-view v-slot="{ Component }">
              <keep-alive :include="keepAliveRoutes">
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </WidthWrapper>
        </div>
      </q-page>
    </q-page-container>

    <q-drawer
      v-model="showMobileDrawer"
      :behavior="drawerBehavior"
      :width="300"
      :overlay="drawerBehavior === 'mobile'"
      :no-swipe-open="true"
      bordered
    >
      <q-scroll-area class="scrollContainer">
        <SideDrawer />
      </q-scroll-area>
    </q-drawer>
  </q-layout>

  <!-- Non-drawer pages (onboarding, embed, welcome, 404) render their own layout -->
  <router-view v-else />

  <PostSignupPreferencesDialog />
  <EmbeddedBrowserWarningDialog />

  <!-- Global Zupass iframe container - shared by all components -->
  <!-- Parcnet creates its own dialog with overlay, positioned fixed -->
  <div ref="zupassIframeContainer" class="zupass-iframe-container"></div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { type AppTranslations, appTranslations } from "./App.i18n";
import EmbeddedBrowserWarningDialog from "./components/embeddedBrowser/EmbeddedBrowserWarningDialog.vue";
import FooterBar from "./components/navigation/footer/FooterBar.vue";
import SideDrawer from "./components/navigation/SideDrawer.vue";
import WidthWrapper from "./components/navigation/WidthWrapper.vue";
import PostSignupPreferencesDialog from "./components/onboarding/dialogs/PostSignupPreferencesDialog.vue";
import { createOfflineNotificationController } from "./composables/offlineNotification";
import { useComponentI18n } from "./composables/ui/useComponentI18n";
import { isNetworkOffline } from "./composables/useNetworkStatus";
import { useRealtimeSSE } from "./composables/useRealtimeSSE";
import { useZupassVerification } from "./composables/zupass/useZupassVerification";
import { useLayoutHeaderStore } from "./stores/layout/header";
import { usePageLayoutStore } from "./stores/layout/pageLayout";
import { useNavigationStore } from "./stores/navigation";
import { useBackendAuthApi } from "./utils/api/auth";
import { useNotificationRefresher } from "./utils/component/notification/menuRefresher";
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
useRealtimeSSE();

// Notification refresher — moved from DrawerLayout to App.vue (global concern)
useNotificationRefresher();

// Persistent layout state
const { config: layoutConfig } = storeToRefs(usePageLayoutStore());
const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());
const { reveal: revealHeader } = storeToRefs(useLayoutHeaderStore());

// Header reveal — one-time init instead of per-navigation
const enableHeaderReveal = ref(false);
setTimeout(() => {
  enableHeaderReveal.value = true;
}, 500);

function captureHeaderReveal(reveal: boolean) {
  revealHeader.value = reveal;
}

// Determine layout mode from route name
const route = useRoute();
const nonDrawerRoutePatterns = [
  "/onboarding/",
  "/verify/",
  "/welcome",
  "/[...all]",
];

const isDrawerLayout = computed(() => {
  const name = String(route.name ?? "");
  if (name.includes(".embed")) return false;
  return !nonDrawerRoutePatterns.some((pattern) => name.startsWith(pattern));
});

const { showNotifyMessage, showPersistentNotifyMessage } = useNotify();

// Offline notification — state machine handles show/dismiss logic.
// Quasar dismiss reference tracked here (not in the state machine) since
// it is a framework-specific side effect.
let dismissOfflineFn: (() => void) | null = null;

const offlineController = createOfflineNotificationController({
  showOffline: () => {
    dismissOfflineFn = showPersistentNotifyMessage({
      message: t("connectionLost"),
      caption: t("reconnecting"),
      showSpinner: true,
      onDismiss: () => { dismissOfflineFn = null; },
    });
  },
  dismissOffline: () => {
    dismissOfflineFn?.();
    dismissOfflineFn = null;
  },
  showConnected: () => {
    showNotifyMessage(t("connected"));
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

<style scoped lang="scss">
.bottomPagePadding {
  padding-bottom: 10rem;
}

.footerBackground {
  background-color: white;
  box-shadow:
    0px 0px 1px rgba(20, 20, 20, 0.04),
    0px 0px 8px rgba(20, 20, 20, 0.08);
}

.generalPagePadding {
  padding: 1rem;
}

.scrollContainer {
  width: 100%;
  height: 100%;
}

.headerStyle {
  background-color: $app-background-color;
}
</style>
