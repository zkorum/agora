export interface MutedUsersTranslations {
  title: string;
  emptyMessage: string;
}

export const mutedUsersTranslations: Record<string, MutedUsersTranslations> = {
  en: {
    title: "Muted users",
    emptyMessage: "You have no muted users",
  },
  es: {
    title: "Usuarios silenciados",
    emptyMessage: "No tienes usuarios silenciados",
  },
  fr: {
    title: "Utilisateurs masqués",
    emptyMessage: "Vous n'avez pas d'utilisateurs masqués",
  },
};
