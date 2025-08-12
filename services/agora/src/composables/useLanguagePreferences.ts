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
import type { GetLanguagePreferencesResponse } from "src/shared/types/dto";
import type { ApiV1UserLanguagePreferencesGetPost200Response } from "src/api";

export function useLanguagePreferences() {
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

  // Helper function to update locale consistently
  function updateLocale(localeCode: SupportedDisplayLanguageCodes) {
    if (availableLocales.includes(localeCode)) {
      locale.value = localeCode;
      storedDisplayLanguage.value = localeCode;
    }
  }

  // Helper function to validate API response data
  function validateLanguageData(
    data: ApiV1UserLanguagePreferencesGetPost200Response
  ): GetLanguagePreferencesResponse {
    const validatedDisplayLanguage = toSupportedDisplayLanguageCode(
      data.displayLanguage
    );
    const validatedSpokenLanguages = Array.isArray(data.spokenLanguages)
      ? data.spokenLanguages
          .map((lang: string) => toSupportedSpokenLanguageCode(lang))
          .filter(
            (mappedCode): mappedCode is SupportedSpokenLanguageCodes =>
              mappedCode !== undefined
          )
      : [];

    return {
      displayLanguage: validatedDisplayLanguage || "en",
      spokenLanguages: validatedSpokenLanguages,
    };
  }

  // Fetch user language preferences from API
  async function loadLanguagePreferences() {
    try {
      const response = await fetchLanguagePreferences();

      if (response.status === "success") {
        const validated = validateLanguageData(response.data);

        displayLanguage.value = validated.displayLanguage;
        spokenLanguages.value = validated.spokenLanguages;
        updateLocale(validated.displayLanguage);

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

  // Save language preferences to API
  async function saveLanguagePreferences(
    newDisplayLanguage: SupportedDisplayLanguageCodes,
    newSpokenLanguages: SupportedSpokenLanguageCodes[]
  ) {
    try {
      const response = await updateLanguagePreferences({
        displayLanguage: newDisplayLanguage,
        spokenLanguages: newSpokenLanguages,
      });

      if (response.status === "success") {
        displayLanguage.value = newDisplayLanguage;
        spokenLanguages.value = newSpokenLanguages;
        updateLocale(newDisplayLanguage);

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

  // Update only display language
  async function updateDisplayLanguage(
    newLanguage: SupportedDisplayLanguageCodes
  ) {
    return saveLanguagePreferences(newLanguage, spokenLanguages.value);
  }

  // Update only spoken languages
  async function updateSpokenLanguages(
    newLanguages: SupportedSpokenLanguageCodes[]
  ) {
    return saveLanguagePreferences(displayLanguage.value, newLanguages);
  }

  // Initialize with stored or detected language
  function initializeLanguage() {
    const storedLocale = storedDisplayLanguage.value;

    if (storedLocale && availableLocales.includes(storedLocale)) {
      const displayLang = toSupportedDisplayLanguageCode(storedLocale);
      if (displayLang) {
        displayLanguage.value = displayLang;
        locale.value = storedLocale;
      }
    } else {
      const browserDetection = parseBrowserLanguage(navigator.language);
      displayLanguage.value = browserDetection.displayLanguage;
      updateLocale(browserDetection.displayLanguage);
    }

    // Set default spoken languages to include display language
    if (spokenLanguages.value.length === 0) {
      spokenLanguages.value = [displayLanguage.value];
    }
  }

  // Change display language (handles both authenticated and non-authenticated users)
  async function changeDisplayLanguage(
    newLanguage: SupportedDisplayLanguageCodes
  ) {
    try {
      // Update local state immediately for better UX
      displayLanguage.value = newLanguage;
      updateLocale(newLanguage);

      // If user is authenticated, save to API in the background
      if (authStore.isLoggedIn) {
        try {
          await updateDisplayLanguage(newLanguage);
        } catch (err) {
          showNotifyMessage("Failed to save language preference to API");
          console.error("Failed to save language preference to API:", err);
        }
      }

      return true;
    } catch (err) {
      showNotifyMessage("Failed to change display language");
      console.error("Error changing display language:", err);
      throw err;
    }
  }

  // Clear language preferences and reset to browser language (for logout cleanup)
  function clearLanguagePreferences() {
    // Clear localStorage
    storedDisplayLanguage.value = null;

    // Reset to browser-detected language (reuse existing logic)
    const browserDetection = parseBrowserLanguage(navigator.language);
    displayLanguage.value = browserDetection.displayLanguage;
    spokenLanguages.value = [browserDetection.displayLanguage];
    updateLocale(browserDetection.displayLanguage);
  }

  return {
    // Reactive state
    displayLanguage: computed(() => displayLanguage.value),
    spokenLanguages: computed(() => spokenLanguages.value),
    availableLocales,

    // Core functions
    loadLanguagePreferences,
    saveLanguagePreferences,
    updateDisplayLanguage,
    updateSpokenLanguages,
    changeDisplayLanguage,
    initializeLanguage,
    clearLanguagePreferences,
  };
}
