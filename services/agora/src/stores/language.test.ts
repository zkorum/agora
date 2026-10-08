import {
  createPinia,
  disposePinia,
  getActivePinia,
  setActivePinia,
} from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

const mocks = vi.hoisted(() => ({
  getLanguagePreferences: vi.fn(),
  loadLocaleMessages: vi.fn(() => Promise.resolve()),
  setI18nLanguage: vi.fn(),
  updateLanguagePreferences: vi.fn(),
}));

vi.mock("src/boot/i18n", () => ({
  loadLocaleMessages: mocks.loadLocaleMessages,
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
    locale: ref("en"),
  }),
}));

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
    mocks.loadLocaleMessages.mockResolvedValue();
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  });

  afterEach(() => {
    const pinia = getActivePinia();
    if (pinia !== undefined) {
      disposePinia(pinia);
    }
    vi.restoreAllMocks();
  });

  it("uses the browser language without saving an automatic display preference", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es"]);
    const languageStore = useLanguageStore();

    await nextTick();

    expect(languageStore.displayLanguage).toBe("es");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
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
    mocks.loadLocaleMessages.mockRejectedValueOnce(
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

  it("restores the saved override if clearing preferences fails", async () => {
    localStorage.setItem("displayLanguage", "fr");
    mocks.loadLocaleMessages.mockRejectedValueOnce(
      new Error("Locale load failed")
    );
    const languageStore = useLanguageStore();

    await expect(languageStore.clearLanguagePreferences()).resolves.toBe(false);
    await nextTick();

    expect(languageStore.displayLanguage).toBe("fr");
    expect(localStorage.getItem("displayLanguage")).toBe("fr");
    expect(mocks.setI18nLanguage).toHaveBeenLastCalledWith("fr");
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

    await expect(loadPromise).resolves.toBeNull();
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

    await expect(loadPromise).resolves.toBeNull();
    expect(languageStore.displayLanguage).toBe("en");
    expect(localStorage.getItem("displayLanguage")).toBeNull();
  });

  it("does not apply an older language selection after a newer one finishes", async () => {
    const localeMessages = createDeferred<void>();
    mocks.loadLocaleMessages.mockReturnValueOnce(localeMessages.promise);
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
    mocks.loadLocaleMessages.mockReturnValueOnce(localeMessages.promise);
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

    await expect(loadPromise).resolves.toBeNull();
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
    mocks.loadLocaleMessages.mockReturnValueOnce(localeMessages.promise);
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
      expect(mocks.loadLocaleMessages).toHaveBeenCalledWith("fr");
    });

    authStore.setLoginStatus({ isKnown: true, userId: "user-b" });
    localeMessages.resolve();

    await expect(loadPromise).resolves.toBeNull();
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
});
