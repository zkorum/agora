import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { loadLocaleMessages, setI18nLanguage } from "src/boot/i18n";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import { parseSupportedDisplayLanguageOrUndefined } from "src/shared/languages";
import type { LanguagePreferences } from "src/shared/types/zod";
import { zodLanguagePreferences } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { isNetworkError } from "src/utils/api/common";
import { useBackendLanguageApi } from "src/utils/api/language";
import {
  detectInitialDisplayLanguage,
  parseBrowserLanguage,
} from "src/utils/language";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import {
  type LanguageStoreTranslations,
  languageStoreTranslations,
} from "./language.i18n";

function getDefaultDisplayLanguage(): SupportedDisplayLanguageCodes {
  return detectInitialDisplayLanguage({
    storedLanguage: undefined,
  });
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
  const { t } = useComponentI18n<LanguageStoreTranslations>(
    languageStoreTranslations
  );

  // Browser detection is a default, not a saved override of future browser preferences.
  const browserDisplayLanguage = ref(getDefaultDisplayLanguage());
  const storedDisplayLanguage = useLocalStorage<
    SupportedDisplayLanguageCodes | undefined
  >("displayLanguage", undefined, {
    writeDefaults: false,
    serializer: {
      read: parseSupportedDisplayLanguageOrUndefined,
      write: (languageCode) => languageCode ?? "",
    },
  });
  const displayLanguage = computed(
    () => storedDisplayLanguage.value ?? browserDisplayLanguage.value
  );
  // Selecting or clearing a preference can invalidate work even if the language stays the same.
  let displayLanguageRevision = 0;

  const spokenLanguages = useLocalStorage<SupportedSpokenLanguageCodes[]>(
    "spokenLanguages",
    getDefaultSpokenLanguages()
  );

  // Boot loads messages lazily; only switch directly when this locale is already available.
  if (availableLocales.includes(displayLanguage.value)) {
    locale.value = displayLanguage.value;
  }

  function captureLanguageOperation(): () => boolean {
    const revision = displayLanguageRevision;
    const userId = authStore.userId;
    return () =>
      displayLanguageRevision === revision && authStore.userId === userId;
  }

  async function applyCurrentLocale(
    isCurrentOperation: () => boolean
  ): Promise<boolean> {
    const localeCode = displayLanguage.value;
    await loadLocaleMessages(localeCode);
    if (!isCurrentOperation()) {
      return false;
    }

    setI18nLanguage(localeCode);
    return true;
  }

  async function loadLanguagePreferencesFromBackend(): Promise<LanguagePreferences | null> {
    const requestDisplayLanguage = displayLanguage.value;
    const requestStoredLanguage = storedDisplayLanguage.value;
    const isCurrentAccountOperation = captureLanguageOperation();
    const isCurrentOperation = () =>
      isCurrentAccountOperation() &&
      displayLanguage.value === requestDisplayLanguage &&
      storedDisplayLanguage.value === requestStoredLanguage;
    try {
      const response = await getLanguagePreferences({
        currentDisplayLanguage: requestDisplayLanguage,
      });
      if (!isCurrentOperation()) {
        return null;
      }

      if (response.status === "success") {
        const validationResult = zodLanguagePreferences.safeParse(
          response.data
        );

        if (!validationResult.success) {
          showNotifyMessage(t("failedToFetchLanguagePreferences"));
          console.error(
            "Invalid language preferences data:",
            validationResult.error
          );
          return null;
        }

        const validated = validationResult.data;

        await loadLocaleMessages(validated.displayLanguage);
        if (!isCurrentOperation()) {
          return null;
        }

        displayLanguageRevision += 1;
        spokenLanguages.value = validated.spokenLanguages;
        storedDisplayLanguage.value = validated.displayLanguage;
        setI18nLanguage(validated.displayLanguage);

        return validated;
      } else {
        // Network errors are covered by the "Connection lost" notification
        if (!isNetworkError(response.code)) {
          showNotifyMessage(t("failedToFetchLanguagePreferences"));
          console.error(
            "Failed to fetch language preferences from backend:",
            response.code,
            response.message
          );
        }
        return null;
      }
    } catch (err) {
      if (!isCurrentOperation()) {
        return null;
      }
      showNotifyMessage(t("failedToFetchLanguagePreferences"));
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
      showNotifyMessage(t("failedToSaveLanguagePreferences"));
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
      showNotifyMessage(t("failedToSaveDisplayLanguagePreference"));
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

      if (authStore.isGuestOrLoggedIn) {
        await saveSpokenLanguagesToBackend({
          newSpokenLanguages: newLanguages,
        });
      }

      return true;
    } catch (err) {
      spokenLanguages.value = previousSpokenLanguages;
      showNotifyMessage(t("failedToUpdateSpokenLanguages"));
      console.error("Error updating spoken languages:", err);
      return false;
    }
  }

  async function changeDisplayLanguage({
    newLanguage,
  }: {
    newLanguage: SupportedDisplayLanguageCodes;
  }): Promise<boolean> {
    const previousStoredLanguage = storedDisplayLanguage.value;
    displayLanguageRevision += 1;
    const isCurrentOperation = captureLanguageOperation();
    storedDisplayLanguage.value = newLanguage;

    try {
      if (!(await applyCurrentLocale(isCurrentOperation))) {
        return false;
      }

      if (authStore.isGuestOrLoggedIn) {
        await saveDisplayLanguageToBackend({
          newDisplayLanguage: newLanguage,
        });
      }

      return isCurrentOperation();
    } catch (err) {
      if (!isCurrentOperation()) {
        return false;
      }
      showNotifyMessage(t("failedToChangeDisplayLanguage"));
      console.error("Error changing display language:", err);
      storedDisplayLanguage.value = previousStoredLanguage;
      await applyCurrentLocale(isCurrentOperation);
      return false;
    }
  }

  async function clearLanguagePreferences(): Promise<boolean> {
    const browserDefaultDisplayLanguage = getDefaultDisplayLanguage();
    const browserDefaultSpokenLanguages = getDefaultSpokenLanguages();

    const previousStoredLanguage = storedDisplayLanguage.value;
    const previousBrowserLanguage = browserDisplayLanguage.value;
    displayLanguageRevision += 1;
    const isCurrentOperation = captureLanguageOperation();

    try {
      browserDisplayLanguage.value = browserDefaultDisplayLanguage;
      storedDisplayLanguage.value = undefined;
      if (!(await applyCurrentLocale(isCurrentOperation))) {
        return false;
      }
      spokenLanguages.value = browserDefaultSpokenLanguages;

      return true;
    } catch (err) {
      if (!isCurrentOperation()) {
        return false;
      }
      browserDisplayLanguage.value = previousBrowserLanguage;
      storedDisplayLanguage.value = previousStoredLanguage;
      await applyCurrentLocale(isCurrentOperation);

      showNotifyMessage(t("failedToClearLanguagePreferences"));
      console.error("Error clearing language preferences:", err);
      return false;
    }
  }

  return {
    displayLanguage,
    spokenLanguages: computed(() => spokenLanguages.value),
    availableLocales,
    loadLanguagePreferencesFromBackend,
    updateSpokenLanguages,
    changeDisplayLanguage,
    clearLanguagePreferences,
  };
});
