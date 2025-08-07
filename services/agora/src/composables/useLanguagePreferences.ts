import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBackendLanguageApi } from "src/utils/api/language";
import type { MessageLanguages } from "src/boot/i18n";
import type {
  SupportedAllLanguageCodes,
  SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import {
  ZodSupportedDisplayLanguageCodes,
  ZodSupportedAllLanguageCodes,
  parseBrowserLanguage,
} from "src/shared/languages";

export function useLanguagePreferences() {
  const { locale, availableLocales } = useI18n();
  const { fetchLanguagePreferences, updateLanguagePreferences } =
    useBackendLanguageApi();

  const displayLanguage = ref<SupportedDisplayLanguageCodes>("en");
  const spokenLanguages = ref<SupportedAllLanguageCodes[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Map between i18n locale codes and SupportedDisplayLanguageCodes
  const localeToDisplayLanguageMap: Record<
    MessageLanguages,
    SupportedDisplayLanguageCodes
  > = {
    "en-US": "en",
    es: "es",
    fr: "fr",
  };

  const displayLanguageToLocaleMap: Record<
    SupportedDisplayLanguageCodes,
    MessageLanguages
  > = {
    en: "en-US",
    es: "es",
    fr: "fr",
  };

  // Fetch user language preferences from API
  async function loadLanguagePreferences() {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetchLanguagePreferences();

      if (response.status === "success") {
        const data = response.data;

        // Validate and set display language using zod
        const displayLangResult = ZodSupportedDisplayLanguageCodes.safeParse(
          data.displayLanguage
        );
        if (displayLangResult.success) {
          displayLanguage.value = displayLangResult.data;
        } else {
          console.warn(
            "Invalid display language from API:",
            data.displayLanguage
          );
          displayLanguage.value = "en"; // fallback
        }

        // Update i18n locale
        const localeCode = displayLanguageToLocaleMap[displayLanguage.value];
        if (localeCode) {
          locale.value = localeCode;
          localStorage.setItem("displayLanguage", localeCode);
        }

        // Validate and set spoken languages using zod
        const spokenLangsResult =
          ZodSupportedAllLanguageCodes.array().safeParse(data.spokenLanguages);
        if (spokenLangsResult.success) {
          spokenLanguages.value = spokenLangsResult.data;
        } else {
          console.warn(
            "Invalid spoken languages from API:",
            data.spokenLanguages
          );
          spokenLanguages.value = [displayLanguage.value]; // fallback
        }

        return data;
      } else {
        throw new Error("Failed to fetch language preferences");
      }
    } catch (err) {
      error.value = "Failed to fetch language preferences";
      console.error("Error fetching language preferences:", err);

      // Fall back to browser detection if fetch fails
      const browserDetection = parseBrowserLanguage(navigator.language);
      displayLanguage.value = browserDetection.displayLanguage;
      spokenLanguages.value = browserDetection.spokenLanguages;

      // Update i18n locale for the detected language
      const localeCode =
        displayLanguageToLocaleMap[browserDetection.displayLanguage];
      if (localeCode) {
        locale.value = localeCode;
        localStorage.setItem("displayLanguage", localeCode);
      }

      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // Save language preferences to API
  async function saveLanguagePreferences(
    newDisplayLanguage: SupportedDisplayLanguageCodes,
    newSpokenLanguages: SupportedAllLanguageCodes[]
  ) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await updateLanguagePreferences({
        displayLanguage: newDisplayLanguage,
        spokenLanguages: newSpokenLanguages,
      });

      if (response.status === "success") {
        // Update local state
        displayLanguage.value = newDisplayLanguage;
        spokenLanguages.value = newSpokenLanguages;

        // Update i18n locale
        const localeCode = displayLanguageToLocaleMap[newDisplayLanguage];
        if (localeCode) {
          locale.value = localeCode;
          localStorage.setItem("displayLanguage", localeCode);
        }

        return response.data;
      } else {
        throw new Error("Failed to save language preferences");
      }
    } catch (err) {
      error.value = "Failed to save language preferences";
      console.error("Error saving language preferences:", err);
      throw err;
    } finally {
      isLoading.value = false;
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
    newLanguages: SupportedAllLanguageCodes[]
  ) {
    return saveLanguagePreferences(displayLanguage.value, newLanguages);
  }

  // Get the detected browser language using shared helper
  function getDetectedLanguage(): MessageLanguages {
    const browserDetection = parseBrowserLanguage(navigator.language);
    return displayLanguageToLocaleMap[browserDetection.displayLanguage];
  }

  // Initialize with detected language on first load
  function initializeWithDetectedLanguage() {
    const storedLocale = localStorage.getItem("displayLanguage");

    if (storedLocale && availableLocales.includes(storedLocale)) {
      locale.value = storedLocale;
      const displayLang =
        localeToDisplayLanguageMap[storedLocale as MessageLanguages];
      if (displayLang) {
        displayLanguage.value = displayLang;
      }
    } else {
      // Use shared browser detection helper
      const browserDetection = parseBrowserLanguage(navigator.language);
      displayLanguage.value = browserDetection.displayLanguage;

      const localeCode =
        displayLanguageToLocaleMap[browserDetection.displayLanguage];
      if (localeCode) {
        locale.value = localeCode;
        localStorage.setItem("displayLanguage", localeCode);
      }
    }

    // Set default spoken languages to include display language
    if (spokenLanguages.value.length === 0) {
      spokenLanguages.value = [displayLanguage.value];
    }
  }

  return {
    displayLanguage: computed(() => displayLanguage.value),
    spokenLanguages: computed(() => spokenLanguages.value),
    availableLocales: computed(() => availableLocales),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    loadLanguagePreferences,
    saveLanguagePreferences,
    updateDisplayLanguage,
    updateSpokenLanguages,
    getDetectedLanguage,
    initializeWithDetectedLanguage,

    localeToDisplayLanguageMap,
    displayLanguageToLocaleMap,
  };
}
