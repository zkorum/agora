import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import {
  hasFailedLocaleLoad,
  loadLocaleResources,
  setI18nLanguage,
} from "src/boot/i18n";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import { parseSupportedDisplayLanguageOrUndefined } from "src/shared/languages";
import type { UpdateLanguagePreferencesRequest } from "src/shared/types/dto";
import type { LanguagePreferences } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { setApiDisplayLanguage } from "src/utils/api/client";
import { isNetworkError } from "src/utils/api/common";
import { useBackendLanguageApi } from "src/utils/api/language";
import {
  detectBrowserDisplayLanguage,
  parseBrowserLanguage,
  resolveDisplayLanguage,
} from "src/utils/language";
import { useNotify } from "src/utils/ui/notify";
import { computed, onScopeDispose, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import {
  type LanguageStoreTranslations,
  languageStoreTranslations,
} from "./language.i18n";

const BACKGROUND_LANGUAGE_RECOVERY_DELAY_MS = 1000;

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
  const browserDisplayLanguage = ref(detectBrowserDisplayLanguage());
  const conversationFallbackLanguage = ref<SupportedDisplayLanguageCodes>();
  const isDisplayLanguageReady = ref(true);
  let localeApplicationRevision = 0;
  const storedDisplayLanguage = useLocalStorage<
    SupportedDisplayLanguageCodes | undefined
  >("displayLanguage", undefined, {
    writeDefaults: false,
    serializer: {
      read: parseSupportedDisplayLanguageOrUndefined,
      write: (languageCode) => languageCode ?? "",
    },
  });
  const preferredDisplayLanguage = computed(() =>
    resolveDisplayLanguage({
      storedLanguage: storedDisplayLanguage.value,
      browserLanguage: browserDisplayLanguage.value,
      conversationLanguage: conversationFallbackLanguage.value,
    })
  );
  const failedDisplayLanguage = ref(
    hasFailedLocaleLoad(preferredDisplayLanguage.value)
      ? preferredDisplayLanguage.value
      : undefined
  );
  // Resource fallback affects rendering only. Requests and persisted defaults
  // must keep the preferred language, never a temporary English UI fallback.
  const displayLanguage = preferredDisplayLanguage;
  const renderedDisplayLanguage = computed(() =>
    failedDisplayLanguage.value === preferredDisplayLanguage.value
      ? "en"
      : preferredDisplayLanguage.value
  );
  // Synchronous defaults keep request headers aligned with reactive query keys.
  watch(displayLanguage, setApiDisplayLanguage, {
    immediate: true,
    flush: "sync",
  });
  // Selecting or clearing a preference can invalidate work even if the language stays the same.
  let displayLanguageRevision = 0;
  let accountRevision = 0;
  let spokenLanguageRevision = 0;
  let backgroundRecoveryStarted = false;
  let isDisposed = false;
  let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
  const attemptedBackgroundLocales = new Set<SupportedDisplayLanguageCodes>();
  // Comparing IDs alone misses an account switch away and back during an await.
  watch(
    () => authStore.userId,
    () => {
      accountRevision += 1;
      displayLanguageRevision += 1;
    },
    { flush: "sync" }
  );

  onScopeDispose(() => {
    isDisposed = true;
    clearTimeout(recoveryTimer);
  });

  const spokenLanguages = useLocalStorage<SupportedSpokenLanguageCodes[]>(
    "spokenLanguages",
    getDefaultSpokenLanguages()
  );

  // Boot loads messages lazily; only switch directly when this locale is already available.
  if (availableLocales.includes(renderedDisplayLanguage.value)) {
    locale.value = renderedDisplayLanguage.value;
  }

  function captureLanguageOperation(): () => boolean {
    const revision = displayLanguageRevision;
    const userId = authStore.userId;
    return () =>
      !isDisposed &&
      displayLanguageRevision === revision &&
      authStore.userId === userId;
  }

  function hasPendingLanguageRecovery(
    language: SupportedDisplayLanguageCodes
  ): boolean {
    return (
      hasFailedLocaleLoad(language) || failedDisplayLanguage.value === language
    );
  }

  function scheduleBackgroundLanguageRecovery(): void {
    const language = preferredDisplayLanguage.value;
    if (
      !backgroundRecoveryStarted ||
      recoveryTimer !== undefined ||
      isDisposed ||
      !hasPendingLanguageRecovery(language) ||
      attemptedBackgroundLocales.has(language)
    ) {
      return;
    }
    // One deferred attempt after the fallback page has had time to paint.
    recoveryTimer = setTimeout(() => {
      recoveryTimer = undefined;
      void retryFailedDisplayLanguage();
    }, BACKGROUND_LANGUAGE_RECOVERY_DELAY_MS);
  }

  function startBackgroundLanguageRecovery(): void {
    backgroundRecoveryStarted = true;
    scheduleBackgroundLanguageRecovery();
  }

  async function retryFailedDisplayLanguage(): Promise<boolean> {
    const language = preferredDisplayLanguage.value;
    const isCurrentAccountOperation = captureLanguageOperation();
    const applicationRevision = localeApplicationRevision;
    const isCurrent = () =>
      isCurrentAccountOperation() &&
      localeApplicationRevision === applicationRevision &&
      preferredDisplayLanguage.value === language;
    if (
      isDisposed ||
      !isCurrent() ||
      !hasPendingLanguageRecovery(language) ||
      attemptedBackgroundLocales.has(language)
    ) {
      return false;
    }
    attemptedBackgroundLocales.add(language);
    try {
      await loadLocaleResources(language);
      if (!isCurrent()) {
        return false;
      }
      setI18nLanguage(language);
      failedDisplayLanguage.value = undefined;
      return true;
    } catch (error) {
      // Keep the visible fallback and never schedule another retry automatically.
      console.warn("Background language recovery failed:", error);
      return false;
    } finally {
      // A different locale may have failed while this recovery was in flight.
      scheduleBackgroundLanguageRecovery();
    }
  }

  async function applyCurrentLocale(
    isCurrentOperation: () => boolean
  ): Promise<boolean> {
    const localeCode = renderedDisplayLanguage.value;
    const revision = ++localeApplicationRevision;
    isDisplayLanguageReady.value = availableLocales.includes(localeCode);
    try {
      await loadLocaleResources(localeCode);
      if (
        !isCurrentOperation() ||
        localeApplicationRevision !== revision ||
        renderedDisplayLanguage.value !== localeCode
      ) {
        return false;
      }
      setI18nLanguage(localeCode);
      scheduleBackgroundLanguageRecovery();
      return true;
    } catch (error) {
      if (
        isCurrentOperation() &&
        localeApplicationRevision === revision &&
        preferredDisplayLanguage.value === localeCode
      ) {
        failedDisplayLanguage.value = localeCode;
        setI18nLanguage("en");
        scheduleBackgroundLanguageRecovery();
      }
      throw error;
    } finally {
      if (localeApplicationRevision === revision) {
        isDisplayLanguageReady.value = true;
      }
    }
  }

  async function restoreCurrentLocale(
    isCurrentOperation: () => boolean
  ): Promise<void> {
    try {
      await applyCurrentLocale(isCurrentOperation);
    } catch (error) {
      // applyCurrentLocale already renders English and registers recovery.
      console.warn("Failed to restore display language:", error);
    }
  }

  async function setConversationLanguageFallback(
    language: SupportedDisplayLanguageCodes | undefined
  ): Promise<boolean> {
    const previousLanguage = displayLanguage.value;
    conversationFallbackLanguage.value = language;
    if (displayLanguage.value === previousLanguage) {
      return true;
    }

    const expectedLanguage = preferredDisplayLanguage.value;
    const isCurrentAccountOperation = captureLanguageOperation();
    const isCurrentOperation = () =>
      isCurrentAccountOperation() &&
      conversationFallbackLanguage.value === language &&
      preferredDisplayLanguage.value === expectedLanguage;
    try {
      return await applyCurrentLocale(isCurrentOperation);
    } catch (error) {
      if (isCurrentOperation()) {
        // Resource failure does not change the backend-owned conversation language.
        showNotifyMessage(t("failedToChangeDisplayLanguage"));
        console.error("Error applying conversation language fallback:", error);
      }
      return false;
    }
  }

  let accountRequestRevision = 0;

  async function loadLanguagePreferencesFromBackend(): Promise<
    LanguagePreferences | undefined
  > {
    const requestRevision = ++accountRequestRevision;
    const requestDisplayLanguage = displayLanguage.value;
    const requestStoredLanguage = storedDisplayLanguage.value;
    const requestSpokenLanguageRevision = spokenLanguageRevision;
    const isCurrentAccountOperation = captureLanguageOperation();
    const isCurrentOperation = () =>
      isCurrentAccountOperation() &&
      accountRequestRevision === requestRevision &&
      storedDisplayLanguage.value === requestStoredLanguage;
    try {
      const response = await getLanguagePreferences({
        currentDisplayLanguage: requestDisplayLanguage,
      });
      if (!isCurrentOperation()) {
        return undefined;
      }

      if (response.status === "success") {
        // The API boundary already parsed this shared DTO. Keep persisted
        // account preferences authoritative even if an automatic fallback moved.
        const preferences = response.data;
        const applicationRevision = ++localeApplicationRevision;
        isDisplayLanguageReady.value = availableLocales.includes(
          preferences.displayLanguage
        );
        let resourceFailure = false;
        try {
          await loadLocaleResources(preferences.displayLanguage);
        } catch (error) {
          resourceFailure = true;
          if (isCurrentOperation()) {
            console.warn("Failed to load account language resources:", error);
          }
        } finally {
          if (localeApplicationRevision === applicationRevision) {
            isDisplayLanguageReady.value = true;
          }
        }
        if (!isCurrentOperation()) {
          return undefined;
        }

        displayLanguageRevision += 1;
        localeApplicationRevision += 1;
        isDisplayLanguageReady.value = true;
        if (spokenLanguageRevision === requestSpokenLanguageRevision) {
          spokenLanguageRevision += 1;
          spokenLanguages.value = preferences.spokenLanguages;
        }
        failedDisplayLanguage.value = resourceFailure
          ? preferences.displayLanguage
          : undefined;
        storedDisplayLanguage.value = preferences.displayLanguage;
        setI18nLanguage(resourceFailure ? "en" : preferences.displayLanguage);
        if (resourceFailure) scheduleBackgroundLanguageRecovery();

        return preferences;
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
        return undefined;
      }
    } catch (err) {
      if (!isCurrentOperation()) {
        return undefined;
      }
      showNotifyMessage(t("failedToFetchLanguagePreferences"));
      console.error("Error fetching language preferences from backend:", err);
      return undefined;
    }
  }

  async function saveLanguagePreferences(
    preferences: UpdateLanguagePreferencesRequest
  ): Promise<void> {
    const response = await updateLanguagePreferences(preferences);
    if (response.status !== "success") {
      throw new Error("Failed to save language preferences");
    }
  }

  async function updateSpokenLanguages({
    newLanguages,
  }: {
    newLanguages: SupportedSpokenLanguageCodes[];
  }): Promise<boolean> {
    const previousSpokenLanguages = [...spokenLanguages.value];
    const revision = ++spokenLanguageRevision;
    const requestedAccountRevision = accountRevision;
    const isCurrent = () =>
      !isDisposed &&
      accountRevision === requestedAccountRevision &&
      spokenLanguageRevision === revision;

    try {
      spokenLanguages.value = newLanguages;

      if (authStore.isGuestOrLoggedIn) {
        await saveLanguagePreferences({
          spokenLanguages: newLanguages,
        });
      }

      return isCurrent();
    } catch (err) {
      if (!isCurrent()) return false;
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
    failedDisplayLanguage.value = undefined;
    storedDisplayLanguage.value = newLanguage;

    try {
      if (!(await applyCurrentLocale(isCurrentOperation))) {
        return false;
      }

      if (authStore.isGuestOrLoggedIn) {
        await saveLanguagePreferences({
          displayLanguage: newLanguage,
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
      await restoreCurrentLocale(isCurrentOperation);
      return false;
    }
  }

  async function clearLanguagePreferences(): Promise<boolean> {
    const browserDefaultDisplayLanguage = detectBrowserDisplayLanguage();
    const browserDefaultSpokenLanguages = getDefaultSpokenLanguages();

    displayLanguageRevision += 1;
    spokenLanguageRevision += 1;
    const isCurrentOperation = captureLanguageOperation();

    browserDisplayLanguage.value = browserDefaultDisplayLanguage;
    storedDisplayLanguage.value = undefined;
    spokenLanguages.value = browserDefaultSpokenLanguages;
    try {
      await applyCurrentLocale(isCurrentOperation);
      return isCurrentOperation();
    } catch (err) {
      if (!isCurrentOperation()) {
        return false;
      }
      // Clearing account state succeeded. A missing language chunk must neither
      // restore the old account's preferences nor make logout fail.
      console.warn(
        "Preferences cleared using the English resource fallback:",
        err
      );
      return true;
    }
  }

  return {
    displayLanguage,
    isDisplayLanguageReady: computed(() => isDisplayLanguageReady.value),
    spokenLanguages: computed(() => spokenLanguages.value),
    availableLocales,
    loadLanguagePreferencesFromBackend,
    updateSpokenLanguages,
    changeDisplayLanguage,
    clearLanguagePreferences,
    setConversationLanguageFallback,
    startBackgroundLanguageRecovery,
    retryFailedDisplayLanguage,
  };
});
