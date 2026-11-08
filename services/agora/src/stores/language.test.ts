import {
  createPinia,
  disposePinia,
  getActivePinia,
  setActivePinia,
} from "pinia";
import type {
  hasFailedLocaleLoad,
  loadLocaleResources,
  setI18nLanguage,
} from "src/boot/i18n";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

const mocks = vi.hoisted(() => ({
  hasFailedLocaleLoad: vi.fn<typeof hasFailedLocaleLoad>(() => false),
  getLanguagePreferences: vi.fn(),
  loadLocaleResources: vi.fn<typeof loadLocaleResources>(() =>
    Promise.resolve()
  ),
  setI18nLanguage: vi.fn<typeof setI18nLanguage>(),
  updateLanguagePreferences: vi.fn(),
}));

vi.mock("src/boot/i18n", () => ({
  hasFailedLocaleLoad: mocks.hasFailedLocaleLoad,
  loadLocaleResources: mocks.loadLocaleResources,
  setI18nLanguage: mocks.setI18nLanguage,
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/utils/api/language", () => ({
  useBackendLanguageApi: () => ({
    getLanguagePreferences: mocks.getLanguagePreferences,
    updateLanguagePreferences: mocks.updateLanguagePreferences,
  }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: vi.fn() }),
}));
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    availableLocales: ["en", "fr"],
    locale: i18nLocale,
  }),
}));
const i18nLocale = ref("en");

import { api } from "src/utils/api/client";

import { useAuthenticationStore } from "./authentication";
import { useLanguageStore } from "./language";

function createDeferred<Result>(): {
  promise: Promise<Result>;
  resolve: (result: Result) => void;
} {
  let resolvePromise: ((result: Result) => void) | undefined;
  const promise = new Promise<Result>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (result) => resolvePromise?.(result),
  };
}

const credentials = { email: null, phone: null, rarimo: null };

