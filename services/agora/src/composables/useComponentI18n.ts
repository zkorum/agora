import { computed } from "vue";
import { useI18n } from "vue-i18n";

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
 * }
 *
 * const translations: Record<string, MyComponentTranslations> = {
 *   en: { title: "Title", description: "Description" },
 *   es: { title: "Título", description: "Descripción" }
 * };
 *
 * const { t, locale } = useComponentI18n<MyComponentTranslations>(translations);
 * const title = t("title"); // TypeScript autocompletion and type safety
 */
export function useComponentI18n<T extends Record<string, string>>(
  translations: Record<string, T>
) {
  const { locale } = useI18n();

  const t = (key: keyof T): string => {
    const currentLocale = locale.value;
    const localeTranslations = translations[currentLocale];

    if (!localeTranslations) {
      // Fallback to English if current locale not found
      const fallbackTranslations = translations["en"];
      if (fallbackTranslations && key in fallbackTranslations) {
        return fallbackTranslations[key];
      }
      // Return key as string if no translation found
      return String(key);
    }

    return localeTranslations[key] || String(key);
  };

  return {
    t,
    locale: computed(() => locale.value),
  };
}
