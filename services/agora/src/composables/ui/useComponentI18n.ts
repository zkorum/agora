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
  const localeChain = computed(() =>
    getDisplayLanguageFallbackChain({
      languageCode:
        parseSupportedDisplayLanguageOrUndefined(locale.value) ?? "en",
    })
  );

  const t = (
    key: keyof T,
    params?: Record<string, string | number>
  ): string => {
    let translation = String(key);

    for (const languageCode of localeChain.value) {
      const localeTranslations = translations[languageCode];
      const nextTranslation = localeTranslations?.[key];
      if (nextTranslation !== undefined) {
        translation = nextTranslation;
        break;
      }
    }

    // Inserted user text is literal, even if it contains another placeholder.
    return params === undefined
      ? translation
      : translation.replace(/\{(\w+)\}/g, (token: string, name: string) =>
          Object.hasOwn(params, name) ? String(params[name]) : token
        );
  };

  return {
    t,
    locale: computed(() => locale.value),
  };
}
