import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

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

describe("language store account switching", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mocks.loadLocaleMessages.mockResolvedValue();
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
