import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationTitleTranslations {
  privateLabel: string;
  prioritizationLabel: string;
}

export const conversationTitleTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationTitleTranslations
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
  fa: {
    privateLabel: "خصوصی",
    prioritizationLabel: "اولویت‌بندی",
  },
  he: {
    privateLabel: "פרטי",
    prioritizationLabel: "תעדוף",
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
