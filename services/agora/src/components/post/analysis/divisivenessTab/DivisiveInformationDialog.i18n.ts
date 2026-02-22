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
    title: "Divisive Statements",
    description:
      "Statements where opinion groups disagree with each other. One group approves while another rejects. These reveal the key dividing lines in the conversation. Only the most representative are shown first. Load more to see the rest, ranked by cross-group divisiveness.",
  },
  ar: {
    title: "المقترحات المثيرة للانقسام",
    description:
      "مقترحات تختلف حولها مجموعات الرأي مع بعضها البعض. مجموعة تعتمد بينما أخرى ترفض. تكشف هذه عن خطوط الانقسام الرئيسية في النقاش. تُعرض الأكثر تمثيلاً أولاً. حمّل المزيد لرؤية البقية، مرتبة حسب درجة الانقسام بين المجموعات.",
  },
  es: {
    title: "Afirmaciones Divisivas",
    description:
      "Afirmaciones en las que los grupos de opinión no están de acuerdo entre sí. Un grupo aprueba mientras otro rechaza. Revelan las principales líneas divisorias en la conversación. Solo se muestran las más representativas primero. Cargue más para ver el resto, clasificadas por fuerza de la división entre grupos.",
  },
  fr: {
    title: "Propositions Clivantes",
    description:
      "Propositions sur lesquelles les groupes d'opinion sont en désaccord entre eux. Un groupe approuve tandis qu'un autre rejette. Elles révèlent les principales lignes de fracture de la conversation. Seules les plus représentatives sont affichées en premier. Chargez plus pour voir les suivantes, classées par degré de division entre groupes.",
  },
  "zh-Hans": {
    title: "争议性观点",
    description:
      "意见群组之间产生分歧的观点。一个群组认可而另一个群组否决。这些揭示了对话中的主要分歧线。仅先显示最具代表性的观点。加载更多以查看其余，按跨群组分歧强度排列。",
  },
  "zh-Hant": {
    title: "爭議性觀點",
    description:
      "意見群組之間產生分歧的觀點。一個群組認可而另一個群組否決。這些揭示了對話中的主要分歧線。僅先顯示最具代表性的觀點。載入更多以查看其餘，按跨群組分歧強度排列。",
  },
  ja: {
    title: "分断的な意見",
    description:
      "意見グループ同士が対立する意見です。あるグループは承認し、別のグループは否決します。会話の主要な分断線を明らかにします。最も代表的なものが最初に表示されます。残りを見るにはもっと読み込んでください。グループ間の分断の強さで順位付け。",
  },
};
