import {
  type DisplayLanguageMetadata,
  type LanguageMetadata,
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
  SupportedSpokenLanguageMetadataList,
} from "src/shared/languages";
import { toBcp47Locale } from "src/utils/language";

export interface LanguageOption {
  label: string;
  caption: string;
  searchText: string;
  value: SupportedDisplayLanguageCodes;
}

export function isDisplayLanguageMetadata(
  language: LanguageMetadata
): language is DisplayLanguageMetadata {
  return language.displaySupported;
}

export function getLocalizedLanguageName({
  languageCode,
  locale,
}: {
  languageCode: string;
  locale: string;
}): string | undefined {
  const trimmedLanguageCode = languageCode.trim().replaceAll("_", "-");
  if (trimmedLanguageCode.length === 0) {
    return undefined;
  }

  try {
    const canonicalLanguageCode =
      Intl.getCanonicalLocales(trimmedLanguageCode).at(0);
    if (canonicalLanguageCode === undefined) {
      return undefined;
    }
    return new Intl.DisplayNames([toBcp47Locale(locale)], {
      type: "language",
      fallback: "none",
    }).of(canonicalLanguageCode);
  } catch {
    return undefined;
  }
}

export function getLanguageLabel({
  languageCode,
  locale,
}: {
  languageCode:
    | SupportedDisplayLanguageCodes
    | SupportedSpokenLanguageCodes
    | null
    | undefined;
  locale: string;
}): string {
  if (languageCode === null || languageCode === undefined) {
    return "";
  }
  return (
    getLocalizedLanguageName({ languageCode, locale }) ??
    SupportedSpokenLanguageMetadataList.find(
      (language) => language.code === languageCode
    )?.englishName ??
    languageCode
  );
}

export function getLanguageOptions({
  locale,
}: {
  locale: string;
}): LanguageOption[] {
  return SupportedSpokenLanguageMetadataList.filter(isDisplayLanguageMetadata).map(
    (language) => {
      const label =
        getLocalizedLanguageName({ languageCode: language.code, locale }) ??
        language.englishName;
      return {
        label,
        caption: language.name,
        searchText: `${label} ${language.englishName} ${language.name}`,
        value: language.code,
      };
    }
  );
}
