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
    pageTitle: "Pourquoi Agora existe ?",
    description:
      "Dans un monde marqué par des polarisations croissantes, Agora s'efforce de réhumaniser et de dépolariser les dialogues citoyens sur les enjeux sociétaux clés.",
  },
  "zh-Hans": {
    pageTitle: "为什么存在 Agora？",
    description:
      "在一个日益两极化的世界中，Agora 努力重新人性化并去两极化公民对话，以解决关键社会问题。",
  },
  "zh-Hant": {
    pageTitle: "為什麼存在 Agora？",
    description:
      "在一個日益兩極化的世界中，Agora 努力重新人性化並去兩極化公民對話，以解決關鍵社會問題。",
  },
  ja: {
    pageTitle: "Agora が存在する理由",
    description:
      "増大する二極化の世界で、Agora は市民の対話を再人間化し、二極化を解消することを目指しています。",
  },
};
