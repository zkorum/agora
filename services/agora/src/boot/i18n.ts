import { defineBoot } from "#q-app/wrappers";
import { createI18n } from "vue-i18n";

import messages from "src/i18n";
import { parseDisplayLanguage } from "src/shared/languages";

export type MessageLanguages = keyof typeof messages;
// Type-define 'en-US' as the master schema for the resource
export type MessageSchema = (typeof messages)["en"];

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

  const i18n = createI18n<{ message: MessageSchema }, MessageLanguages>({
    locale: defaultLocale,
    fallbackLocale,
    legacy: false,
    messages,
  });

  // Set i18n instance on app
  app.use(i18n);
});
