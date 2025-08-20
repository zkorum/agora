import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SettingsTranslations {
  pageTitle: string;
  deleteAccount: string;
  deleteGuestAccount: string;
  profile: string;
  contentPreference: string;
  language: string;
  privacyPolicy: string;
  termsOfService: string;
  logOut: string;
  moderatorOrganization: string;
  componentTesting: string;
  accountDeleted: string;
  accountDeletionFailed: string;
}

export const settingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  SettingsTranslations
> = {
  en: {
    pageTitle: "Settings",
    deleteAccount: "Delete Account",
    deleteGuestAccount: "Delete Guest Account",
    profile: "Profile",
    contentPreference: "Content Preference",
    language: "Language",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    logOut: "Log Out",
    moderatorOrganization: "Moderator - Organization",
    componentTesting: "🔧 Component Testing",
    accountDeleted: "Account deleted",
    accountDeletionFailed: "Oops! Account deletion failed. Please try again",
  },
  es: {
    pageTitle: "Configuración",
    deleteAccount: "Eliminar cuenta",
    deleteGuestAccount: "Eliminar cuenta de invitado",
    profile: "Perfil",
    contentPreference: "Preferencia de contenido",
    language: "Idioma",
    privacyPolicy: "Política de privacidad",
    termsOfService: "Términos de servicio",
    logOut: "Cerrar sesión",
    moderatorOrganization: "Moderador - Organización",
    componentTesting: "🔧 Pruebas de componentes",
    accountDeleted: "Cuenta eliminada",
    accountDeletionFailed:
      "¡Ups! Error al eliminar la cuenta. Inténtalo de nuevo",
  },
  fr: {
    pageTitle: "Paramètres",
    deleteAccount: "Supprimer le compte",
    deleteGuestAccount: "Supprimer le compte invité",
    profile: "Profil",
    contentPreference: "Préférence de contenu",
    language: "Langue",
    privacyPolicy: "Politique de confidentialité",
    termsOfService: "Conditions d'utilisation",
    logOut: "Se déconnecter",
    moderatorOrganization: "Modérateur - Organisation",
    componentTesting: "🔧 Tests de composants",
    accountDeleted: "Compte supprimé",
    accountDeletionFailed:
      "Oups ! Échec de la suppression du compte. Veuillez réessayer",
  },
};
