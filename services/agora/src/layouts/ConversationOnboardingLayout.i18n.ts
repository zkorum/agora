import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationOnboardingLayoutTranslations {
  dialogLabel: string;
}

export const conversationOnboardingLayoutTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationOnboardingLayoutTranslations
> = {
  en: { dialogLabel: "Conversation setup" },
  de: { dialogLabel: "Diskussion einrichten" },
  hi: { dialogLabel: "चर्चा सेटअप" },
  fr: { dialogLabel: "Préparation à la conversation" },
  es: { dialogLabel: "Preparación para la conversación" },
  ar: { dialogLabel: "الإعداد للمحادثة" },
  fa: { dialogLabel: "آماده‌سازی برای گفتگو" },
  he: { dialogLabel: "הכנה לשיחה" },
  ja: { dialogLabel: "会話への参加準備" },
  ky: { dialogLabel: "Талкууга даярдык" },
  ru: { dialogLabel: "Подготовка к обсуждению" },
  "zh-Hans": { dialogLabel: "对话参与准备" },
  "zh-Hant": { dialogLabel: "對話參與準備" },
};
