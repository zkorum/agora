// Import only English translations for initial load
import { Lang, type QuasarLanguage } from "quasar";
import enUS from "quasar/lang/en-US";
import en from "src/i18n/en";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import {
  getDisplayLanguageFallbackChain,
  getLanguageTextDirection,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { detectInitialDisplayLanguage } from "src/utils/language";
import { createI18n } from "vue-i18n";

import { defineBoot } from "#q-app/wrappers";

export type MessageLanguages = SupportedDisplayLanguageCodes;
// Type-define 'en' as the master schema for the resource
export type MessageSchema = typeof en;

const localeMessageImports = {
  en: () => Promise.resolve({ default: en }),
  ar: () => import("../i18n/ar/index"),
  es: () => import("../i18n/es/index"),
  fa: () => import("../i18n/fa/index"),
  fr: () => import("../i18n/fr/index"),
  he: () => import("../i18n/he/index"),
  ja: () => import("../i18n/ja/index"),
  ky: () => import("../i18n/ky/index"),
  ru: () => import("../i18n/ru/index"),
  "zh-Hans": () => import("../i18n/zh-Hans/index"),
  "zh-Hant": () => import("../i18n/zh-Hant/index"),
} satisfies Record<MessageLanguages, () => Promise<{ default: MessageSchema }>>;

const LOCALE_LOAD_TIMEOUT_MS = 500;

async function withinLocaleDeadline<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("Language resource loading timed out"));
        }, LOCALE_LOAD_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
declare module "vue-i18n" {
  export interface DefineLocaleMessage {
    common: MessageSchema["common"];
    [key: string]: MessageSchema[string];
  }
}

function createAppI18n() {
  const messages: Partial<Record<MessageLanguages, MessageSchema>> = { en };
  const fallbackLocale = Object.fromEntries(
    ZodSupportedDisplayLanguageCodes.options.map((languageCode) => [
      languageCode,
      getDisplayLanguageFallbackChain({ languageCode }).filter(
        (fallbackLanguageCode) => fallbackLanguageCode !== languageCode
      ),
    ])
  );
  return createI18n({
    locale: "en",
    fallbackLocale,
    legacy: false,
    messages,
  });
}

let i18nInstance: ReturnType<typeof createAppI18n> | undefined;
const preparedQuasarPacks = new Map<MessageLanguages, QuasarLanguage>([
  ["en", enUS],
]);
const localeLoads = new Map<MessageLanguages, Promise<void>>();
const failedLocales = new Set<MessageLanguages>();

export function hasFailedLocaleLoad(locale: MessageLanguages): boolean {
  return failedLocales.has(locale);
}

function getQuasarLangImport(
  locale: MessageLanguages
): Promise<{ default: QuasarLanguage }> {
  switch (locale) {
    case "ar":
      return import("quasar/lang/ar");
    case "fa":
      return import("quasar/lang/fa");
    case "he":
      return import("quasar/lang/he");
    case "en":
      return Promise.resolve({ default: enUS });
    case "es":
      return import("quasar/lang/es");
    case "fr":
      return import("quasar/lang/fr");
    case "ja":
      return import("quasar/lang/ja");
    // Quasar has no Kyrgyz pack; use Russian for its built-in controls only.
    case "ky":
    case "ru":
      return import("quasar/lang/ru");
    case "zh-Hans":
      return import("quasar/lang/zh-CN");
    case "zh-Hant":
      return import("quasar/lang/zh-TW");
  }
}

export function setI18nLanguage(locale: MessageLanguages): void {
  const pack = preparedQuasarPacks.get(locale);
  if (i18nInstance === undefined || pack === undefined) return;
  // Applying a prepared language is synchronous: messages, Quasar RTL state,
  // and document direction cannot diverge while another import is pending.
  i18nInstance.global.locale.value = locale;
  Lang.set(pack);
  document.documentElement.lang = locale;
  document.documentElement.dir = getLanguageTextDirection(locale);
}

export async function loadLocaleResources(
  locale: MessageLanguages
): Promise<void> {
  const instance = i18nInstance;
  if (instance === undefined || preparedQuasarPacks.has(locale)) return;
  const pending = localeLoads.get(locale);
  if (pending !== undefined) return await pending;

  const loading = (async () => {
    try {
      // Share one deadline and install neither resource after a timeout/failure.
      const [messages, pack] = await withinLocaleDeadline(
        Promise.all([
          localeMessageImports[locale](),
          getQuasarLangImport(locale),
        ])
      );
      instance.global.setLocaleMessage(locale, messages.default);
      preparedQuasarPacks.set(locale, pack.default);
      failedLocales.delete(locale);
    } catch (error) {
      failedLocales.add(locale);
      throw error;
    } finally {
      localeLoads.delete(locale);
    }
  })();
  localeLoads.set(locale, loading);
  await loading;
}

/**
 * Get the i18n instance (for use in stores and composables)
 */
export function getI18nInstance() {
  return i18nInstance;
}

export default defineBoot(async ({ app }) => {
  // Saved preferences win; browser-family detection supplies the initial default.
  const storedLocale = localStorage.getItem("displayLanguage");
  const defaultLocale = detectInitialDisplayLanguage({
    storedLanguage: storedLocale,
  });

  const i18n = createAppI18n();
  i18nInstance = i18n;

  // Load both resources concurrently: the initial language decision takes at
  // most one short deadline, not two sequential waits. RTL is ready before mount.
  try {
    await loadLocaleResources(defaultLocale);
    setI18nLanguage(defaultLocale);
  } catch (error) {
    console.error("[i18n] Failed to load initial locale, using English", error);
    setI18nLanguage("en");
  }

  // Set i18n instance on app
  app.use(i18n);
});
