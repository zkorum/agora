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
  fr: {
    buttonText: "Démarrer une conversation",
  },
  "zh-Hans": {
    buttonText: "开始对话",
  },
  "zh-Hant": {
    buttonText: "開始對話",
  },
  ja: {
    buttonText: "会話を開始",
  },
};
