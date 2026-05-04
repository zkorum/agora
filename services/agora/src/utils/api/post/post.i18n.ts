import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostApiTranslations {
  conversationNotFound: string;
  invalidConversationData: string;
  failedToDeletePost: string;
}

export const postApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostApiTranslations
> = {
  en: {
    conversationNotFound: "Conversation not found",
    invalidConversationData: "Invalid conversation data received from server.",
    failedToDeletePost: "Failed to delete the post.",
  },
  ar: {
    conversationNotFound: "المحادثة غير موجودة",
    invalidConversationData: "تم استلام بيانات محادثة غير صالحة من الخادم.",
    failedToDeletePost: "فشل حذف المنشور.",
  },
  es: {
    conversationNotFound: "Conversación no encontrada",
    invalidConversationData: "Se recibieron datos de conversación inválidos del servidor.",
    failedToDeletePost: "No se pudo eliminar la publicación.",
  },
  fa: {
    conversationNotFound: "گفتگو یافت نشد",
    invalidConversationData: "داده‌های نامعتبر گفتگو از سرور دریافت شد.",
    failedToDeletePost: "حذف پست ناموفق بود.",
  },
  he: {
    conversationNotFound: "השיחה לא נמצאה",
    invalidConversationData: "התקבלו מהשרת נתוני שיחה לא תקינים.",
    failedToDeletePost: "מחיקת הפוסט נכשלה.",
  },
  fr: {
    conversationNotFound: "Conversation introuvable",
    invalidConversationData: "Données de conversation invalides reçues du serveur.",
    failedToDeletePost: "Échec de la suppression de la publication.",
  },
  "zh-Hans": {
    conversationNotFound: "未找到对话",
    invalidConversationData: "从服务器收到无效的对话数据。",
    failedToDeletePost: "删除帖子失败。",
  },
  "zh-Hant": {
    conversationNotFound: "未找到對話",
    invalidConversationData: "從伺服器收到無效的對話資料。",
    failedToDeletePost: "刪除貼文失敗。",
  },
  ja: {
    conversationNotFound: "会話が見つかりません",
    invalidConversationData: "サーバーから無効な会話データを受信しました。",
    failedToDeletePost: "投稿の削除に失敗しました。",
  },
  ky: {
    conversationNotFound: "Талкуу табылган жок",
    invalidConversationData: "Серверден жараксыз сүйлөшүү маалыматы алынды.",
    failedToDeletePost: "Постту өчүрүү ишке ашкан жок.",
  },
  ru: {
    conversationNotFound: "Обсуждение не найдено",
    invalidConversationData: "С сервера получены неверные данные обсуждения.",
    failedToDeletePost: "Не удалось удалить публикацию.",
  },
};
