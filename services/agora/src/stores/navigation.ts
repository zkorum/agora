import { defineStore } from "pinia";
import { ref } from "vue";

export const useNavigationStore = defineStore("navigation", () => {
  const showDrawer = ref(false);

  return { showDrawer };
});
