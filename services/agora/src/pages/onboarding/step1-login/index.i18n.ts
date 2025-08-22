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
    loginWithRariMe: "Login with RariMe",
    loginWithPhone: "Login with my phone number",
  },
  es: {
    pageTitle: "Iniciar sesión",
    description: "Por favor, seleccione un método de inicio de sesión.",
    loginWithRariMe: "Iniciar sesión con RariMe",
    loginWithPhone: "Iniciar sesión con mi número de teléfono",
  },
  fr: {
    pageTitle: "Se connecter",
    description: "Veuillez sélectionner une méthode de connexion.",
    loginWithRariMe: "Se connecter avec RariMe",
    loginWithPhone: "Se connecter avec mon numéro de téléphone",
  },
};
