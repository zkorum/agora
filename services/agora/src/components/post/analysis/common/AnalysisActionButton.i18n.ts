import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisActionButtonTranslations {
  learnMore: string;
  viewMore: string;
  informationIconAriaLabel: string;
}

export const analysisActionButtonTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisActionButtonTranslations
> = {
  en: {
    learnMore: "Learn more",
    viewMore: "View more",
    informationIconAriaLabel: "Information",
  },
  ar: {
    learnMore: "تعلّم أكثر",
    viewMore: "عرض أكثر",
    informationIconAriaLabel: "معلومات",
  },
  es: {
    learnMore: "Aprender más",
    viewMore: "Ver más",
    informationIconAriaLabel: "Información",
  },
  fr: {
    learnMore: "En savoir plus",
    viewMore: "Voir plus",
    informationIconAriaLabel: "Information",
  },
  "zh-Hans": {
    learnMore: "了解更多",
    viewMore: "查看更多",
    informationIconAriaLabel: "信息",
  },
  "zh-Hant": {
    learnMore: "了解更多",
    viewMore: "查看更多",
    informationIconAriaLabel: "信息",
  },
  ja: {
    learnMore: "詳細を見る",
    viewMore: "もっと見る",
    informationIconAriaLabel: "情報",
  },
};
