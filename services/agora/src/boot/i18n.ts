// Import only English translations for initial load
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
 * Set the i18n language and update HTML lang attribute
 */
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
  document.querySelector("html")?.setAttribute("lang", locale);
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

  // Load locale messages with dynamic import for code splitting
  const messages = await import(
    /* webpackChunkName: "locale-[request]" */
    /* vite-chunk-name: "locale-[request]" */
    `../i18n/${locale}/index.ts`
  );

  // Set locale message
  i18nInstance.global.setLocaleMessage(locale, messages.default);

  return nextTick();
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

export default defineBoot(({ app }) => {
  // Get stored language preference or detect from browser
  const storedLocale = localStorage.getItem("displayLanguage");
  const defaultLocale =
    (storedLocale as MessageLanguages) || detectBrowserLanguage();

  const fallbackLocale = {
    "zh-Hant": ["zh-Hans", "en"],
    "zh-Hans": ["zh-Hant", "en"],
    default: ["en"],
  };

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

  // Load the initial locale if it's not English
  if (defaultLocale !== "en") {
    void loadLocaleMessages(defaultLocale).then(() => {
      setI18nLanguage(defaultLocale);
    });
  } else {
    setI18nLanguage(defaultLocale);
  }

  // Set i18n instance on app
  app.use(i18n);
});
