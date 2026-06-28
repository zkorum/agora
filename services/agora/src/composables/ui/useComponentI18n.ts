import {
  getDisplayLanguageFallbackChain,
  parseSupportedDisplayLanguageOrUndefined,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

type ComponentTranslations<T> =
  | Readonly<Partial<Record<SupportedDisplayLanguageCodes, T>> & { en: T }>
  | Readonly<Record<string, T>>;

/**
 * Typed composable for component-specific i18n with per-file translations
 * Provides TypeScript safety and autocompletion for translation keys
 *
 * @template T - Interface defining the component's translation keys
 * @param translations - Record of locale to translation mappings
 * @returns Typed i18n functions with autocompletion support
 *
 * @example
 * interface MyComponentTranslations {
 *   title: string;
 *   description: string;
 *   greeting: string; // "Hello {name}"
 * }
 *
 * const translations: Record<string, MyComponentTranslations> = {
 *   en: { title: "Title", description: "Description", greeting: "Hello {name}" },
 *   es: { title: "Título", description: "Descripción", greeting: "Hola {name}" }
 * };
 *
 * const { t, locale } = useComponentI18n<MyComponentTranslations>(translations);
 * const title = t("title"); // TypeScript autocompletion and type safety
 * const greeting = t("greeting", { name: "John" }); // With parameters
 */
export function useComponentI18n<T extends { [K in keyof T]: string }>(
  translations: ComponentTranslations<T>
) {
  const { locale } = useI18n();

  const t = (
    key: keyof T,
    params?: Record<string, string | number>
  ): string => {
    const currentLocale = parseSupportedDisplayLanguageOrUndefined(
      locale.value
    );
    const localeChain = currentLocale === undefined
      ? ["en" as const]
      : [...getDisplayLanguageFallbackChain({ languageCode: currentLocale }), "en" as const];
    let translation = String(key);

    for (const languageCode of localeChain) {
      const localeTranslations = translations[languageCode];
      const nextTranslation = localeTranslations?.[key];
      if (nextTranslation !== undefined) {
        translation = nextTranslation;
        break;
      }
    }

    // Replace placeholders with parameter values if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(
          new RegExp(`\\{${paramKey}\\}`, "g"),
          String(paramValue)
        );
      });
    }

    return translation;
  };

  return {
    t,
    locale: computed(() => locale.value),
  };
}
