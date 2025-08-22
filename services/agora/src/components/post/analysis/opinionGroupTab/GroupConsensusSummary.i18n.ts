export interface GroupConsensusSummaryTranslations {
  groupSummaryTitle: string;
  aiSummaryTitle: string;
  aiSummaryDescription: string;
}

export const groupConsensusSummaryTranslations: Record<
  string,
  GroupConsensusSummaryTranslations
> = {
  en: {
    groupSummaryTitle: "Group summary",
    aiSummaryTitle: "AI Summary",
    aiSummaryDescription:
      "We use Mistral Large (LLM model) to generate the summary & labels for each consensus group.",
  },
  es: {
    groupSummaryTitle: "Resumen del grupo",
    aiSummaryTitle: "Resumen de IA",
    aiSummaryDescription:
      "Utilizamos Mistral Large (modelo LLM) para generar el resumen y las etiquetas de cada grupo de consenso.",
  },
  fr: {
    groupSummaryTitle: "Résumé du groupe",
    aiSummaryTitle: "Résumé IA",
    aiSummaryDescription:
      "Nous utilisons Mistral Large (modèle LLM) pour générer le résumé et les étiquettes de chaque groupe de consensus.",
  },
};
