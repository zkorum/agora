import { defineStore } from "pinia";
import { useQuasar } from "quasar";
import { computed, ref } from "vue";

import { usePageLayoutStore } from "./layout/pageLayout";

export const useNavigationStore = defineStore("navigation", () => {
  const $q = useQuasar();
  const pageLayoutStore = usePageLayoutStore();

  // Derived from SCSS $breakpoint-xs via Quasar's runtime screen sizes.
  // $q.screen.sizes.sm = $breakpoint-xs + 1 (555), so sm - 1 = 554.
  const drawerBreakpoint = $q.screen.sizes.sm - 1;

  // $q.screen.gt.xs = true when width > $breakpoint-xs (554px)
  // This matches Figma: sidebar appears at 555px+
  const showMobileDrawer = ref($q.screen.gt.xs);
  const drawerBehavior = computed<"desktop" | "mobile">(() =>
    $q.screen.gt.xs ? "desktop" : "mobile"
  );
  const cameFromConversationCreation = ref(false);

  const hasFooterBar = computed(() =>
    drawerBehavior.value === "mobile" && pageLayoutStore.config.enableFooter
  );

  // Small sidebar at 555–960px, large sidebar at >960px
  // Mobile overlay (≤554px): 300px — doesn't compete with feed
  const drawerWidth = computed(() => {
    if (drawerBehavior.value === "mobile") return 280;
    return $q.screen.gt.sm ? 340 : 200;
  });

  function setConversationCreationContext(value: boolean) {
    cameFromConversationCreation.value = value;
  }

  function clearConversationCreationContext() {
    cameFromConversationCreation.value = false;
  }

  return {
    showMobileDrawer,
    drawerBehavior,
    drawerBreakpoint,
    drawerWidth,
    hasFooterBar,
    cameFromConversationCreation,
    setConversationCreationContext,
    clearConversationCreationContext,
  };
});
