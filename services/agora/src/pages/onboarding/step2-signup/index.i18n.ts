import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface Step2SignupOnboardingTranslations {
  pageTitle: string;
  description: string;
  verifyAnonymously: string;
  verifyWithPhone: string;
}

export const step2SignupOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  Step2SignupOnboardingTranslations
> = {
  en: {
    pageTitle: "Agora aims to be exclusively human",
    description:
      "More than half of internet traffic comes from bots. That's why we verify users, so you're debating people, not robots plotting world domination!",
    verifyAnonymously: "Verify anonymously",
    verifyWithPhone: "Verify with my phone number",
  },
  es: {
    pageTitle: "Agora aspira a ser exclusivamente humana",
    description:
      "Más de la mitad del tráfico de internet proviene de bots. Por eso verificamos su identidad, ¡para que debata con personas y no con robots tramando dominar el mundo!",
    verifyAnonymously: "Verificar anónimamente",
    verifyWithPhone: "Verificar con mi número de teléfono",
  },
  fr: {
    pageTitle: "Agora vise à être exclusivement humaine",
    description:
      "Plus de la moitié du trafic internet provient de bots. C'est pourquoi nous vérifions l'identité des utilisateurs, pour que vous débattiez avec des personnes, pas avec des robots complotant la domination mondiale !",
    verifyAnonymously: "Vérifier anonymement",
    verifyWithPhone: "Vérifier avec mon numéro de téléphone",
  },
};
