import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostApiTranslations {
  conversationNotFound: string;
}

export const postApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostApiTranslations
> = {
  en: {
    conversationNotFound: "Conversation not found",
  },
  ar: {
    conversationNotFound: "المحادثة غير موجودة",
  },
  es: {
    conversationNotFound: "Conversación no encontrada",
  },
  fa: {
    conversationNotFound: "گفتگو یافت نشد",
  },
  he: {
    conversationNotFound: "השיחה לא נמצאה",
  },
  fr: {
    conversationNotFound: "Conversation introuvable",
  },
  "zh-Hans": {
    conversationNotFound: "未找到对话",
  },
  "zh-Hant": {
    conversationNotFound: "未找到對話",
  },
  ja: {
    conversationNotFound: "会話が見つかりません",
  },
  ky: {
    conversationNotFound: "Талкуу табылган жок",
  },
  ru: {
    conversationNotFound: "Обсуждение не найдено",
  },
};
