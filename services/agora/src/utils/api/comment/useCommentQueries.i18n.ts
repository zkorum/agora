import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseCommentQueriesTranslations {
  commentDeletedSuccessfully: string;
  failedToDeleteComment: string;
  failedToCreateComment: string;
}

export const useCommentQueriesTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseCommentQueriesTranslations
> = {
  en: {
    commentDeletedSuccessfully: "Statement deleted successfully",
    failedToDeleteComment: "Failed to delete statement. Please try again.",
    failedToCreateComment: "Failed to create comment. Please try again.",
  },
  de: {
    commentDeletedSuccessfully: "Aussage erfolgreich gelöscht",
    failedToDeleteComment:
      "Fehler beim Löschen der Aussage. Bitte versuchen Sie es erneut.",
    failedToCreateComment:
      "Die Aussage konnte nicht veröffentlicht werden. Bitte versuchen Sie es erneut.",
  },
  hi: {
    commentDeletedSuccessfully: "कथन सफलतापूर्वक हटा दिया गया",
    failedToDeleteComment: "कथन हटाने में विफल। कृपया पुनः प्रयास करें।",
    failedToCreateComment: "कथन प्रकाशित नहीं हो सका। कृपया फिर कोशिश करें।",
  },
  es: {
    commentDeletedSuccessfully: "Proposición eliminada exitosamente",
    failedToDeleteComment:
      "Error al eliminar la proposición. Inténtelo de nuevo.",
    failedToCreateComment:
      "No se pudo crear el comentario. Inténtelo de nuevo.",
  },
  fa: {
    commentDeletedSuccessfully: "گزاره با موفقیت حذف شد",
    failedToDeleteComment: "حذف گزاره ناموفق بود. لطفاً دوباره تلاش کنید.",
    failedToCreateComment: "ایجاد نظر ناموفق بود. لطفاً دوباره تلاش کنید.",
  },
  he: {
    commentDeletedSuccessfully: "ההצהרה נמחקה בהצלחה",
    failedToDeleteComment: "מחיקת ההצהרה נכשלה. אנא נסו שוב.",
    failedToCreateComment: "יצירת התגובה נכשלה. נסו שוב.",
  },
  fr: {
    commentDeletedSuccessfully: "Proposition supprimée avec succès",
    failedToDeleteComment:
      "Échec de la suppression de la proposition. Veuillez réessayer.",
    failedToCreateComment:
      "Échec de la création du commentaire. Veuillez réessayer.",
  },
  "zh-Hant": {
    commentDeletedSuccessfully: "意見已成功刪除",
    failedToDeleteComment: "刪除意見失敗。請重試。",
    failedToCreateComment: "建立評論失敗。請重試。",
  },
  "zh-Hans": {
    commentDeletedSuccessfully: "意见已成功删除",
    failedToDeleteComment: "删除意见失败。请重试。",
    failedToCreateComment: "创建评论失败。请重试。",
  },
  ja: {
    commentDeletedSuccessfully: "意見を正常に削除しました",
    failedToDeleteComment: "意見の削除に失敗しました。もう一度お試しください。",
    failedToCreateComment:
      "コメントの作成に失敗しました。もう一度お試しください。",
  },
  ar: {
    commentDeletedSuccessfully: "تم حذف المقترح بنجاح",
    failedToDeleteComment: "فشل في حذف المقترح. يرجى المحاولة مرة أخرى.",
    failedToCreateComment: "فشل إنشاء التعليق. يرجى المحاولة مرة أخرى.",
  },
  ky: {
    commentDeletedSuccessfully: "Пикир ийгиликтүү жок кылынды",
    failedToDeleteComment:
      "Пикирди жок кылуу ишке ашкан жок. Кайра аракет кылыңыз.",
    failedToCreateComment: "Пикир түзүү ишке ашкан жок. Кайра аракет кылыңыз.",
  },
  ru: {
    commentDeletedSuccessfully: "Высказывание успешно удалено",
    failedToDeleteComment:
      "Не удалось удалить высказывание. Пожалуйста, попробуйте снова.",
    failedToCreateComment:
      "Не удалось создать комментарий. Попробуйте ещё раз.",
  },
};
