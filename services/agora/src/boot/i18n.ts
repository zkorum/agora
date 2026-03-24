// Import only English translations for initial load
import { Lang, type QuasarLanguage } from "quasar";
import en from "src/i18n/en";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { parseDisplayLanguage } from "src/shared/languages";
import { nextTick } from "vue";
import type { I18n } from "vue-i18n";
import { createI18n } from "vue-i18n";

import { defineBoot } from "#q-app/wrappers";

export type MessageLanguages = SupportedDisplayLanguageCodes;
// Type-define 'en' as the master schema for the resource
export type MessageSchema = typeof en;

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module "vue-i18n" {
  // define the locale messages schema
  export interface DefineLocaleMessage extends MessageSchema {}

  // define the datetime format schema
  export interface DefineDateTimeFormat {}

  // define the number format schema
  export interface DefineNumberFormat {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

// Detect browser language
function detectBrowserLanguage(): MessageLanguages {
  const browserLang = navigator.language;
  const displayLanguage = parseDisplayLanguage(browserLang);
  return displayLanguage;
}

// Global i18n instance reference
let i18nInstance: I18n<
  { message: MessageSchema },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  MessageLanguages,
  false
> | null = null;

/**
 * Set the i18n language and update HTML lang attribute.
 * Also loads the corresponding Quasar language pack so that $q.lang.rtl
 * is set correctly — Quasar's layout components (QDrawer, QLayout, etc.)
 * rely on this flag for RTL positioning.
 */
const RTL_LANGUAGES: readonly string[] = ["ar", "fa", "he"];

function getQuasarLangImport(locale: string): Promise<{ default: QuasarLanguage }> {
  switch (locale) {
    case "ar": return import("quasar/lang/ar");
    case "fa": return import("quasar/lang/fa");
    case "he": return import("quasar/lang/he");
    default:   return import("quasar/lang/en-US");
  }
}

async function loadQuasarLangPack(locale: MessageLanguages): Promise<void> {
  try {
    const langPack = await getQuasarLangImport(locale);
    Lang.set(langPack.default);
  } catch (error) {
    console.error(`[i18n] Failed to load Quasar lang pack for "${locale}"`, error);
  }
}

export function setI18nLanguage(locale: MessageLanguages): void {
  if (!i18nInstance) return;

  // @ts-expect-error: locale type issue with lazy loading
  i18nInstance.global.locale.value = locale;

  /**
   * NOTE:
   * If you need to specify the language setting for headers, such as the `fetch` API, set it here.
   * The following is an example for axios.
   *
   * axios.defaults.headers.common['Accept-Language'] = locale
   */
  const htmlEl = document.querySelector("html");
  if (htmlEl) {
    htmlEl.setAttribute("lang", locale);
    htmlEl.setAttribute("dir", RTL_LANGUAGES.includes(locale) ? "rtl" : "ltr");
  }

  void loadQuasarLangPack(locale);
}

/**
 * Load locale messages dynamically using dynamic imports
 */
export async function loadLocaleMessages(
  locale: MessageLanguages
): Promise<void> {
  if (!i18nInstance) return;

  // Check if already loaded
  // @ts-expect-error: availableLocales type issue with lazy loading
  if (i18nInstance.global.availableLocales.includes(locale)) {
    return;
  }

  // Retry up to 3 times with delay — dynamic imports can fail after deployments
  // when old chunk filenames no longer exist on the server
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const messages = await import(
        /* webpackChunkName: "locale-[request]" */
        /* vite-chunk-name: "locale-[request]" */
        `../i18n/${locale}/index.ts`
      );

      i18nInstance.global.setLocaleMessage(locale, messages.default);
      return nextTick();
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  console.error(
    `[i18n] Failed to load locale "${locale}" after 3 attempts, falling back to English`,
    lastError
  );
  setI18nLanguage("en");
}

/**
 * Get the i18n instance (for use in stores and composables)
 */
export function getI18nInstance(): I18n<
  { message: MessageSchema },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  MessageLanguages,
  false
> | null {
  return i18nInstance;
}

export default defineBoot(async ({ app }) => {
  // Get stored language preference or detect from browser
  const storedLocale = localStorage.getItem("displayLanguage");
  const defaultLocale =
    (storedLocale as MessageLanguages) || detectBrowserLanguage();

  const fallbackLocale = {
    "zh-Hant": ["zh-Hans", "en"],
    "zh-Hans": ["zh-Hant", "en"],
    fa: ["ar", "en"],
    he: ["en"],
    ky: ["ru", "en"],
    ru: ["en"],
    default: ["en"],
  };

  // Await Quasar lang pack so $q.lang.rtl is set before first render.
  // This prevents QPageContainer/QDrawer from applying padding on the wrong side.
  await loadQuasarLangPack(defaultLocale);

  // Create i18n instance with only English loaded initially
  const i18n = createI18n<{ message: MessageSchema }, MessageLanguages>({
    locale: defaultLocale,
    fallbackLocale,
    legacy: false,
    // @ts-expect-error: Only English loaded initially, others loaded lazily
    messages: {
      en, // Only English is loaded initially
    },
  });

  // Store reference for helper functions
  // @ts-expect-error: Type inference issue with lazy loading
  i18nInstance = i18n;

  // Load the initial locale if it's not English.
  // Fire-and-forget: the app renders immediately with English fallback strings,
  // then updates when the locale messages finish loading.
  if (defaultLocale !== "en") {
    void (async () => {
      try {
        await loadLocaleMessages(defaultLocale);
        setI18nLanguage(defaultLocale);
      } catch (error) {
        console.error("[i18n] Failed to load initial locale, using English", error);
        setI18nLanguage("en");
      }
    })();
  } else {
    setI18nLanguage(defaultLocale);
  }

  // Set i18n instance on app
  app.use(i18n);
});
