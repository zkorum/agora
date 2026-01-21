import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DivisiveInformationDialogTranslations {
  title: string;
  description: string;
}

export const divisiveInformationDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  DivisiveInformationDialogTranslations
> = {
  en: {
    title: "Divisive",
    description:
      "A ranked list of opinions that most strongly split people into opposing sides, revealing where disagreements are strongest.",
  },
  ar: {
    title: "مثير للانقسام",
    description:
      "قائمة مرتبة من الآراء التي تقسم الأشخاص بشكل أقوى إلى مجموعات متعارضة، وتكشف عن أقوى نقاط الخلاف.",
  },
  es: {
    title: "Divisivo",
    description:
      "Lista ordenada de opiniones que dividen más intensamente a las personas en grupos opuestos, revelando dónde están los mayores desacuerdos.",
  },
  fr: {
    title: "Opinions Clivantes",
    description:
      "Liste ordonnée d'opinions qui divisent le plus fortement les groupes d'opinion, révélant les principaux points de désaccord.",
  },
  "zh-Hans": {
    title: "争议性",
    description:
      "最强烈地将人们分为对立阵营的意见排名列表，揭示分歧最大的地方。",
  },
  "zh-Hant": {
    title: "爭議性",
    description:
      "最強烈地將人們分為對立陣營的意見排名列表，揭示分歧最大的地方。",
  },
  ja: {
    title: "分断的",
    description:
      "人々を最も強く対立するグループに分ける意見のランキングリスト。最も意見が分かれている点を明らかにします。",
  },
};
