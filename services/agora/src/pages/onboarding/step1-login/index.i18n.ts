import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginOnboardingTranslations {
  pageTitle: string;
  description: string;
  loginWithRariMe: string;
  loginWithPhone: string;
}

export const loginOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginOnboardingTranslations
> = {
  en: {
    pageTitle: "Log In",
    description: "Please select a log in method.",
    loginWithRariMe: "Log In with RariMe",
    loginWithPhone: "Login with my phone number",
  },
  es: {
    pageTitle: "Iniciar Sesión",
    description: "Por favor selecciona un método de inicio de sesión.",
    loginWithRariMe: "Iniciar Sesión con RariMe",
    loginWithPhone: "Iniciar sesión con mi número de teléfono",
  },
  fr: {
    pageTitle: "Se Connecter",
    description: "Veuillez sélectionner une méthode de connexion.",
    loginWithRariMe: "Se Connecter avec RariMe",
    loginWithPhone: "Se connecter avec mon numéro de téléphone",
  },
};
