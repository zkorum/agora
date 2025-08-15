import { defineStore } from "pinia";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useLocalStorage } from "@vueuse/core";
import { useBackendLanguageApi } from "src/utils/api/language";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotify } from "src/utils/ui/notify";
import type { MessageLanguages } from "src/boot/i18n";
import type {
  SupportedSpokenLanguageCodes,
  SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { parseBrowserLanguage } from "src/shared/languages";
import type { LanguagePreferences } from "src/shared/types/zod";
import { zodLanguagePreferences } from "src/shared/types/zod";

function getDefaultDisplayLanguage(): MessageLanguages {
  // Use browser detection for smart default
  const browserDetection = parseBrowserLanguage(navigator.language);
  return browserDetection.displayLanguage;
}

function getDefaultSpokenLanguages(): SupportedSpokenLanguageCodes[] {
  // Use browser detection for smart default
  const browserDetection = parseBrowserLanguage(navigator.language);
  return browserDetection.spokenLanguages;
}

export const useLanguageStore = defineStore("language", () => {
  const { locale, availableLocales } = useI18n();
  const { fetchLanguagePreferences, updateLanguagePreferences } =
    useBackendLanguageApi();

  const authStore = useAuthenticationStore();
  const { showNotifyMessage } = useNotify();

  // Single source of truth: localStorage-backed reactive refs with smart defaults
  const displayLanguage = useLocalStorage<MessageLanguages>(
    "displayLanguage",
    getDefaultDisplayLanguage()
  );

  const spokenLanguages = useLocalStorage<SupportedSpokenLanguageCodes[]>(
    "spokenLanguages",
    getDefaultSpokenLanguages()
  );

  // Initialize i18n locale to match stored display language
  if (availableLocales.includes(displayLanguage.value)) {
    locale.value = displayLanguage.value;
  }

  function updateLocale(localeCode: SupportedDisplayLanguageCodes) {
    if (availableLocales.includes(localeCode)) {
      locale.value = localeCode;
      displayLanguage.value = localeCode;
    }
  }

  async function loadLanguagePreferencesFromBackend(): Promise<LanguagePreferences> {
    try {
      const response = await fetchLanguagePreferences(displayLanguage.value);

      if (response.status === "success") {
        const validationResult = zodLanguagePreferences.safeParse(
          response.data
        );

        if (!validationResult.success) {
          throw new Error(
            `Invalid language preferences data: ${validationResult.error.message}`
          );
        }

        const validated = validationResult.data;

        // Update spoken languages from backend
        spokenLanguages.value = validated.spokenLanguages;

        // Update display language from backend
        updateLocale(validated.displayLanguage);

        return response.data;
      } else {
        throw new Error("Failed to fetch language preferences from backend");
      }
    } catch (err) {
      showNotifyMessage("Failed to fetch language preferences from backend");
      console.error("Error fetching language preferences from backend:", err);
      throw err;
    }
  }

  async function saveSpokenLanguagesToBackend(
    newSpokenLanguages: SupportedSpokenLanguageCodes[]
  ) {
    try {
      const response = await updateLanguagePreferences({
        spokenLanguages: newSpokenLanguages,
      });

      if (response.status === "success") {
        spokenLanguages.value = newSpokenLanguages;
        return response.data;
      } else {
        throw new Error("Failed to save language preferences");
      }
    } catch (err) {
      showNotifyMessage("Failed to save language preferences");
      console.error("Error saving language preferences:", err);
      throw err;
    }
  }

  async function saveDisplayLanguageToBackend(
    newDisplayLanguage: SupportedDisplayLanguageCodes
  ) {
    try {
      const response = await updateLanguagePreferences({
        displayLanguage: newDisplayLanguage,
      });

      if (response.status === "success") {
        return response.data;
      } else {
        throw new Error("Failed to save display language preference");
      }
    } catch (err) {
      showNotifyMessage("Failed to save display language preference");
      console.error("Error saving display language preference:", err);
      throw err;
    }
  }

  async function updateSpokenLanguages(
    newLanguages: SupportedSpokenLanguageCodes[]
  ) {
    const previousSpokenLanguages = [...spokenLanguages.value];

    try {
      spokenLanguages.value = newLanguages;

      if (authStore.isLoggedIn) {
        try {
          await saveSpokenLanguagesToBackend(newLanguages);
        } catch (err) {
          spokenLanguages.value = previousSpokenLanguages;

          showNotifyMessage("Failed to save language preferences to API");
          console.error("Failed to save language preferences to API:", err);
          throw err;
        }
      }

      return true;
    } catch (err) {
      showNotifyMessage("Failed to update spoken languages");
      console.error("Error updating spoken languages:", err);
      throw err;
    }
  }

  function changeDisplayLanguage(newLanguage: SupportedDisplayLanguageCodes) {
    try {
      updateLocale(newLanguage);

      // Save to backend if user is authenticated (in background)
      if (authStore.isLoggedIn) {
        saveDisplayLanguageToBackend(newLanguage).catch((err) => {
          console.error("Failed to save display language to backend:", err);
          // Don't throw error - user experience should continue even if backend save fails
        });
      }

      return true;
    } catch (err) {
      showNotifyMessage("Failed to change display language");
      console.error("Error changing display language:", err);
      throw err;
    }
  }

  function clearLanguagePreferences() {
    // Reset spoken languages to include current display language
    spokenLanguages.value = [displayLanguage.value];
  }

  return {
    displayLanguage: computed(() => displayLanguage.value),
    spokenLanguages: computed(() => spokenLanguages.value),
    availableLocales,
    loadLanguagePreferencesFromBackend,
    updateSpokenLanguages,
    changeDisplayLanguage,
    clearLanguagePreferences,
  };
});
