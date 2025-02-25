import { useWindowSize } from "@vueuse/core";
import { defineStore } from "pinia";
import { onMounted, ref, watch } from "vue";

export const useNavigationStore = defineStore("navigation", () => {
  const { width } = useWindowSize();

  const showMobileDrawer = ref(false);
  const showDesktopDrawer = ref(false);

  onMounted(() => {
    updateDrawers();
  });

  watch(width, () => {
    updateDrawers();
  });

  function updateDrawers() {
    if (width.value > 1000) {
      showMobileDrawer.value = false;
      showDesktopDrawer.value = true;
    } else {
      showDesktopDrawer.value = false;
    }
  }

  return { showMobileDrawer, showDesktopDrawer };
});
