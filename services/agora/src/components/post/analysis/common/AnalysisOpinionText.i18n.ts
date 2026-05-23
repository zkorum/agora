import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisOpinionTextTranslations {
  hiddenModeratedStatement: string;
}

export const analysisOpinionTextTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisOpinionTextTranslations
> = {
  en: {
    hiddenModeratedStatement: "[moderated]",
  },
  ar: {
    hiddenModeratedStatement: "[خاضعة للإشراف]",
  },
  es: {
    hiddenModeratedStatement: "[moderada]",
  },
  fa: {
    hiddenModeratedStatement: "[مدیریت‌شده]",
  },
  fr: {
    hiddenModeratedStatement: "[modérée]",
  },
  "zh-Hans": {
    hiddenModeratedStatement: "[已审核]",
  },
  "zh-Hant": {
    hiddenModeratedStatement: "[已審核]",
  },
  he: {
    hiddenModeratedStatement: "[עבר מודרציה]",
  },
  ja: {
    hiddenModeratedStatement: "[モデレート済み]",
  },
  ky: {
    hiddenModeratedStatement: "[модерацияланган]",
  },
  ru: {
    hiddenModeratedStatement: "[модерировано]",
  },
};
