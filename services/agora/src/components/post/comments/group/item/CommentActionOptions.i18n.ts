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
};
