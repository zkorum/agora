import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ActionHandlersTranslations {
  conversationDeleted: string;
}

export const actionHandlersTranslations: Record<
  SupportedDisplayLanguageCodes,
  ActionHandlersTranslations
> = {
  en: { conversationDeleted: "Conversation deleted" },
  es: { conversationDeleted: "Conversación eliminada" },
  fr: { conversationDeleted: "Conversation supprimée" },
  "zh-Hant": { conversationDeleted: "對話已刪除" },
  "zh-Hans": { conversationDeleted: "对话已删除" },
  ja: { conversationDeleted: "会話を削除しました" },
  ar: { conversationDeleted: "تم حذف المحادثة" },
  fa: { conversationDeleted: "گفتگو حذف شد" },
  he: { conversationDeleted: "השיחה נמחקה" },
  ky: { conversationDeleted: "Сүйлөшүү өчүрүлдү" },
  ru: { conversationDeleted: "Обсуждение удалено" },
};
