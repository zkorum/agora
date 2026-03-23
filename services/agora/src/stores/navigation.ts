import { defineStore } from "pinia";
import { useQuasar } from "quasar";
import { computed, ref, watch } from "vue";

import { usePageLayoutStore } from "./layout/pageLayout";

export const useNavigationStore = defineStore("navigation", () => {
  const $q = useQuasar();
  const pageLayoutStore = usePageLayoutStore();

  // $q.screen.gt.xs = true when width > $breakpoint-xs (554px)
  // This matches Figma: sidebar appears at 555px+
  const isDesktop = $q.screen.gt.xs;
  const showMobileDrawer = ref(isDesktop);
  const drawerBehavior = ref<"desktop" | "mobile">(isDesktop ? "desktop" : "mobile");
  const cameFromConversationCreation = ref(false);

  const hasFooterBar = computed(() =>
    drawerBehavior.value === "mobile" && pageLayoutStore.config.enableFooter
  );

  // Figma: small sidebar (179px) at 555–960px, large sidebar (273px) at >960px
  const drawerWidth = computed(() => $q.screen.gt.sm ? 273 : 179);

  watch(() => $q.screen.gt.xs, () => {
    updateDrawers();
  }, { immediate: true });

  function updateDrawers() {
    if ($q.screen.gt.xs) {
      drawerBehavior.value = "desktop";
      showMobileDrawer.value = true;
    } else {
      drawerBehavior.value = "mobile";
      showMobileDrawer.value = false;
    }
  }

  function setConversationCreationContext(value: boolean) {
    cameFromConversationCreation.value = value;
  }

  function clearConversationCreationContext() {
    cameFromConversationCreation.value = false;
  }

  return {
    showMobileDrawer,
    drawerBehavior,
    drawerWidth,
    hasFooterBar,
    cameFromConversationCreation,
    setConversationCreationContext,
    clearConversationCreationContext,
  };
});
