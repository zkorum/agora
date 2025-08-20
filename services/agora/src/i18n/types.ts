// Central type definition for all translation files
// This ensures all language files maintain the same structure

export interface TranslationSchema {
  // Index signature to satisfy vue-i18n's LocaleMessage requirements
  [key: string]: string | Record<string, unknown>;
}
