import { useWindowSize } from "@vueuse/core";
import { defineStore } from "pinia";
import { onMounted, ref, watch } from "vue";

const DRAWER_BREAKPOINT = 1000;

export const useNavigationStore = defineStore("navigation", () => {
  const { width } = useWindowSize();

  const showMobileDrawer = ref(false);
  const drawerBehavior = ref<"desktop" | "mobile">("mobile");
  const cameFromConversationCreation = ref(false);

  onMounted(() => {
    updateDrawers();
  });

  watch(width, () => {
    updateDrawers();
  });

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
