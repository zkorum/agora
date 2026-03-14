import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface InteractionTabTranslations {
  analysis: string;
  rank: string;
}

export const interactionTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  InteractionTabTranslations
> = {
  en: {
    analysis: "Analysis",
    rank: "Rank",
  },
  ar: {
    analysis: "التحليل",
    rank: "ترتيب",
  },
  es: {
    analysis: "Análisis",
    rank: "Clasificar",
  },
  fr: {
    analysis: "Analyse",
    rank: "Classer",
  },
  "zh-Hans": {
    analysis: "分析",
    rank: "排名",
  },
  "zh-Hant": {
    analysis: "分析",
    rank: "排名",
  },
  ja: {
    analysis: "分析",
    rank: "ランク",
  },
  ky: {
    analysis: "Анализ",
    rank: "Рейтинг",
  },
  ru: {
    analysis: "Анализ",
    rank: "Ранжировать",
  },
};