describe("language store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    i18nLocale.value = "en";
    mocks.setI18nLanguage.mockImplementation((language) => {
      i18nLocale.value = language;
    });
    mocks.loadLocaleResources.mockResolvedValue();
    mocks.hasFailedLocaleLoad.mockReturnValue(false);
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  });

  afterEach(() => {
    const pinia = getActivePinia();
    if (pinia !== undefined) {
      disposePinia(pinia);
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses the browser language without saving an automatic display preference", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es"]);
    const languageStore = useLanguageStore();

    await nextTick();

    expect(languageStore.displayLanguage).toBe("es");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
  });

  it("recovers an initial failed preference once after mount without hiding or reloading the page", async () => {
    vi.useFakeTimers();
    localStorage.setItem("displayLanguage", "fr");
    mocks.hasFailedLocaleLoad.mockImplementation(
      (language) => language === "fr"
    );
    const pending = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(pending.promise);
    const store = useLanguageStore();
    expect(store.displayLanguage).toBe("fr");
    expect(i18nLocale.value).toBe("en");
    expect(api.defaults.headers.common["Accept-Language"]).toBe("fr");
    store.startBackgroundLanguageRecovery();
    await vi.advanceTimersByTimeAsync(999);
    expect(mocks.loadLocaleResources).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.loadLocaleResources).toHaveBeenCalledExactlyOnceWith("fr");
    expect(store.isDisplayLanguageReady).toBe(true);
    expect(i18nLocale.value).toBe("en");
    pending.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.displayLanguage).toBe("fr");
    expect(i18nLocale.value).toBe("fr");
    expect(api.defaults.headers.common["Accept-Language"]).toBe("fr");
    expect(store.isDisplayLanguageReady).toBe(true);
    expect(mocks.updateLanguagePreferences).not.toHaveBeenCalled();
    expect(localStorage.getItem("displayLanguage")).toBe("fr");
    store.startBackgroundLanguageRecovery();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.loadLocaleResources).toHaveBeenCalledOnce();
  });

  it("does not let background recovery override a newer explicit preference", async () => {
    localStorage.setItem("displayLanguage", "fr");
    mocks.hasFailedLocaleLoad.mockImplementation(
      (language) => language === "fr"
    );
    const pending = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(pending.promise);
    const store = useLanguageStore();
    const recovery = store.retryFailedDisplayLanguage();
    await store.changeDisplayLanguage({ newLanguage: "es" });
    pending.resolve();
    await expect(recovery).resolves.toBe(false);
    expect(store.displayLanguage).toBe("es");
    expect(mocks.setI18nLanguage).toHaveBeenCalledExactlyOnceWith("es");
  });

  it("does not retry repeatedly if background recovery also fails", async () => {
    localStorage.setItem("displayLanguage", "fr");
    mocks.hasFailedLocaleLoad.mockImplementation(
      (language) => language === "fr"
    );
    mocks.loadLocaleResources.mockRejectedValueOnce(
      new Error("Still unavailable")
    );
    const store = useLanguageStore();
    await expect(store.retryFailedDisplayLanguage()).resolves.toBe(false);
    await expect(store.retryFailedDisplayLanguage()).resolves.toBe(false);
    expect(mocks.loadLocaleResources).toHaveBeenCalledOnce();
    expect(store.displayLanguage).toBe("fr");
    expect(i18nLocale.value).toBe("en");
    expect(store.isDisplayLanguageReady).toBe(true);
    expect(localStorage.getItem("displayLanguage")).toBe("fr");
  });

  it("does not schedule background work when there was no resource failure", async () => {
    vi.useFakeTimers();
    const store = useLanguageStore();
    const existingTimerCount = vi.getTimerCount();
    store.startBackgroundLanguageRecovery();
    expect(vi.getTimerCount()).toBe(existingTimerCount);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.loadLocaleResources).not.toHaveBeenCalled();
  });

  it("recovers the backend-owned conversation language without changing or persisting it on failure", async () => {
    mockUnsupportedBrowserLanguages();
    mocks.hasFailedLocaleLoad.mockImplementation(
      (language) => language === "fr"
    );
    const store = useLanguageStore();
    mocks.loadLocaleResources.mockRejectedValueOnce(new Error("Import failed"));
    await expect(store.setConversationLanguageFallback("fr")).resolves.toBe(
      false
    );
    expect(store.displayLanguage).toBe("fr");
    expect(i18nLocale.value).toBe("en");
    await expect(store.retryFailedDisplayLanguage()).resolves.toBe(true);
    expect(store.displayLanguage).toBe("fr");
    expect(i18nLocale.value).toBe("fr");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
    expect(mocks.updateLanguagePreferences).not.toHaveBeenCalled();
  });

  it("does not apply a recovered conversation language after navigating to another language", async () => {
    mockUnsupportedBrowserLanguages();
    mocks.hasFailedLocaleLoad.mockImplementation(
      (language) => language === "fr"
    );
    const store = useLanguageStore();
    mocks.loadLocaleResources.mockRejectedValueOnce(new Error("Import failed"));
    await store.setConversationLanguageFallback("fr");
    const pending = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(pending.promise);
    const recovery = store.retryFailedDisplayLanguage();
    await store.setConversationLanguageFallback("es");
    pending.resolve();
    await expect(recovery).resolves.toBe(false);
    expect(store.displayLanguage).toBe("es");
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("es");
  });

  it("keeps parsed backend preferences available for recovery without issuing a second account request", async () => {
    mocks.hasFailedLocaleLoad.mockImplementation(
      (language) => language === "fr"
    );
    mocks.getLanguagePreferences.mockResolvedValueOnce({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });
    mocks.loadLocaleResources.mockRejectedValueOnce(new Error("Import failed"));
    const store = useLanguageStore();
    await expect(store.loadLanguagePreferencesFromBackend()).resolves.toEqual({
      displayLanguage: "fr",
      spokenLanguages: ["fr"],
    });
    expect(store.displayLanguage).toBe("fr");
    expect(i18nLocale.value).toBe("en");
    expect(api.defaults.headers.common["Accept-Language"]).toBe("fr");
    await expect(store.retryFailedDisplayLanguage()).resolves.toBe(true);
    expect(store.displayLanguage).toBe("fr");
    expect(store.spokenLanguages).toEqual(["fr"]);
    expect(localStorage.getItem("displayLanguage")).toBe("fr");
    expect(mocks.getLanguagePreferences).toHaveBeenCalledOnce();
    expect(mocks.updateLanguagePreferences).not.toHaveBeenCalled();
  });

  it("discards background recovery after account changes and cancels scheduled work on disposal", async () => {
    vi.useFakeTimers();
    localStorage.setItem("displayLanguage", "fr");
    mocks.hasFailedLocaleLoad.mockImplementation(
      (language) => language === "fr"
    );
    const pending = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(pending.promise);
    const store = useLanguageStore();
    const recovery = store.retryFailedDisplayLanguage();
    useAuthenticationStore().setLoginStatus({
      isKnown: true,
      userId: "user-b",
    });
    pending.resolve();
    await expect(recovery).resolves.toBe(false);
    expect(mocks.setI18nLanguage).not.toHaveBeenCalled();
    store.startBackgroundLanguageRecovery();
    const pinia = getActivePinia();
    if (pinia !== undefined) {
      disposePinia(pinia);
    }
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.loadLocaleResources).toHaveBeenCalledOnce();
  });

  function mockUnsupportedBrowserLanguages(): void {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "de-DE",
    });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
  }

  it("uses conversation language only as an unsaved last fallback and updates request defaults", async () => {
    mockUnsupportedBrowserLanguages();
    const store = useLanguageStore();
    expect(store.displayLanguage).toBe("en");
    await expect(store.setConversationLanguageFallback("fr")).resolves.toBe(
      true
    );
    expect(store.displayLanguage).toBe("fr");
    expect(api.defaults.headers.common["Accept-Language"]).toBe("fr");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
    expect(mocks.updateLanguagePreferences).not.toHaveBeenCalled();

    await store.setConversationLanguageFallback(undefined);
    expect(store.displayLanguage).toBe("en");
    expect(api.defaults.headers.common["Accept-Language"]).toBe("en");
  });

  it("keeps saved preferences and supported English ahead of conversation language", async () => {
    const store = useLanguageStore();
    await store.setConversationLanguageFallback("fr");
    expect(store.displayLanguage).toBe("en");
    await store.changeDisplayLanguage({ newLanguage: "es" });
    await store.setConversationLanguageFallback("fr");
    expect(store.displayLanguage).toBe("es");
  });

  it("does not cancel a pending fallback when the same metadata arrives again", async () => {
    mockUnsupportedBrowserLanguages();
    const deferred = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(deferred.promise);
    const store = useLanguageStore();
    const first = store.setConversationLanguageFallback("es");
    expect(store.isDisplayLanguageReady).toBe(false);
    await store.setConversationLanguageFallback("es");
    expect(store.isDisplayLanguageReady).toBe(false);
    deferred.resolve();
    await expect(first).resolves.toBe(true);
    expect(store.isDisplayLanguageReady).toBe(true);
    expect(mocks.setI18nLanguage).toHaveBeenCalledExactlyOnceWith("es");
  });

  it("ignores a pending fallback after navigation or a manual choice", async () => {
    mockUnsupportedBrowserLanguages();
    const deferred = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(deferred.promise);
    const store = useLanguageStore();
    const first = store.setConversationLanguageFallback("fr");
    await store.setConversationLanguageFallback("es");
    deferred.resolve();
    await expect(first).resolves.toBe(false);
    expect(mocks.setI18nLanguage).toHaveBeenCalledExactlyOnceWith("es");
  });

  it("renders English after a resource failure without changing the French request preference", async () => {
    mockUnsupportedBrowserLanguages();
    const store = useLanguageStore();
    await store.setConversationLanguageFallback("es");
    mocks.loadLocaleResources.mockRejectedValueOnce(
      new Error("Locale load failed")
    );
    await expect(store.setConversationLanguageFallback("fr")).resolves.toBe(
      false
    );
    expect(store.displayLanguage).toBe("fr");
    expect(i18nLocale.value).toBe("en");
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("en");
    expect(api.defaults.headers.common["Accept-Language"]).toBe("fr");
  });

  it("keeps backend-saved language authoritative across automatic fallback changes", async () => {
    mockUnsupportedBrowserLanguages();
    const deferred = createDeferred<{
      status: "success";
      data: { displayLanguage: "es"; spokenLanguages: ["es"] };
    }>();
    mocks.getLanguagePreferences.mockReturnValueOnce(deferred.promise);
    const store = useLanguageStore();
    const pending = store.loadLanguagePreferencesFromBackend();
    await store.setConversationLanguageFallback("fr");
    deferred.resolve({
      status: "success",
      data: { displayLanguage: "es", spokenLanguages: ["es"] },
    });
    await pending;
    expect(store.displayLanguage).toBe("es");
    expect(localStorage.getItem("displayLanguage")).toBe("es");
    expect(api.defaults.headers.common["Accept-Language"]).toBe("es");
  });

  it("does not persist an automatic display fallback when only spoken languages change", async () => {
    mockUnsupportedBrowserLanguages();
    mocks.updateLanguagePreferences.mockResolvedValueOnce({
      status: "success",
      data: undefined,
    });
    const auth = useAuthenticationStore();
    auth.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const store = useLanguageStore();
    await store.setConversationLanguageFallback("fr");
    await store.updateSpokenLanguages({ newLanguages: ["fr"] });
    expect(mocks.updateLanguagePreferences).toHaveBeenCalledExactlyOnceWith({
      spokenLanguages: ["fr"],
    });
  });

  it("does not overwrite spoken languages when only the display preference changes", async () => {
    mocks.updateLanguagePreferences.mockResolvedValueOnce({
      status: "success",
      data: undefined,
    });
    const auth = useAuthenticationStore();
    auth.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const store = useLanguageStore();
    await store.changeDisplayLanguage({ newLanguage: "fr" });
    expect(mocks.updateLanguagePreferences).toHaveBeenCalledExactlyOnceWith({
      displayLanguage: "fr",
    });
  });

  it.each([
    { storedLanguage: "fr", expectedLanguage: "fr" },
    { storedLanguage: "es-MX", expectedLanguage: "es" },
    { storedLanguage: "zh-HK", expectedLanguage: "zh-Hant" },
  ])(
    "preserves and normalizes saved $storedLanguage over browser detection",
    ({ storedLanguage, expectedLanguage }) => {
      localStorage.setItem("displayLanguage", storedLanguage);
      const languageStore = useLanguageStore();

      expect(languageStore.displayLanguage).toBe(expectedLanguage);
    }
  );

  it("ignores an unsupported saved language", () => {
    localStorage.setItem("displayLanguage", "invalid");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es"]);
    const languageStore = useLanguageStore();

    expect(languageStore.displayLanguage).toBe("es");
  });

  it("persists a user-selected language", async () => {
    const languageStore = useLanguageStore();

    await expect(
      languageStore.changeDisplayLanguage({ newLanguage: "fr" })
    ).resolves.toBe(true);
    await nextTick();

    expect(languageStore.displayLanguage).toBe("fr");
    expect(localStorage.getItem("displayLanguage")).toBe("fr");
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("fr");
  });

  it("does not save the detected default when a language change fails", async () => {
    mocks.loadLocaleResources.mockRejectedValueOnce(
      new Error("Locale load failed")
    );
    const languageStore = useLanguageStore();

    await expect(
      languageStore.changeDisplayLanguage({ newLanguage: "fr" })
    ).resolves.toBe(false);
    await nextTick();

    expect(languageStore.displayLanguage).toBe("en");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("en");
  });

  it("persists account preferences for the next app boot", async () => {
    mocks.getLanguagePreferences.mockResolvedValueOnce({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });
    const languageStore = useLanguageStore();

    await languageStore.loadLanguagePreferencesFromBackend();
    await nextTick();

    expect(languageStore.displayLanguage).toBe("fr");
    expect(localStorage.getItem("displayLanguage")).toBe("fr");
  });

  it("removes a saved override when clearing preferences and rechecks the browser", async () => {
    localStorage.setItem("displayLanguage", "fr");
    const languageStore = useLanguageStore();
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es"]);

    await expect(languageStore.clearLanguagePreferences()).resolves.toBe(true);
    await nextTick();

    expect(languageStore.displayLanguage).toBe("es");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("es");
  });

  it("clears the saved account override even when browser-language resources fail", async () => {
    localStorage.setItem("displayLanguage", "fr");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es"]);
    mocks.loadLocaleResources.mockRejectedValueOnce(
      new Error("Locale load failed")
    );
    const languageStore = useLanguageStore();

    await expect(languageStore.clearLanguagePreferences()).resolves.toBe(true);
    await nextTick();

    expect(languageStore.displayLanguage).toBe("es");
    expect(i18nLocale.value).toBe("en");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("en");
  });

  it("does not let an old account response override an explicit choice of the detected language", async () => {
    const languageResponse = createDeferred<{
      status: "success";
      data: { displayLanguage: "fr"; spokenLanguages: ["fr"] };
    }>();
    mocks.getLanguagePreferences.mockReturnValueOnce(languageResponse.promise);
    const languageStore = useLanguageStore();
    const loadPromise = languageStore.loadLanguagePreferencesFromBackend();

    await languageStore.changeDisplayLanguage({ newLanguage: "en" });
    languageResponse.resolve({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });

    await expect(loadPromise).resolves.toBeUndefined();
    expect(languageStore.displayLanguage).toBe("en");
    expect(localStorage.getItem("displayLanguage")).toBe("en");
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("en");
  });

  it("invalidates pending account preferences when clearing to the same language", async () => {
    const languageResponse = createDeferred<{
      status: "success";
      data: { displayLanguage: "fr"; spokenLanguages: ["fr"] };
    }>();
    localStorage.setItem("displayLanguage", "en");
    mocks.getLanguagePreferences.mockReturnValueOnce(languageResponse.promise);
    const languageStore = useLanguageStore();
    const loadPromise = languageStore.loadLanguagePreferencesFromBackend();

    await languageStore.clearLanguagePreferences();
    languageResponse.resolve({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });

    await expect(loadPromise).resolves.toBeUndefined();
    expect(languageStore.displayLanguage).toBe("en");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
  });

  it("does not apply an older language selection after a newer one finishes", async () => {
    const localeMessages = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(localeMessages.promise);
    const languageStore = useLanguageStore();
    const firstChange = languageStore.changeDisplayLanguage({
      newLanguage: "fr",
    });

    await expect(
      languageStore.changeDisplayLanguage({ newLanguage: "es" })
    ).resolves.toBe(true);
    localeMessages.resolve();

    await expect(firstChange).resolves.toBe(false);
    expect(languageStore.displayLanguage).toBe("es");
    expect(localStorage.getItem("displayLanguage")).toBe("es");
    expect(mocks.setI18nLanguage).toHaveBeenCalledExactlyOnceWith("es");
  });

  it("does not apply a pending selection or save it to a different account", async () => {
    const localeMessages = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(localeMessages.promise);
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({ isKnown: true, userId: "user-a" });
    const languageStore = useLanguageStore();
    const changePromise = languageStore.changeDisplayLanguage({
      newLanguage: "fr",
    });

    authStore.setLoginStatus({ isKnown: true, userId: "user-b" });
    localeMessages.resolve();

    await expect(changePromise).resolves.toBe(false);
    expect(mocks.setI18nLanguage).not.toHaveBeenCalled();
    expect(mocks.updateLanguagePreferences).not.toHaveBeenCalled();
  });

  it("discards an old account language-preferences response", async () => {
    const languageResponse = createDeferred<{
      status: "success";
      data: { displayLanguage: "fr"; spokenLanguages: ["fr"] };
    }>();
    mocks.getLanguagePreferences.mockReturnValueOnce(languageResponse.promise);
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const languageStore = useLanguageStore();
    const originalDisplayLanguage = languageStore.displayLanguage;
    const originalSpokenLanguages = languageStore.spokenLanguages;
    const loadPromise = languageStore.loadLanguagePreferencesFromBackend();

    authStore.setLoginStatus({ isKnown: true, userId: "user-b" });
    languageResponse.resolve({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });

    await expect(loadPromise).resolves.toBeUndefined();
    expect(languageStore.displayLanguage).toBe(originalDisplayLanguage);
    expect(languageStore.spokenLanguages).toEqual(originalSpokenLanguages);
    expect(mocks.setI18nLanguage).not.toHaveBeenCalled();
  });

  it("discards preferences when the account changes while loading locale messages", async () => {
    const localeMessages = createDeferred<void>();
    mocks.getLanguagePreferences.mockResolvedValueOnce({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });
    mocks.loadLocaleResources.mockReturnValueOnce(localeMessages.promise);
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const languageStore = useLanguageStore();
    const originalDisplayLanguage = languageStore.displayLanguage;
    const originalSpokenLanguages = languageStore.spokenLanguages;
    const loadPromise = languageStore.loadLanguagePreferencesFromBackend();
    await vi.waitFor(() => {
      expect(mocks.loadLocaleResources).toHaveBeenCalledWith("fr");
    });

    authStore.setLoginStatus({ isKnown: true, userId: "user-b" });
    localeMessages.resolve();

    await expect(loadPromise).resolves.toBeUndefined();
    expect(languageStore.displayLanguage).toBe(originalDisplayLanguage);
    expect(languageStore.spokenLanguages).toEqual(originalSpokenLanguages);
    expect(mocks.setI18nLanguage).not.toHaveBeenCalled();
  });

  it("clears local preferences without updating the logged-out account", async () => {
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const languageStore = useLanguageStore();

    await expect(languageStore.clearLanguagePreferences()).resolves.toBe(true);

    expect(mocks.updateLanguagePreferences).not.toHaveBeenCalled();
  });

  it("returns false with an English rendering fallback when both selection and rollback resources fail", async () => {
    localStorage.setItem("displayLanguage", "es");
    const store = useLanguageStore();
    mocks.loadLocaleResources.mockRejectedValueOnce(
      new Error("French unavailable")
    );
    mocks.loadLocaleResources.mockRejectedValueOnce(
      new Error("Spanish unavailable")
    );
    await expect(
      store.changeDisplayLanguage({ newLanguage: "fr" })
    ).resolves.toBe(false);
    expect(store.displayLanguage).toBe("es");
    expect(i18nLocale.value).toBe("en");
    expect(store.isDisplayLanguageReady).toBe(true);
    expect(localStorage.getItem("displayLanguage")).toBe("es");
  });

  it("discards work after switching away from and back to the same account", async () => {
    const response = createDeferred<{
      status: "success";
      data: { displayLanguage: "fr"; spokenLanguages: ["fr"] };
    }>();
    mocks.getLanguagePreferences.mockReturnValueOnce(response.promise);
    const auth = useAuthenticationStore();
    auth.setLoginStatus({ isKnown: true, userId: "user-a" });
    const store = useLanguageStore();
    const pending = store.loadLanguagePreferencesFromBackend();
    auth.setLoginStatus({ isKnown: true, userId: "user-b" });
    auth.setLoginStatus({ isKnown: true, userId: "user-a" });
    response.resolve({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });
    await expect(pending).resolves.toBeUndefined();
    expect(store.displayLanguage).toBe("en");
    expect(mocks.setI18nLanguage).not.toHaveBeenCalled();
  });

  it("does not apply an obsolete conversation load after navigating away and back to its language", async () => {
    mockUnsupportedBrowserLanguages();
    const resources = createDeferred<void>();
    mocks.loadLocaleResources.mockReturnValueOnce(resources.promise);
    const store = useLanguageStore();
    const old = store.setConversationLanguageFallback("fr");
    await store.setConversationLanguageFallback("es");
    await store.setConversationLanguageFallback("fr");
    resources.resolve();
    await expect(old).resolves.toBe(false);
    expect(mocks.setI18nLanguage.mock.calls).toEqual([["es"], ["fr"]]);
  });

  it("ignores an older concurrent account preference request", async () => {
    const response = createDeferred<{
      status: "success";
      data: { displayLanguage: "fr"; spokenLanguages: ["fr"] };
    }>();
    mocks.getLanguagePreferences.mockReturnValueOnce(response.promise);
    mocks.getLanguagePreferences.mockResolvedValueOnce({
      status: "success",
      data: { displayLanguage: "es", spokenLanguages: ["es"] },
    });
    const store = useLanguageStore();
    const old = store.loadLanguagePreferencesFromBackend();
    await store.loadLanguagePreferencesFromBackend();
    response.resolve({
      status: "success",
      data: { displayLanguage: "fr", spokenLanguages: ["fr"] },
    });
    await expect(old).resolves.toBeUndefined();
    expect(store.displayLanguage).toBe("es");
  });

  it("does not restore old spoken languages after a failed save completes for another account", async () => {
    const response = createDeferred<{
      status: "error";
      code: string;
      message: string;
    }>();
    mocks.updateLanguagePreferences.mockReturnValueOnce(response.promise);
    const auth = useAuthenticationStore();
    auth.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const store = useLanguageStore();
    const old = store.updateSpokenLanguages({ newLanguages: ["fr"] });
    auth.setLoginStatus({ isKnown: true, userId: "user-b" });
    await store.clearLanguagePreferences();
    response.resolve({ status: "error", code: "test", message: "Unavailable" });
    await expect(old).resolves.toBe(false);
    expect(store.spokenLanguages).toEqual(["en"]);
  });
});
