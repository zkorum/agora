import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface StartConversationButtonLongTranslations {
  buttonText: string;
}

export const startConversationButtonLongTranslations: Record<
  SupportedDisplayLanguageCodes,
  StartConversationButtonLongTranslations
> = {
  en: {
    buttonText: "Start a conversation",
  },
  ar: {
    buttonText: "بدء محادثة",
  },
  es: {
    buttonText: "Iniciar una conversación",
  },
  fa: {
    buttonText: "شروع یک گفتگو",
  },
  fr: {
    buttonText: "Démarrer une conversation",
  },
  "zh-Hans": {
    buttonText: "开始对话",
  },
  "zh-Hant": {
    buttonText: "開始對話",
  },
  he: {
    buttonText: "התחלת שיחה",
  },
  ja: {
    buttonText: "会話を開始",
  },
  ky: {
    buttonText: "Талкуу баштоо",
  },
  ru: {
    buttonText: "Начать обсуждение",
  },
};
