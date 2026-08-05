import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostApiTranslations {
  conversationNotFound: string;
  failedToDeletePost: string;
}

export const postApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostApiTranslations
> = {
  en: {
    conversationNotFound: "Conversation not found",
    failedToDeletePost: "Failed to delete the post.",
  },
  ar: {
    conversationNotFound: "المحادثة غير موجودة",
    failedToDeletePost: "فشل حذف المنشور.",
  },
  es: {
    conversationNotFound: "Conversación no encontrada",
    failedToDeletePost: "No se pudo eliminar la publicación.",
  },
  fa: {
    conversationNotFound: "گفتگو یافت نشد",
    failedToDeletePost: "حذف پست ناموفق بود.",
  },
  he: {
    conversationNotFound: "השיחה לא נמצאה",
    failedToDeletePost: "מחיקת הפוסט נכשלה.",
  },
  fr: {
    conversationNotFound: "Conversation introuvable",
    failedToDeletePost: "Échec de la suppression de la publication.",
  },
  "zh-Hans": {
    conversationNotFound: "未找到对话",
    failedToDeletePost: "删除帖子失败。",
  },
  "zh-Hant": {
    conversationNotFound: "未找到對話",
    failedToDeletePost: "刪除貼文失敗。",
  },
  ja: {
    conversationNotFound: "会話が見つかりません",
    failedToDeletePost: "投稿の削除に失敗しました。",
  },
  ky: {
    conversationNotFound: "Талкуу табылган жок",
    failedToDeletePost: "Постту өчүрүү ишке ашкан жок.",
  },
  ru: {
    conversationNotFound: "Обсуждение не найдено",
    failedToDeletePost: "Не удалось удалить публикацию.",
  },
};
