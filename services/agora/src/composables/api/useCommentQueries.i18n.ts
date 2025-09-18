export interface UseCommentQueriesTranslations {
  commentDeletedSuccessfully: string;
  failedToDeleteComment: string;
}

export const useCommentQueriesTranslations: Record<
  string,
  UseCommentQueriesTranslations
> = {
  en: {
    commentDeletedSuccessfully: "Comment deleted successfully",
    failedToDeleteComment: "Failed to delete comment. Please try again.",
  },
  es: {
    commentDeletedSuccessfully: "Comentario eliminado exitosamente",
    failedToDeleteComment:
      "Error al eliminar el comentario. Inténtalo de nuevo.",
  },
  fr: {
    commentDeletedSuccessfully: "Commentaire supprimé avec succès",
    failedToDeleteComment:
      "Échec de la suppression du commentaire. Veuillez réessayer.",
  },
  "zh-Hant": {
    commentDeletedSuccessfully: "評論已成功刪除",
    failedToDeleteComment: "刪除評論失敗。請重試。",
  },
  "zh-Hans": {
    commentDeletedSuccessfully: "评论已成功删除",
    failedToDeleteComment: "删除评论失败。请重试。",
  },
  ja: {
    commentDeletedSuccessfully: "コメントを正常に削除しました",
    failedToDeleteComment:
      "コメントの削除に失敗しました。もう一度お試しください。",
  },
  ar: {
    commentDeletedSuccessfully: "تم حذف التعليق بنجاح",
    failedToDeleteComment: "فشل في حذف التعليق. يرجى المحاولة مرة أخرى.",
  },
};
