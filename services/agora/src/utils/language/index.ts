import type {
  DisplayLanguageMetadata,
  LanguageMetadata,
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import {
  parseDisplayLanguage,
  parseSpokenLanguage,
  SupportedSpokenLanguageMetadataList,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";

/**
 * Map app display language codes to concrete BCP 47 locales for Intl formatters.
 */
export function toBcp47Locale(code: string): string {
  switch (code) {
    case "en":
      return "en-US";
    case "es":
      return "es-ES";
    case "fr":
      return "fr-FR";
    case "ja":
      return "ja-JP";
    case "ar":
      return "ar-SA";
    case "fa":
      return "fa-IR";
    case "he":
      return "he-IL";
    case "ky":
      return "ky-KG";
    case "ru":
      return "ru-RU";
    case "zh-Hans":
      return "zh-CN";
    case "zh-Hant":
      return "zh-TW";
    default:
      return code;
  }
}

export function getLanguageByCode(code: string): LanguageMetadata | undefined {
  return SupportedSpokenLanguageMetadataList.find((lang) => lang.code === code);
}

export function getDisplayLanguages(): DisplayLanguageMetadata[] {
  return SupportedSpokenLanguageMetadataList.filter(
    (lang): lang is DisplayLanguageMetadata =>
      lang.displaySupported &&
      ZodSupportedDisplayLanguageCodes.safeParse(lang.code).success
  );
}

export function getSpokenLanguages(): LanguageMetadata[] {
  return SupportedSpokenLanguageMetadataList; // All languages can be spoken languages
}

/**
 * Parse browser language to our supported format
 */
export function parseBrowserLanguage({
  browserLang,
}: {
  browserLang: string;
}): {
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: SupportedSpokenLanguageCodes[];
} {
  const displayLanguage = parseDisplayLanguage(browserLang);
  const spokenLanguage = parseSpokenLanguage(browserLang);

  return {
    displayLanguage,
    spokenLanguages: [spokenLanguage],
  };
}

/**
 * Sort languages alphabetically by their English name
 */
export function sortLanguagesByEnglishName({
  langs,
}: {
  langs: LanguageMetadata[];
}): LanguageMetadata[] {
  return [...langs].sort((a, b) => a.englishName.localeCompare(b.englishName));
}

/**
 * Search languages by name (native or English)
 */
export function searchLanguages({
  query,
  langs = SupportedSpokenLanguageMetadataList,
}: {
  query: string;
  langs?: LanguageMetadata[];
}): LanguageMetadata[] {
  const lowerQuery = query.toLowerCase();
  return langs.filter(
    (lang) =>
      lang.name.toLowerCase().includes(lowerQuery) ||
      lang.englishName.toLowerCase().includes(lowerQuery) ||
      lang.code.toLowerCase().includes(lowerQuery)
  );
}
