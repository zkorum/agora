import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DialogStepLayoutTranslations {
  welcomeTitle: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const dialogStepLayoutTranslations: Record<
  SupportedDisplayLanguageCodes,
  DialogStepLayoutTranslations
> = {
  en: {
    welcomeTitle: "Welcome to Agora!",
  },
  es: {
    welcomeTitle: "¡Bienvenido a Ágora!",
  },
  fr: {
    welcomeTitle: "Bienvenue sur Agora !",
  },
};
