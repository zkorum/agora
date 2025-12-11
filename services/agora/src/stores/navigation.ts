import { useWindowSize } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref, watch } from "vue";

const DRAWER_BREAKPOINT = 1000;

export const useNavigationStore = defineStore("navigation", () => {
  const { width } = useWindowSize();

  // Initialize based on current window width instead of using onMounted
  // (onMounted doesn't work reliably in Pinia stores)
  const isDesktop = width.value > DRAWER_BREAKPOINT;
  const showMobileDrawer = ref(isDesktop);
  const drawerBehavior = ref<"desktop" | "mobile">(isDesktop ? "desktop" : "mobile");
  const cameFromConversationCreation = ref(false);

  watch(width, () => {
    updateDrawers();
  }, { immediate: true });

  function updateDrawers() {
    if (width.value > DRAWER_BREAKPOINT) {
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
    cameFromConversationCreation,
    setConversationCreationContext,
    clearConversationCreationContext,
  };
});
