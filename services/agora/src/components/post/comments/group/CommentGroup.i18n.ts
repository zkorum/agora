export interface CommentGroupTranslations {
  noOpinionsMessage: string;
}

export const commentGroupTranslations: Record<
  string,
  CommentGroupTranslations
> = {
  en: {
    noOpinionsMessage: "There are no opinions in this conversation filter.",
  },
  es: {
    noOpinionsMessage: "No hay opiniones en este filtro de conversación.",
  },
  fr: {
    noOpinionsMessage:
      "Il n'y a pas d'opinions dans ce filtre de conversation.",
  },
  "zh-CN": {
    noOpinionsMessage: "此对话筛选器中没有意见。",
  },
  "zh-TW": {
    noOpinionsMessage: "此對話篩選器中沒有意見。",
  },
  ja: {
    noOpinionsMessage: "この会話フィルターには意見がありません。",
  },
};
