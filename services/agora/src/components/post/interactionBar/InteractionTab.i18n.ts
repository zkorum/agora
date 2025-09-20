import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface InteractionTabTranslations {
  analysis: string;
}

export const interactionTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  InteractionTabTranslations
> = {
  en: {
    analysis: "Analysis",
  },
  ar: {
    analysis: "التحليل",
  },
  es: {
    analysis: "Análisis",
  },
  fr: {
    analysis: "Analyse",
  },
  "zh-Hans": {
    analysis: "分析",
  },
  "zh-Hant": {
    analysis: "分析",
  },
  ja: {
    analysis: "分析",
  },
};
