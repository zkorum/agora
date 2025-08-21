export interface ProfileSettingsTranslations {
  pageTitle: string;
  changeUsernameTitle: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const profileSettingsTranslations: Record<
  string,
  ProfileSettingsTranslations
> = {
  en: {
    pageTitle: "Profile Settings",
    changeUsernameTitle: "Change username",
  },
  es: {
    pageTitle: "Configuración de Perfil",
    changeUsernameTitle: "Cambiar nombre de usuario",
  },
  fr: {
    pageTitle: "Paramètres du Profil",
    changeUsernameTitle: "Changer le nom d'utilisateur",
  },
};
