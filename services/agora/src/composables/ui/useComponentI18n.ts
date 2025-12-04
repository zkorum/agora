import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

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
  translations: Record<SupportedDisplayLanguageCodes, T>
) {
  const { locale } = useI18n();

  const t = (
    key: keyof T,
    params?: Record<string, string | number>
  ): string => {
    const currentLocale = locale.value as SupportedDisplayLanguageCodes;
    const localeTranslations = translations[currentLocale];

    let translation: string;

    if (!localeTranslations) {
      // Fallback to English if current locale not found
      const fallbackTranslations = translations["en"];
      if (fallbackTranslations && key in fallbackTranslations) {
        translation = fallbackTranslations[key];
      } else {
        // Return key as string if no translation found
        translation = String(key);
      }
    } else {
      translation = localeTranslations[key] || String(key);
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
