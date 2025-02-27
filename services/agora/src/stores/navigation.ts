import { useWindowSize } from "@vueuse/core";
import { defineStore } from "pinia";
import { onMounted, ref, watch } from "vue";

export const useNavigationStore = defineStore("navigation", () => {
  const { width } = useWindowSize();

  const showMobileDrawer = ref(false);
  const drawerBehavior = ref<"desktop" | "mobile">("mobile");

  onMounted(() => {
    updateDrawers();
  });

  watch(width, () => {
    updateDrawers();
  });

  function updateDrawers() {
    if (width.value > 1000) {
      drawerBehavior.value = "desktop";
      showMobileDrawer.value = true;
    } else {
      drawerBehavior.value = "mobile";
      showMobileDrawer.value = false;
    }
  }

  return { showMobileDrawer, drawerBehavior };
});
