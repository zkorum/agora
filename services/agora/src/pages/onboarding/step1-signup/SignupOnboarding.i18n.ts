import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SignupOnboardingTranslations {
  pageTitle: string;
  description: string;
}

export const signupOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  SignupOnboardingTranslations
> = {
  en: {
    pageTitle: "Why does Agora exist?",
    description:
      "In a world marked by increasing polarizations, Agora strives to rehumanize and depolarize citizen dialogues on key societal issues.",
  },
  es: {
    pageTitle: "¿Por qué existe Agora?",
    description:
      "En un mundo marcado por las crecientes polarizaciones, Agora se esfuerza por rehumanizar y despolarizar los diálogos ciudadanos sobre temas sociales clave.",
  },
  fr: {
    pageTitle: "Pourquoi Agora existe-t-elle ?",
    description:
      "Dans un monde marqué par des polarisations croissantes, Agora s'efforce de réhumaniser et de dépolariser les dialogues citoyens sur les enjeux sociétaux clés.",
  },
};
