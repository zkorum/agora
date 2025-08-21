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
};
