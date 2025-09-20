import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationTitleWithPrivacyLabelTranslations {
  privateLabel: string;
}

export const conversationTitleWithPrivacyLabelTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationTitleWithPrivacyLabelTranslations
> = {
  en: {
    privateLabel: "Private",
  },
  ar: {
    privateLabel: "خاص",
  },
  es: {
    privateLabel: "Privado",
  },
  fr: {
    privateLabel: "Privé",
  },
  "zh-Hans": {
    privateLabel: "私密",
  },
  "zh-Hant": {
    privateLabel: "私密",
  },
  ja: {
    privateLabel: "プライベート",
  },
};
