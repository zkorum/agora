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
import {
  parseBrowserLanguage,
  toSupportedSpokenLanguageCode,
} from "src/shared/languages";
import type { ApiV1UserLanguagePreferencesGetPost200Response } from "src/api";

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

  function validateLanguageData(
    data: ApiV1UserLanguagePreferencesGetPost200Response
  ): { spokenLanguages: SupportedSpokenLanguageCodes[] } {
    const validatedSpokenLanguages = Array.isArray(data.spokenLanguages)
      ? data.spokenLanguages
          .map((lang: string) => toSupportedSpokenLanguageCode(lang))
          .filter(
            (mappedCode): mappedCode is SupportedSpokenLanguageCodes =>
              mappedCode !== undefined
          )
      : [];

    return {
      spokenLanguages: validatedSpokenLanguages,
    };
  }

  async function loadSpokenLanguagesFromBackend() {
    try {
      const response = await fetchLanguagePreferences(displayLanguage.value);

      if (response.status === "success") {
        const validated = validateLanguageData(response.data);

        // Only update spoken languages from backend, keep display language local
        spokenLanguages.value = validated.spokenLanguages;

        return response.data;
      } else {
        throw new Error("Failed to fetch spoken languages from backend");
      }
    } catch (err) {
      showNotifyMessage("Failed to fetch spoken languages from backend");
      console.error("Error fetching spoken languages from backend:", err);
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
    loadSpokenLanguagesFromBackend,
    updateSpokenLanguages,
    changeDisplayLanguage,
    clearLanguagePreferences,
  };
});
