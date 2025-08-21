// Central type definition for all translation files
// This ensures all language files maintain the same structure

export interface TranslationSchema {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: string;
  };

  // Index signature to satisfy vue-i18n's LocaleMessage requirements
  [key: string]: string | Record<string, unknown>;
}
