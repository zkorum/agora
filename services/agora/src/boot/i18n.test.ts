import { createPinia } from "pinia";
import type { QuasarLanguage } from "quasar";
import enUS from "quasar/lang/en-US";
import type { TranslationSchema } from "src/i18n/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, unref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import type { MessageLanguages } from "./i18n";

const mocks = vi.hoisted(() => ({
  importFrench: vi.fn<() => Promise<{ default: TranslationSchema }>>(),
  importSpanish: vi.fn<() => Promise<{ default: TranslationSchema }>>(),
  importJapanese: vi.fn<() => Promise<{ default: TranslationSchema }>>(),
  importArabic: vi.fn<() => Promise<{ default: TranslationSchema }>>(),
  importArabicPack: vi.fn<() => Promise<{ default: QuasarLanguage }>>(),
}));

beforeEach(() => {
  vi.resetModules();
  mocks.importFrench.mockReset();
  mocks.importSpanish.mockReset();
  mocks.importJapanese.mockReset();
  mocks.importArabic.mockReset();
  mocks.importArabicPack.mockReset();
  vi.doUnmock("quasar/lang/fr");
  vi.doMock("src/i18n/fr/index.ts", () => mocks.importFrench());
  vi.doMock("src/i18n/es/index.ts", () => mocks.importSpanish());
  vi.doMock("src/i18n/ja/index.ts", () => mocks.importJapanese());
  vi.doMock("src/i18n/ar/index.ts", () => mocks.importArabic());
  vi.doMock("quasar/lang/ar", () => mocks.importArabicPack());
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

async function bootI18n() {
  const module = await import("./i18n");
  await module.default({
    app: createApp({}),
    router: createRouter({ history: createMemoryHistory(), routes: [] }),
    store: createPinia(),
    urlPath: "/",
    publicPath: "/",
    redirect: vi.fn(),
  });
  return module;
}

describe("locale loading and selection", () => {
  const messages = {
    common: { loading: "Loading" },
    importConversation: { legalNotice: "Terms" },
  } satisfies TranslationSchema;

  const quasarLocales = [
    { locale: "en", pack: "en-US", direction: "ltr" },
    { locale: "ar", pack: "ar", direction: "rtl" },
    { locale: "es", pack: "es", direction: "ltr" },
    { locale: "fa", pack: "fa", direction: "rtl" },
    { locale: "fr", pack: "fr", direction: "ltr" },
    { locale: "he", pack: "he", direction: "rtl" },
    { locale: "ja", pack: "ja", direction: "ltr" },
    { locale: "ky", pack: "ru", direction: "ltr" },
    { locale: "ru", pack: "ru", direction: "ltr" },
    { locale: "zh-Hans", pack: "zh-CN", direction: "ltr" },
    { locale: "zh-Hant", pack: "zh-TW", direction: "ltr" },
  ] satisfies Array<{
    locale: MessageLanguages;
    pack: string;
    direction: "ltr" | "rtl";
  }>;

  it.each(quasarLocales)(
    "uses the $pack Quasar pack for $locale without changing the app language",
    async ({ locale, pack, direction }) => {
      localStorage.setItem("displayLanguage", locale);
      mocks.importFrench.mockResolvedValue({ default: messages });
      mocks.importSpanish.mockResolvedValue({ default: messages });
      mocks.importJapanese.mockResolvedValue({ default: messages });
      mocks.importArabic.mockResolvedValue({ default: messages });
      mocks.importArabicPack.mockResolvedValue({
        default: { ...enUS, isoName: "ar", rtl: true },
      });

      const { Lang } = await import("quasar");
      const setPack = vi.spyOn(Lang, "set");
      const module = await bootI18n();
      const appliedPack = setPack.mock.calls.at(-1)?.[0];
      expect(appliedPack?.isoName).toBe(pack);
      expect(Boolean(appliedPack?.rtl)).toBe(direction === "rtl");
      expect(module.getI18nInstance()?.global.locale.value).toBe(locale);
      expect(document.documentElement.lang).toBe(locale);
      expect(document.documentElement.dir).toBe(direction);
      expect(localStorage.getItem("displayLanguage")).toBe(locale);
      if (locale === "fr") expect(appliedPack?.label.cancel).toBe("Annuler");
      if (locale === "ky") expect(appliedPack?.label.cancel).toBe("Отмена");
    }
  );

  it("falls back on an LTR Quasar pack failure and recovers without changing the saved preference", async () => {
    localStorage.setItem("displayLanguage", "fr");
    mocks.importFrench.mockResolvedValue({ default: messages });
    vi.doMock("quasar/lang/fr", () => {
      throw new Error("French pack unavailable");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { Lang } = await import("quasar");
    const setPack = vi.spyOn(Lang, "set");
    const module = await bootI18n();
    expect(module.hasFailedLocaleLoad("fr")).toBe(true);
    expect(module.getI18nInstance()?.global.locale.value).toBe("en");
    expect(setPack.mock.calls.at(-1)?.[0]?.isoName).toBe("en-US");
    expect(localStorage.getItem("displayLanguage")).toBe("fr");

    vi.doUnmock("quasar/lang/fr");
    await module.loadLocaleResources("fr");
    expect(module.hasFailedLocaleLoad("fr")).toBe(false);
    expect(setPack.mock.calls.at(-1)?.[0]?.isoName).toBe("en-US");
    module.setI18nLanguage("fr");
    expect(setPack.mock.calls.at(-1)?.[0]?.isoName).toBe("fr");
    expect(setPack.mock.calls.at(-1)?.[0]?.label.cancel).toBe("Annuler");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("falls back immediately on the first initial import error", async () => {
    await import("./i18n");
    vi.useFakeTimers();
    localStorage.setItem("displayLanguage", "fr");
    mocks.importFrench.mockRejectedValue(new Error("Unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const module = await bootI18n();
    expect(module.getI18nInstance()?.global.locale.value).toBe("en");
    expect(module.hasFailedLocaleLoad("fr")).toBe(true);
    expect(mocks.importFrench).toHaveBeenCalledOnce();
    expect(localStorage.getItem("displayLanguage")).toBe("fr");
    vi.restoreAllMocks();
  });

  it("finishes initial boot in 500ms when the chosen resource hangs", async () => {
    await import("./i18n");
    vi.useFakeTimers();
    localStorage.setItem("displayLanguage", "fr");
    mocks.importFrench.mockReturnValue(new Promise(() => undefined));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let finished = false;
    const boot = (async () => {
      const module = await bootI18n();
      finished = true;
      return module;
    })();
    await vi.advanceTimersByTimeAsync(499);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const module = await boot;
    expect(module.getI18nInstance()?.global.locale.value).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(module.hasFailedLocaleLoad("fr")).toBe(true);
    vi.restoreAllMocks();
  });

  it("deduplicates concurrent resource loads and never selects a warmed language", async () => {
    localStorage.setItem("displayLanguage", "en");
    const module = await bootI18n();
    mocks.importFrench.mockResolvedValue({ default: messages });
    await Promise.all([
      module.loadLocaleResources("fr"),
      module.loadLocaleResources("fr"),
    ]);
    await module.loadLocaleResources("fr");
    expect(mocks.importFrench).toHaveBeenCalledOnce();
    expect(module.getI18nInstance()?.global.locale.value).toBe("en");
  });

  it("treats a Quasar pack failure as a locale failure and recovers RTL atomically", async () => {
    localStorage.setItem("displayLanguage", "ar");
    mocks.importArabic.mockResolvedValue({ default: messages });
    mocks.importArabicPack.mockRejectedValueOnce(new Error("Pack unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const module = await bootI18n();
    expect(module.hasFailedLocaleLoad("ar")).toBe(true);
    expect(module.getI18nInstance()?.global.availableLocales).not.toContain(
      "ar"
    );
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    mocks.importArabicPack.mockResolvedValue({
      default: { ...enUS, isoName: "ar", rtl: true },
    });
    vi.doMock("quasar/lang/ar", () => mocks.importArabicPack());
    await module.loadLocaleResources("ar");
    expect(module.hasFailedLocaleLoad("ar")).toBe(false);
    expect(document.documentElement.dir).toBe("ltr");
    module.setI18nLanguage("ar");
    expect(module.getI18nInstance()?.global.locale.value).toBe("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    module.setI18nLanguage("en");
    vi.restoreAllMocks();
  });

  it("does not finish boot before the initial language has loaded", async () => {
    let finishImport:
      | ((messages: { default: TranslationSchema }) => void)
      | undefined;
    const pendingImport = new Promise<{ default: TranslationSchema }>(
      (resolve) => {
        finishImport = resolve;
      }
    );
    mocks.importFrench.mockReturnValue(pendingImport);
    localStorage.setItem("displayLanguage", "fr");
    let bootFinished = false;
    const pendingBoot = (async () => {
      const module = await bootI18n();
      bootFinished = true;
      return module;
    })();
    await vi.waitFor(() => expect(mocks.importFrench).toHaveBeenCalled());
    expect(bootFinished).toBe(false);
    finishImport?.({
      default: {
        common: { loading: "Chargement…" },
        importConversation: { legalNotice: "Conditions" },
      },
    });
    const module = await pendingBoot;
    expect(unref(module.getI18nInstance()?.global.locale)).toBe("fr");
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("fr"));
  });

  it("reports an import failure without retries or changing the current language", async () => {
    localStorage.setItem("displayLanguage", "en");
    const module = await bootI18n();
    mocks.importFrench.mockResolvedValue({
      default: {
        common: { loading: "Chargement…" },
        importConversation: { legalNotice: "Conditions" },
      },
    });
    await module.loadLocaleResources("fr");
    module.setI18nLanguage("fr");
    mocks.importSpanish.mockRejectedValue(new Error("Import unavailable"));
    await expect(module.loadLocaleResources("es")).rejects.toThrow();
    expect(mocks.importSpanish).toHaveBeenCalledOnce();
    expect(unref(module.getI18nInstance()?.global.locale)).toBe("fr");
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("fr"));
  });

  it("times out after 500ms and ignores a late import without retrying", async () => {
    localStorage.setItem("displayLanguage", "en");
    const module = await bootI18n();
    let finishImport:
      | ((messages: { default: TranslationSchema }) => void)
      | undefined;
    const pendingImport = new Promise<{ default: TranslationSchema }>(
      (resolve) => {
        finishImport = resolve;
      }
    );
    mocks.importJapanese.mockReturnValue(pendingImport);
    vi.useFakeTimers();
    const failure = expect(module.loadLocaleResources("ja")).rejects.toThrow(
      "timed out"
    );
    await vi.advanceTimersByTimeAsync(499);
    expect(module.getI18nInstance()?.global.availableLocales).not.toContain(
      "ja"
    );
    await vi.advanceTimersByTimeAsync(1);
    await failure;
    finishImport?.({
      default: {
        common: { loading: "読み込み中" },
        importConversation: { legalNotice: "条件" },
      },
    });
    await vi.runAllTimersAsync();
    expect(mocks.importJapanese).toHaveBeenCalledOnce();
    expect(module.getI18nInstance()?.global.availableLocales).not.toContain(
      "ja"
    );
    expect(unref(module.getI18nInstance()?.global.locale)).toBe("en");
    expect(module.hasFailedLocaleLoad("ja")).toBe(true);
    vi.useRealTimers();
    await module.loadLocaleResources("ja");
    expect(module.getI18nInstance()?.global.availableLocales).toContain("ja");
    expect(module.hasFailedLocaleLoad("ja")).toBe(false);
    // Recovery prepares resources but does not authorize selecting the language.
    expect(unref(module.getI18nInstance()?.global.locale)).toBe("en");
  });
});
