import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseCommentQueriesTranslations {
  commentDeletedSuccessfully: string;
  failedToDeleteComment: string;
  failedToCreateComment: string;
  failedToCreateCommentWithReason: string;
}

export const useCommentQueriesTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseCommentQueriesTranslations
> = {
  en: {
    commentDeletedSuccessfully: "Statement deleted successfully",
    failedToDeleteComment: "Failed to delete statement. Please try again.",
    failedToCreateComment: "Failed to create comment. Please try again.",
    failedToCreateCommentWithReason: "Failed to create comment: {reason}",
  },
  es: {
    commentDeletedSuccessfully: "Proposición eliminada exitosamente",
    failedToDeleteComment:
      "Error al eliminar la proposición. Inténtalo de nuevo.",
    failedToCreateComment: "No se pudo crear el comentario. Inténtelo de nuevo.",
    failedToCreateCommentWithReason: "No se pudo crear el comentario: {reason}",
  },
  fa: {
    commentDeletedSuccessfully: "گزاره با موفقیت حذف شد",
    failedToDeleteComment: "حذف گزاره ناموفق بود. لطفاً دوباره تلاش کنید.",
    failedToCreateComment: "ایجاد نظر ناموفق بود. لطفاً دوباره تلاش کنید.",
    failedToCreateCommentWithReason: "ایجاد نظر ناموفق بود: {reason}",
  },
  he: {
    commentDeletedSuccessfully: "ההצהרה נמחקה בהצלחה",
    failedToDeleteComment: "מחיקת ההצהרה נכשלה. אנא נסו שוב.",
    failedToCreateComment: "יצירת התגובה נכשלה. נסו שוב.",
    failedToCreateCommentWithReason: "יצירת התגובה נכשלה: {reason}",
  },
  fr: {
    commentDeletedSuccessfully: "Proposition supprimée avec succès",
    failedToDeleteComment:
      "Échec de la suppression de la proposition. Veuillez réessayer.",
    failedToCreateComment: "Échec de la création du commentaire. Veuillez réessayer.",
    failedToCreateCommentWithReason: "Échec de la création du commentaire : {reason}",
  },
  "zh-Hant": {
    commentDeletedSuccessfully: "觀點已成功刪除",
    failedToDeleteComment: "刪除觀點失敗。請重試。",
    failedToCreateComment: "建立評論失敗。請重試。",
    failedToCreateCommentWithReason: "建立評論失敗：{reason}",
  },
  "zh-Hans": {
    commentDeletedSuccessfully: "观点已成功删除",
    failedToDeleteComment: "删除观点失败。请重试。",
    failedToCreateComment: "创建评论失败。请重试。",
    failedToCreateCommentWithReason: "创建评论失败：{reason}",
  },
  ja: {
    commentDeletedSuccessfully: "意見を正常に削除しました",
    failedToDeleteComment:
      "意見の削除に失敗しました。もう一度お試しください。",
    failedToCreateComment: "コメントの作成に失敗しました。もう一度お試しください。",
    failedToCreateCommentWithReason: "コメントの作成に失敗しました: {reason}",
  },
  ar: {
    commentDeletedSuccessfully: "تم حذف المقترح بنجاح",
    failedToDeleteComment: "فشل في حذف المقترح. يرجى المحاولة مرة أخرى.",
    failedToCreateComment: "فشل إنشاء التعليق. يرجى المحاولة مرة أخرى.",
    failedToCreateCommentWithReason: "فشل إنشاء التعليق: {reason}",
  },
  ky: {
    commentDeletedSuccessfully: "Пикир ийгиликтүү жок кылынды",
    failedToDeleteComment:
      "Пикирди жок кылуу ишке ашкан жок. Кайра аракет кылыңыз.",
    failedToCreateComment: "Пикир түзүү ишке ашкан жок. Кайра аракет кылыңыз.",
    failedToCreateCommentWithReason: "Пикир түзүү ишке ашкан жок: {reason}",
  },
  ru: {
    commentDeletedSuccessfully: "Высказывание успешно удалено",
    failedToDeleteComment:
      "Не удалось удалить высказывание. Пожалуйста, попробуйте снова.",
    failedToCreateComment: "Не удалось создать комментарий. Попробуйте ещё раз.",
    failedToCreateCommentWithReason: "Не удалось создать комментарий: {reason}",
  },
};
