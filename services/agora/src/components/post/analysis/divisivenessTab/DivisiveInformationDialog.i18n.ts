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
      "Statements where opinion groups disagree with each other. One group agrees while another disagrees. These reveal the key dividing lines in the conversation. Ranked by cross-group divisiveness.",
  },
  ar: {
    title: "المقترحات المثيرة للانقسام",
    description:
      "مقترحات تختلف حولها مجموعات الرأي مع بعضها البعض. مجموعة توافق بينما أخرى تعارض. تكشف هذه عن خطوط الانقسام الرئيسية في النقاش. مرتبة حسب درجة الانقسام بين المجموعات.",
  },
  es: {
    title: "Afirmaciones Divisivas",
    description:
      "Afirmaciones en las que los grupos de opinión no están de acuerdo entre sí. Un grupo está a favor mientras otro está en contra. Revelan las principales líneas divisorias en la conversación. Clasificadas por fuerza de la división entre grupos.",
  },
  fr: {
    title: "Propositions Clivantes",
    description:
      "Propositions sur lesquelles les groupes d'opinion sont en désaccord entre eux. Un groupe est pour tandis qu'un autre est contre. Elles révèlent les principales lignes de fracture de la conversation. Classées par degré de division entre groupes.",
  },
  "zh-Hans": {
    title: "争议性观点",
    description:
      "意见群组之间产生分歧的观点。一个群组赞同而另一个群组反对。这些揭示了对话中的主要分歧线。按跨群组分歧强度排名。",
  },
  "zh-Hant": {
    title: "爭議性觀點",
    description:
      "意見群組之間產生分歧的觀點。一個群組贊同而另一個群組反對。這些揭示了對話中的主要分歧線。按跨群組分歧強度排名。",
  },
  ja: {
    title: "分断的な意見",
    description:
      "意見グループ同士が対立する意見です。あるグループは賛成し、別のグループは反対します。会話の主要な分断線を明らかにします。グループ間の分断の強さで順位付け。",
  },
};
