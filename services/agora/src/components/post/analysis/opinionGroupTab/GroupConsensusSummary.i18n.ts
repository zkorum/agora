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
  ar: {
    groupSummaryTitle: "ملخص المجموعة",
    aiSummaryTitle: "ملخص الذكاء الاصطناعي",
    aiSummaryDescription:
      "نحن نستخدم Mistral Large (نموذج LLM) لإنشاء الملخص والتسميات لكل مجموعة إجماع.",
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
  "zh-Hans": {
    groupSummaryTitle: "群组总结",
    aiSummaryTitle: "AI 总结",
    aiSummaryDescription:
      "我们使用 Mistral Large (LLM 模型) 为每个共识群组生成总结和标签。",
  },
  "zh-Hant": {
    groupSummaryTitle: "群組總結",
    aiSummaryTitle: "AI 總結",
    aiSummaryDescription:
      "我們使用 Mistral Large (LLM 模型) 為每個共識群組生成總結和標籤。",
  },
  ja: {
    groupSummaryTitle: "グループ要約",
    aiSummaryTitle: "AI 要約",
    aiSummaryDescription:
      "我們は Mistral Large (LLM モデル) を使用して、各共識グループの要約とラベルを生成します。",
  },
};
