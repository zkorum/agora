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
  ar: {
    opinionNotFound: "ترجمة: Opinion not found:",
    opinionRemovedByModerators:
      "ترجمة: This opinion has been removed by the moderators",
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
  "zh-Hans": {
    opinionNotFound: "未找到意见：",
    opinionRemovedByModerators: "此意见已被版主移除",
  },
  "zh-Hant": {
    opinionNotFound: "未找到意見：",
    opinionRemovedByModerators: "此意見已被版主移除",
  },
  ja: {
    opinionNotFound: "意見が見つかりません：",
    opinionRemovedByModerators: "この意見はモデレーターによって削除されました",
  },
};
