export interface CommentSortingSelectorTranslations {
  filterTitle: string;
  discover: string;
  new: string;
  moderationHistory: string;
  hidden: string;
  [key: string]: string;
}

export const commentSortingSelectorTranslations: Record<
  string,
  CommentSortingSelectorTranslations
> = {
  en: {
    filterTitle: "Filter Responses by:",
    discover: "Discover",
    new: "New",
    moderationHistory: "Moderation History",
    hidden: "Hidden",
  },
  es: {
    filterTitle: "Filtrar respuestas por:",
    discover: "Descubrir",
    new: "Nuevo",
    moderationHistory: "Historial de moderación",
    hidden: "Oculto",
  },
  fr: {
    filterTitle: "Filtrer les réponses par :",
    discover: "Découvrir",
    new: "Nouveau",
    moderationHistory: "Historique de modération",
    hidden: "Masqué",
  },
  "zh-Hans": {
    filterTitle: "按以下方式筛选回复：",
    discover: "发现",
    new: "最新",
    moderationHistory: "审核历史",
    hidden: "已隐藏",
  },
  "zh-Hant": {
    filterTitle: "按以下方式篩選回覆：",
    discover: "發現",
    new: "最新",
    moderationHistory: "審核歷史",
    hidden: "已隱藏",
  },
  ja: {
    filterTitle: "回答を以下でフィルター：",
    discover: "発見",
    new: "新着",
    moderationHistory: "モデレーション履歴",
    hidden: "非表示",
  },
};
