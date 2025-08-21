export interface InteractionTabTranslations {
  analysis: string;
  [key: string]: string;
}

export const interactionTabTranslations: Record<
  string,
  InteractionTabTranslations
> = {
  en: {
    analysis: "Analysis",
  },
  es: {
    analysis: "Análisis",
  },
  fr: {
    analysis: "Analyse",
  },
};
