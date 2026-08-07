import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ActionHandlersTranslations {
  conversationDeleted: string;
  conversationDeletedSuccessfully: string;
}

export const actionHandlersTranslations: Record<
  SupportedDisplayLanguageCodes,
  ActionHandlersTranslations
> = {
  en: {
    conversationDeleted: "Conversation deleted",
    conversationDeletedSuccessfully: "Conversation deleted successfully",
  },
  ar: {
    conversationDeleted: "تم حذف المحادثة",
    conversationDeletedSuccessfully: "تم حذف المحادثة بنجاح",
  },
  es: {
    conversationDeleted: "Conversación eliminada",
    conversationDeletedSuccessfully: "Conversación eliminada correctamente",
  },
  fa: {
    conversationDeleted: "گفتگو حذف شد",
    conversationDeletedSuccessfully: "گفتگو با موفقیت حذف شد",
  },
  fr: {
    conversationDeleted: "Conversation supprimée",
    conversationDeletedSuccessfully: "Conversation supprimée avec succès",
  },
  he: {
    conversationDeleted: "השיחה נמחקה",
    conversationDeletedSuccessfully: "השיחה נמחקה בהצלחה",
  },
  ja: {
    conversationDeleted: "会話を削除しました",
    conversationDeletedSuccessfully: "会話を正常に削除しました",
  },
  ky: {
    conversationDeleted: "Сүйлөшүү өчүрүлдү",
    conversationDeletedSuccessfully: "Талкуу ийгиликтүү өчүрүлдү",
  },
  ru: {
    conversationDeleted: "Обсуждение удалено",
    conversationDeletedSuccessfully: "Обсуждение успешно удалено",
  },
  "zh-Hans": {
    conversationDeleted: "对话已删除",
    conversationDeletedSuccessfully: "对话已成功删除",
  },
  "zh-Hant": {
    conversationDeleted: "對話已刪除",
    conversationDeletedSuccessfully: "對話已成功刪除",
  },
};
