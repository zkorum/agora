import type {
  LanguageMetadata,
  DisplayLanguageMetadata,
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import {
  SupportedSpokenLanguageMetadataList,
  ZodSupportedDisplayLanguageCodes,
  ZodNormalizeDisplayLanguageCode,
  ZodNormalizeSpokenLanguageCode,
  ZodParseBrowserLanguage,
} from "src/shared/languages";

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
 * Normalize language code to match our supported languages
 * e.g., 'en-US' -> 'en' (for display languages)
 */
export function normalizeLanguageCode({
  code,
  forDisplay,
}: {
  code: string;
  forDisplay: true;
}): SupportedDisplayLanguageCodes;
export function normalizeLanguageCode({
  code,
  forDisplay,
}: {
  code: string;
  forDisplay?: false;
}): SupportedSpokenLanguageCodes;
export function normalizeLanguageCode({
  code,
  forDisplay = false,
}: {
  code: string;
  forDisplay?: boolean;
}): SupportedDisplayLanguageCodes | SupportedSpokenLanguageCodes {
  if (forDisplay) {
    return ZodNormalizeDisplayLanguageCode.parse(code);
  }
  return ZodNormalizeSpokenLanguageCode.parse(code);
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
  return ZodParseBrowserLanguage.parse(browserLang);
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
