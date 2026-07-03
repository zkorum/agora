import type { ConversationMultilingualSetting } from "src/shared/types/zod";

interface FormatCompactLanguageSummaryParams {
  primaryLanguage: string;
  multilingualSetting: ConversationMultilingualSetting;
  canUseDynamicTranslation: boolean;
  languageTranslateSuffix: string;
}

interface FormatLanguageControlLabelParams extends FormatCompactLanguageSummaryParams {
  languagesLabel: string;
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
