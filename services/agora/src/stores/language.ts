import { defineStore } from "pinia";
import { ref, computed } from "vue";
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
  toSupportedDisplayLanguageCode,
  toSupportedSpokenLanguageCode,
} from "src/shared/languages";
import type { ApiV1UserLanguagePreferencesGetPost200Response } from "src/api";

export const useLanguageStore = defineStore("language", () => {
  const { locale, availableLocales } = useI18n();
  const { fetchLanguagePreferences, updateLanguagePreferences } =
    useBackendLanguageApi();

  const authStore = useAuthenticationStore();
  const { showNotifyMessage } = useNotify();

  const displayLanguage = ref<SupportedDisplayLanguageCodes>("en");
  const spokenLanguages = ref<SupportedSpokenLanguageCodes[]>([]);

  // Use VueUse's useLocalStorage for reactive localStorage
  const storedDisplayLanguage = useLocalStorage<MessageLanguages>(
    "displayLanguage",
    "en"
  );
  const storedSpokenLanguages = useLocalStorage<SupportedSpokenLanguageCodes[]>(
    "spokenLanguages",
    []
  );

  function updateLocale(localeCode: SupportedDisplayLanguageCodes) {
    if (availableLocales.includes(localeCode)) {
      locale.value = localeCode;
      storedDisplayLanguage.value = localeCode;
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

  async function loadLanguagePreferences() {
    try {
      const response = await fetchLanguagePreferences(displayLanguage.value);

      if (response.status === "success") {
        const validated = validateLanguageData(response.data);

        // Only update spoken languages from backend, keep display language local
        spokenLanguages.value = validated.spokenLanguages;
        storedSpokenLanguages.value = validated.spokenLanguages;

        return response.data;
      } else {
        throw new Error("Failed to fetch language preferences");
      }
    } catch (err) {
      showNotifyMessage("Failed to fetch language preferences");
      console.error("Error fetching language preferences:", err);
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
    const previousStoredSpokenLanguages = [...storedSpokenLanguages.value];

    try {
      spokenLanguages.value = newLanguages;
      storedSpokenLanguages.value = newLanguages;

      if (authStore.isLoggedIn) {
        try {
          await saveSpokenLanguagesToBackend(newLanguages);
        } catch (err) {
          spokenLanguages.value = previousSpokenLanguages;
          storedSpokenLanguages.value = previousStoredSpokenLanguages;

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

  function initializeLanguage() {
    const storedLocale = storedDisplayLanguage.value;

    if (storedLocale && availableLocales.includes(storedLocale)) {
      const displayLang = toSupportedDisplayLanguageCode(storedLocale);
      if (displayLang) {
        displayLanguage.value = displayLang;
        locale.value = storedLocale;
        console.log(
          "Initialized display language from localStorage:",
          displayLang
        );
      }
    } else {
      const browserDetection = parseBrowserLanguage(navigator.language);
      displayLanguage.value = browserDetection.displayLanguage;
      updateLocale(browserDetection.displayLanguage);
      console.log(
        "Initialized display language from browser detection:",
        browserDetection.displayLanguage
      );
    }

    if (storedSpokenLanguages.value && storedSpokenLanguages.value.length > 0) {
      spokenLanguages.value = storedSpokenLanguages.value;
    } else {
      spokenLanguages.value = [displayLanguage.value];
      storedSpokenLanguages.value = [displayLanguage.value];
    }
  }

  function changeDisplayLanguage(newLanguage: SupportedDisplayLanguageCodes) {
    try {
      displayLanguage.value = newLanguage;
      updateLocale(newLanguage);
      return true;
    } catch (err) {
      showNotifyMessage("Failed to change display language");
      console.error("Error changing display language:", err);
      throw err;
    }
  }

  function clearLanguagePreferences() {
    // Only clear spoken languages, leave display language alone
    spokenLanguages.value = [displayLanguage.value];
    storedSpokenLanguages.value = [displayLanguage.value];
  }

  return {
    displayLanguage: computed(() => displayLanguage.value),
    spokenLanguages: computed(() => spokenLanguages.value),
    availableLocales,
    loadLanguagePreferences,
    updateSpokenLanguages,
    changeDisplayLanguage,
    initializeLanguage,
    clearLanguagePreferences,
  };
});
