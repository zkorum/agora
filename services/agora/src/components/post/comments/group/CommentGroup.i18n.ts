export interface CommentGroupTranslations {
  noOpinionsMessage: string;
  [key: string]: string; // Required for Record<string, string> constraint
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
