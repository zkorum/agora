import {
  type DisplayLanguageMetadata,
  type LanguageMetadata,
  type SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageMetadataList,
} from "src/shared/languages";
import type { ConversationMultilingualSetting } from "src/shared/types/zod";

interface GetDisplayLanguageNameParams {
  languageCode: SupportedDisplayLanguageCodes;
}

interface FormatCompactLanguageSummaryParams {
  primaryLanguage: string;
  multilingualSetting: ConversationMultilingualSetting;
  canUseDynamicTranslation: boolean;
  languageTranslateSuffix: string;
}

interface FormatLanguageControlLabelParams extends FormatCompactLanguageSummaryParams {
  languagesLabel: string;
}

function isDisplayLanguageMetadata(
  language: LanguageMetadata
): language is DisplayLanguageMetadata {
  return language.displaySupported;
}

export function getDisplayLanguageName({
  languageCode,
}: GetDisplayLanguageNameParams): string {
  return (
    SupportedSpokenLanguageMetadataList.filter(isDisplayLanguageMetadata).find(
      (language) => language.code === languageCode
    )?.englishName ?? languageCode
  );
}

export function formatCompactLanguageSummary({
  primaryLanguage,
  multilingualSetting,
  canUseDynamicTranslation,
  languageTranslateSuffix,
}: FormatCompactLanguageSummaryParams): string {
  const additionalLanguageCount = multilingualSetting.additionalLanguageCodes.length;
  const additionalLanguageSuffix =
    additionalLanguageCount === 0 ? "" : ` +${additionalLanguageCount.toString()}`;
  const translateSuffix =
    canUseDynamicTranslation && multilingualSetting.dynamicTranslationEnabled
      ? languageTranslateSuffix
      : "";

  return `${primaryLanguage}${additionalLanguageSuffix}${translateSuffix}`;
}

export function formatLanguageControlLabel({
  languagesLabel,
  primaryLanguage,
  multilingualSetting,
  canUseDynamicTranslation,
  languageTranslateSuffix,
}: FormatLanguageControlLabelParams): string {
  return languagesLabel
    .replace(
      "{primaryLanguage}",
      formatCompactLanguageSummary({
        primaryLanguage,
        multilingualSetting,
        canUseDynamicTranslation,
        languageTranslateSuffix,
      })
    )
    .replace("{additionalLanguageSuffix}", "")
    .replace("{translateSuffix}", "");
}
