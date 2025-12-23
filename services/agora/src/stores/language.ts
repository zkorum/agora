import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import type { LanguagePreferences } from "src/shared/types/zod";
import { zodLanguagePreferences } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendLanguageApi } from "src/utils/api/language";
import { parseBrowserLanguage } from "src/utils/language";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

function getDefaultDisplayLanguage(): SupportedDisplayLanguageCodes {
  // Use browser detection for smart default
  const browserDetection = parseBrowserLanguage({
    browserLang: navigator.language,
  });
  return browserDetection.displayLanguage;
}

function getDefaultSpokenLanguages(): SupportedSpokenLanguageCodes[] {
  // Use browser detection for smart default
  const browserDetection = parseBrowserLanguage({
    browserLang: navigator.language,
  });
  return browserDetection.spokenLanguages;
}

export const useLanguageStore = defineStore("language", () => {
  const { locale, availableLocales } = useI18n();
  const { getLanguagePreferences, updateLanguagePreferences } =
    useBackendLanguageApi();

  const authStore = useAuthenticationStore();
  const { showNotifyMessage } = useNotify();

  // Single source of truth: localStorage-backed reactive refs with smart defaults
  const displayLanguage = useLocalStorage<SupportedDisplayLanguageCodes>(
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

  function updateLocale(localeCode: SupportedDisplayLanguageCodes): void {
    if (availableLocales.includes(localeCode)) {
      locale.value = localeCode;
      displayLanguage.value = localeCode;
    } else {
      console.error(`Unknown locale for i18n: ${localeCode}`, availableLocales);
    }
  }

  async function loadLanguagePreferencesFromBackend(): Promise<LanguagePreferences | null> {
    try {
      const response = await getLanguagePreferences({
        currentDisplayLanguage: displayLanguage.value,
      });

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

        return validated;
      } else {
        throw new Error("Failed to fetch language preferences from backend");
      }
    } catch (err) {
      showNotifyMessage("Failed to fetch language preferences from backend");
      console.error("Error fetching language preferences from backend:", err);
      return null;
    }
  }

  async function saveSpokenLanguagesToBackend({
    newSpokenLanguages,
  }: {
    newSpokenLanguages: SupportedSpokenLanguageCodes[];
  }): Promise<void> {
    try {
      const response = await updateLanguagePreferences({
        spokenLanguages: newSpokenLanguages,
        displayLanguage: displayLanguage.value,
      });

      if (response.status === "success") {
        spokenLanguages.value = newSpokenLanguages;
      } else {
        throw new Error("Failed to save language preferences");
      }
    } catch (err) {
      showNotifyMessage("Failed to save language preferences");
      console.error("Error saving language preferences:", err);
      throw err;
    }
  }

  async function saveDisplayLanguageToBackend({
    newDisplayLanguage,
  }: {
    newDisplayLanguage: SupportedDisplayLanguageCodes;
  }): Promise<void> {
    try {
      const response = await updateLanguagePreferences({
        spokenLanguages: spokenLanguages.value,
        displayLanguage: newDisplayLanguage,
      });

      if (response.status !== "success") {
        throw new Error("Failed to save display language preference");
      }
    } catch (err) {
      showNotifyMessage("Failed to save display language preference");
      console.error("Error saving display language preference:", err);
      throw err;
    }
  }

  async function updateSpokenLanguages({
    newLanguages,
  }: {
    newLanguages: SupportedSpokenLanguageCodes[];
  }): Promise<boolean> {
    const previousSpokenLanguages = [...spokenLanguages.value];

    try {
      spokenLanguages.value = newLanguages;

      if (authStore.isLoggedIn) {
        await saveSpokenLanguagesToBackend({
          newSpokenLanguages: newLanguages,
        });
      }

      return true;
    } catch (err) {
      spokenLanguages.value = previousSpokenLanguages;
      showNotifyMessage("Failed to update spoken languages");
      console.error("Error updating spoken languages:", err);
      return false;
    }
  }

  function changeDisplayLanguage({
    newLanguage,
  }: {
    newLanguage: SupportedDisplayLanguageCodes;
  }): boolean {
    const originalLanguage = displayLanguage.value;
    try {
      updateLocale(newLanguage);

      // Save to backend if user is authenticated (in background)
      if (authStore.isLoggedIn) {
        saveDisplayLanguageToBackend({ newDisplayLanguage: newLanguage }).catch(
          (err) => {
            // Revert on failure
            updateLocale(originalLanguage);
            console.error("Failed to save display language to backend:", err);
          }
        );
      }

      return true;
    } catch (err) {
      showNotifyMessage("Failed to change display language");
      console.error("Error changing display language:", err);
      // Revert on failure
      updateLocale(originalLanguage);
      return false;
    }
  }

  async function clearLanguagePreferences(): Promise<boolean> {
    // Get browser defaults
    const browserDefaultDisplayLanguage = getDefaultDisplayLanguage();
    const browserDefaultSpokenLanguages = getDefaultSpokenLanguages();

    // Store original values for rollback
    const originalDisplayLanguage = displayLanguage.value;
    const originalSpokenLanguages = [...spokenLanguages.value];

    try {
      // Reset to browser defaults
      updateLocale(browserDefaultDisplayLanguage);
      spokenLanguages.value = browserDefaultSpokenLanguages;

      // Save to backend if user is authenticated (in background)
      if (authStore.isLoggedIn) {
        await Promise.all([
          saveDisplayLanguageToBackend({
            newDisplayLanguage: browserDefaultDisplayLanguage,
          }),
          saveSpokenLanguagesToBackend({
            newSpokenLanguages: browserDefaultSpokenLanguages,
          }),
        ]);
      }

      return true;
    } catch (err) {
      // Revert on failure
      updateLocale(originalDisplayLanguage);
      spokenLanguages.value = originalSpokenLanguages;

      showNotifyMessage("Failed to clear language preferences");
      console.error("Error clearing language preferences:", err);
      return false;
    }
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
