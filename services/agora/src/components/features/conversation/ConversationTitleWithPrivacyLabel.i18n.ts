export interface ConversationTitleWithPrivacyLabelTranslations {
  privateLabel: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const conversationTitleWithPrivacyLabelTranslations: Record<
  string,
  ConversationTitleWithPrivacyLabelTranslations
> = {
  en: {
    privateLabel: "Private",
  },
  es: {
    privateLabel: "Privado",
  },
  fr: {
    privateLabel: "Privé",
  },
};
