export interface CommentActionOptionsTranslations {
  agoraOpinion: string;
  opinionDeleted: string;
  failedToDeleteOpinion: string;
}

export const commentActionOptionsTranslations: Record<
  string,
  CommentActionOptionsTranslations
> = {
  en: {
    agoraOpinion: "Agora Opinion",
    opinionDeleted: "Opinion deleted",
    failedToDeleteOpinion: "Failed to delete opinion",
  },
  es: {
    agoraOpinion: "Opinión de Agora",
    opinionDeleted: "Opinión eliminada",
    failedToDeleteOpinion: "Error al eliminar la opinión",
  },
  fr: {
    agoraOpinion: "Opinion Agora",
    opinionDeleted: "Opinion supprimée",
    failedToDeleteOpinion: "Échec de la suppression de l'opinion",
  },
  "zh-Hans": {
    agoraOpinion: "Agora 意见",
    opinionDeleted: "意见已删除",
    failedToDeleteOpinion: "删除意见失败",
  },
  "zh-Hant": {
    agoraOpinion: "Agora 意見",
    opinionDeleted: "意見已刪除",
    failedToDeleteOpinion: "刪除意見失敗",
  },
  ja: {
    agoraOpinion: "Agora 意見",
    opinionDeleted: "意見が削除されました",
    failedToDeleteOpinion: "意見の削除に失敗しました",
  },
};
