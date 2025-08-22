import { defineStore } from "pinia";
import { ref } from "vue";

export const useOnboardingPreferencesStore = defineStore(
  "onboardingPreferences",
  () => {
    const showPreferencesDialog = ref(false);

    function openPreferencesDialog() {
      showPreferencesDialog.value = true;
    }

    function closePreferencesDialog() {
      showPreferencesDialog.value = false;
    }

    return {
      showPreferencesDialog,
      openPreferencesDialog,
      closePreferencesDialog,
    };
  }
);
