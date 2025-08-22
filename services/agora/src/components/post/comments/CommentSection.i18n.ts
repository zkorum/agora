export interface CommentSectionTranslations {
  opinionNotFound: string;
  opinionRemovedByModerators: string;
}

export const commentSectionTranslations: Record<
  string,
  CommentSectionTranslations
> = {
  en: {
    opinionNotFound: "Opinion not found:",
    opinionRemovedByModerators:
      "This opinion has been removed by the moderators",
  },
  es: {
    opinionNotFound: "Opinión no encontrada:",
    opinionRemovedByModerators:
      "Esta opinión ha sido eliminada por los moderadores",
  },
  fr: {
    opinionNotFound: "Opinion introuvable:",
    opinionRemovedByModerators:
      "Cette opinion a été supprimée par les modérateurs",
  },
};
