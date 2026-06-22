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
  ZodSupportedSpokenLanguageCodes,
} from "src/shared/languages";

type ListedSpokenLanguageCode = Extract<
  SupportedSpokenLanguageCodes,
  LanguageMetadata["code"]
>;

export interface SpokenLanguageMetadata
  extends Omit<LanguageMetadata, "code"> {
  code: ListedSpokenLanguageCode;
}

interface SearchableLanguageMetadata {
  code: string;
  name: string;
  englishName: string;
}

function isSpokenLanguageMetadata(
  lang: LanguageMetadata
): lang is SpokenLanguageMetadata {
  return ZodSupportedSpokenLanguageCodes.safeParse(lang.code).success;
}

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

export function getSpokenLanguages(): SpokenLanguageMetadata[] {
  return SupportedSpokenLanguageMetadataList.filter(isSpokenLanguageMetadata);
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
export function sortLanguagesByEnglishName<T extends SearchableLanguageMetadata>({
  langs,
}: {
  langs: T[];
}): T[] {
  return [...langs].sort((a, b) => a.englishName.localeCompare(b.englishName));
}

/**
 * Search languages by name (native or English)
 */
export function searchLanguages<T extends SearchableLanguageMetadata>({
  query,
  langs,
}: {
  query: string;
  langs: T[];
}): T[] {
  const lowerQuery = query.toLowerCase();
  return langs.filter(
    (lang) =>
      lang.name.toLowerCase().includes(lowerQuery) ||
      lang.englishName.toLowerCase().includes(lowerQuery) ||
      lang.code.toLowerCase().includes(lowerQuery)
  );
}
