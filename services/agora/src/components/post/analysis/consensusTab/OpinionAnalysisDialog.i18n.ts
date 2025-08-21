export interface OpinionAnalysisDialogTranslations {
  title: string;
  agree: string;
  pass: string;
  disagree: string;
  total: string;
  noGroup: string;
  viewOriginal: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const opinionAnalysisDialogTranslations: Record<
  string,
  OpinionAnalysisDialogTranslations
> = {
  en: {
    title: "Opinion analysis",
    agree: "Agree",
    pass: "Pass",
    disagree: "Disagree",
    total: "Total",
    noGroup: "No group",
    viewOriginal: "View original opinion",
  },
  es: {
    title: "Análisis de opinión",
    agree: "De acuerdo",
    pass: "Pasar",
    disagree: "En desacuerdo",
    total: "Total",
    noGroup: "Sin grupo",
    viewOriginal: "Ver opinión original",
  },
  fr: {
    title: "Analyse d'opinion",
    agree: "D'accord",
    pass: "Passer",
    disagree: "Pas d'accord",
    total: "Total",
    noGroup: "Aucun groupe",
    viewOriginal: "Voir l'opinion originale",
  },
};
