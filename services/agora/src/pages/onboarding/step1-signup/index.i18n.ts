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
  ar: {
    pageTitle: "ما الهدف من وجود أغورا؟",
    description:
      "في عالم يشهد استقطاباً متزايداً، تسعى أجورا لإعادة أنسنة وإزالة الاستقطاب في حوارات المواطنين حول القضايا المجتمعية الرئيسية.",
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
    pageTitle: "Agora が何故存在するのか？",
    description:
      "分極化が進む世界において、アゴラは重要な社会問題に関する市民対話を人間味あるものにし、分極化を解消するよう努めています。",
  },
};
