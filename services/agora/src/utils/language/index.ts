import {
  type DisplayLanguageMetadata,
  type LanguageMetadata,
  parseDisplayLanguage,
  parseSpokenLanguage,
  parseSupportedDisplayLanguageOrUndefined,
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
  SupportedSpokenLanguageMetadataList,
  ZodSupportedDisplayLanguageCodes,
  ZodSupportedSpokenLanguageCodes,
} from "src/shared/languages";

export interface SpokenLanguageMetadata extends Omit<LanguageMetadata, "code"> {
  code: SupportedSpokenLanguageCodes;
}

interface SearchableLanguageMetadata {
  code: string;
  name: string;
  englishName: string;
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

export function getLanguageByCode(
  code: string
): SearchableLanguageMetadata | undefined {
  const spokenLanguageCode = ZodSupportedSpokenLanguageCodes.safeParse(code);
  if (!spokenLanguageCode.success) {
    return SupportedSpokenLanguageMetadataList.find(
      (lang) => lang.code === code
    );
  }

  return getSpokenLanguageByCode(spokenLanguageCode.data);
}

export function getDisplayLanguages(): DisplayLanguageMetadata[] {
  return SupportedSpokenLanguageMetadataList.filter(
    (lang): lang is DisplayLanguageMetadata =>
      lang.displaySupported &&
      ZodSupportedDisplayLanguageCodes.safeParse(lang.code).success
  );
}

export function getSpokenLanguages(): SpokenLanguageMetadata[] {
  return ZodSupportedSpokenLanguageCodes.options.map(getSpokenLanguageByCode);
}

function getIntlLanguageName({
  languageCode,
  locale,
}: {
  languageCode: string;
  locale: string;
}): string | undefined {
  try {
    const canonicalLanguageCode = Intl.getCanonicalLocales(languageCode).at(0);
    if (canonicalLanguageCode === undefined) {
      return undefined;
    }

    return new Intl.DisplayNames([locale], { type: "language" }).of(
      canonicalLanguageCode
    );
  } catch {
    return undefined;
  }
}

function getSpokenLanguageByCode(
  code: SupportedSpokenLanguageCodes
): SpokenLanguageMetadata {
  const existingMetadata = SupportedSpokenLanguageMetadataList.find(
    (lang) => lang.code === code
  );
  if (existingMetadata !== undefined) {
    return { ...existingMetadata, code };
  }

  const englishName =
    getIntlLanguageName({ languageCode: code, locale: "en" }) ?? code;
  const nativeName =
    getIntlLanguageName({ languageCode: code, locale: code }) ?? englishName;

  return {
    code,
    name: nativeName,
    englishName,
    displaySupported: false,
  };
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

function firstSupportedDisplayLanguage(
  candidates: readonly (string | null | undefined)[]
): SupportedDisplayLanguageCodes | undefined {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) {
      continue;
    }

    const displayLanguage = parseSupportedDisplayLanguageOrUndefined(candidate);
    if (displayLanguage !== undefined) {
      return displayLanguage;
    }
  }

  return undefined;
}

export function resolveDisplayLanguage({
  storedLanguage,
  browserLanguage,
  conversationLanguage,
}: {
  storedLanguage: SupportedDisplayLanguageCodes | undefined;
  browserLanguage: SupportedDisplayLanguageCodes | undefined;
  conversationLanguage: SupportedDisplayLanguageCodes | undefined;
}): SupportedDisplayLanguageCodes {
  return storedLanguage ?? browserLanguage ?? conversationLanguage ?? "en";
}

function detectPreferredBrowserDisplayLanguage():
  | SupportedDisplayLanguageCodes
  | undefined {
  return firstSupportedDisplayLanguage([
    ...navigator.languages,
    navigator.language,
  ]);
}

function detectFormattingDisplayLanguage():
  | SupportedDisplayLanguageCodes
  | undefined {
  try {
    return parseSupportedDisplayLanguageOrUndefined(
      new Intl.DateTimeFormat().resolvedOptions().locale
    );
  } catch {
    // A failed browser signal must not prevent trying the remaining defaults.
    return undefined;
  }
}

export function detectBrowserDisplayLanguage():
  | SupportedDisplayLanguageCodes
  | undefined {
  // Product policy: only Android prefers Intl; desktop and iOS/iPadOS
  // prefer website languages, regardless of browser brand.
  return /\bAndroid\b/i.test(navigator.userAgent)
    ? (detectFormattingDisplayLanguage() ??
        detectPreferredBrowserDisplayLanguage())
    : (detectPreferredBrowserDisplayLanguage() ??
        detectFormattingDisplayLanguage());
}

export function detectInitialDisplayLanguage({
  storedLanguage,
}: {
  storedLanguage: string | null | undefined;
}): SupportedDisplayLanguageCodes {
  return (
    firstSupportedDisplayLanguage([storedLanguage]) ??
    detectBrowserDisplayLanguage() ??
    "en"
  );
}

/**
 * Sort languages alphabetically by their English name
 */
export function sortLanguagesByEnglishName<
  T extends SearchableLanguageMetadata,
>({ langs }: { langs: T[] }): T[] {
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
