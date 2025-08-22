export interface CompactPostListTranslations {
  emptyStateTitle: string;
  emptyStateDescription: string;
  completedTitle: string;
  completedDescription: string;
  newConversationsButton: string;
}

export const compactPostListTranslations: Record<
  string,
  CompactPostListTranslations
> = {
  en: {
    emptyStateTitle: "It is too quiet here...",
    emptyStateDescription: "Create a new conversation using the",
    completedTitle: "You're all caught up",
    completedDescription: "You have seen all the new conversations.",
    newConversationsButton: "New conversations",
  },
  es: {
    emptyStateTitle: "Está muy silencioso aquí...",
    emptyStateDescription: "Crea una nueva conversación usando el",
    completedTitle: "Estás al día",
    completedDescription: "Has visto todas las conversaciones nuevas.",
    newConversationsButton: "Nuevas conversaciones",
  },
  fr: {
    emptyStateTitle: "C'est trop calme ici...",
    emptyStateDescription: "Créez une nouvelle conversation en utilisant le",
    completedTitle: "Vous êtes à jour",
    completedDescription: "Vous avez vu toutes les nouvelles conversations.",
    newConversationsButton: "Nouvelles conversations",
  },
};
