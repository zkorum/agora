import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationTitleWithPrivacyLabelTranslations {
  privateLabel: string;
  prioritizationLabel: string;
}

export const conversationTitleWithPrivacyLabelTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationTitleWithPrivacyLabelTranslations
> = {
  en: {
    privateLabel: "Private",
    prioritizationLabel: "Prioritization",
  },
  ar: {
    privateLabel: "خاص",
    prioritizationLabel: "ترتيب الأولويات",
  },
  es: {
    privateLabel: "Privado",
    prioritizationLabel: "Priorización",
  },
  fr: {
    privateLabel: "Privé",
    prioritizationLabel: "Hiérarchisation",
  },
  "zh-Hans": {
    privateLabel: "私密",
    prioritizationLabel: "优先排序",
  },
  "zh-Hant": {
    privateLabel: "私密",
    prioritizationLabel: "優先排序",
  },
  ja: {
    privateLabel: "プライベート",
    prioritizationLabel: "優先順位付け",
  },
  ky: {
    privateLabel: "Жеке",
    prioritizationLabel: "Артыкчылыктуу кылуу",
  },
  ru: {
    privateLabel: "Приватное",
    prioritizationLabel: "Приоритизация",
  },
};
