export interface EmbedAccountWidgetTranslations {
  logoutButton: string;
  logoutTooltip: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const embedAccountWidgetTranslations: Record<
  string,
  EmbedAccountWidgetTranslations
> = {
  en: {
    logoutButton: "Log Out",
    logoutTooltip: "Logout",
  },
  es: {
    logoutButton: "Cerrar Sesión",
    logoutTooltip: "Cerrar Sesión",
  },
  fr: {
    logoutButton: "Se Déconnecter",
    logoutTooltip: "Se Déconnecter",
  },
};
