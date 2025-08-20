import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface WelcomeTranslations {
  signUp: string;
  login: string;
  skipAuthentication: string;
  launchApp: string;
  logOut: string;
}

export const welcomeTranslations: Record<
  SupportedDisplayLanguageCodes,
  WelcomeTranslations
> = {
  en: {
    signUp: "Sign Up",
    login: "Log In",
    skipAuthentication: "Skip Authentication",
    launchApp: "Launch App",
    logOut: "Log Out",
  },
  es: {
    signUp: "Registrarse",
    login: "Iniciar Sesión",
    skipAuthentication: "Omitir Autenticación",
    launchApp: "Abrir Aplicación",
    logOut: "Cerrar Sesión",
  },
  fr: {
    signUp: "S'inscrire",
    login: "Se Connecter",
    skipAuthentication: "Ignorer l'Authentification",
    launchApp: "Lancer l'Application",
    logOut: "Se Déconnecter",
  },
};
