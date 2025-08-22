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
};
