import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseCommentQueriesTranslations {
  commentDeletedSuccessfully: string;
  failedToDeleteComment: string;
}

export const useCommentQueriesTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseCommentQueriesTranslations
> = {
  en: {
    commentDeletedSuccessfully: "Statement deleted successfully",
    failedToDeleteComment: "Failed to delete statement. Please try again.",
  },
  es: {
    commentDeletedSuccessfully: "Proposición eliminada exitosamente",
    failedToDeleteComment:
      "Error al eliminar la proposición. Inténtalo de nuevo.",
  },
  fr: {
    commentDeletedSuccessfully: "Proposition supprimée avec succès",
    failedToDeleteComment:
      "Échec de la suppression de la proposition. Veuillez réessayer.",
  },
  "zh-Hant": {
    commentDeletedSuccessfully: "觀點已成功刪除",
    failedToDeleteComment: "刪除觀點失敗。請重試。",
  },
  "zh-Hans": {
    commentDeletedSuccessfully: "观点已成功删除",
    failedToDeleteComment: "删除观点失败。请重试。",
  },
  ja: {
    commentDeletedSuccessfully: "主張を正常に削除しました",
    failedToDeleteComment:
      "主張の削除に失敗しました。もう一度お試しください。",
  },
  ar: {
    commentDeletedSuccessfully: "تم حذف المقترح بنجاح",
    failedToDeleteComment: "فشل في حذف المقترح. يرجى المحاولة مرة أخرى.",
  },
};
