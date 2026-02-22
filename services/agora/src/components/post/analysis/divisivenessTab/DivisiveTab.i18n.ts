import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DivisiveTabTranslations {
  divisiveTitle: string;
  divisiveLongTitle: string;
  divisiveKeyword: string;
  statisticalSubtitle: string;
  loadMore: string;
  noDivisiveOpinionsMessage: string;
  lowerRankedDivider: string;
}

export const divisiveTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  DivisiveTabTranslations
> = {
  en: {
    divisiveTitle: "Divisive",
    divisiveLongTitle: "What {keyword} people across groups?",
    divisiveKeyword: "divides",
    statisticalSubtitle:
      "Statements that split opinion groups against each other. Ranked by cross-group divisiveness.",
    loadMore: "Load more",
    noDivisiveOpinionsMessage: "No significant divisive statements found yet.",
    lowerRankedDivider: "Lower-ranked",
  },
  ar: {
    divisiveTitle: "مثير للجدل",
    divisiveLongTitle: "ما الذي {keyword} المشاركين عبر مجموعات الرأي؟",
    divisiveKeyword: "يقسم",
    statisticalSubtitle:
      "مقترحات تقسم مجموعات الرأي ضد بعضها البعض. مرتبة حسب قوة الانقسام بين المجموعات.",
    loadMore: "تحميل المزيد",
    noDivisiveOpinionsMessage: "لم يتم العثور على مقترحات مثيرة للجدل ذات دلالة بعد.",
    lowerRankedDivider: "أقل ترتيبًا",
  },
  es: {
    divisiveTitle: "Divisivo",
    divisiveLongTitle: "¿Qué {keyword} a los participantes entre los grupos de opinión?",
    divisiveKeyword: "divide",
    statisticalSubtitle:
      "Afirmaciones que dividen a los grupos de opinión entre sí. Clasificadas por fuerza de la división entre grupos.",
    loadMore: "Cargar más",
    noDivisiveOpinionsMessage:
      "Aún no se encontraron proposiciones divisivas significativas.",
    lowerRankedDivider: "Menor clasificación",
  },
  fr: {
    divisiveTitle: "Controversé",
    divisiveLongTitle: "Qu'est-ce qui {keyword} les participants entre les groupes d'opinion ?",
    divisiveKeyword: "divise",
    statisticalSubtitle:
      "Propositions qui divisent les groupes d'opinion entre eux. Classées par force de la division entre groupes.",
    loadMore: "Charger plus",
    noDivisiveOpinionsMessage:
      "Aucune proposition controversée significative trouvée pour le moment.",
    lowerRankedDivider: "Classement inférieur",
  },
  "zh-Hans": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什么使参与者在各意见群组之间产生{keyword}？",
    divisiveKeyword: "分歧",
    statisticalSubtitle:
      "使意见群组之间产生对立的观点。按跨群组分歧强度排名。",
    loadMore: "加载更多",
    noDivisiveOpinionsMessage: "尚未找到显著的分歧观点。",
    lowerRankedDivider: "排名较低",
  },
  "zh-Hant": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什麼使參與者在各意見群組之間產生{keyword}？",
    divisiveKeyword: "分歧",
    statisticalSubtitle:
      "使意見群組之間產生對立的觀點。按跨群組分歧強度排名。",
    loadMore: "載入更多",
    noDivisiveOpinionsMessage: "尚未找到顯著的分歧觀點。",
    lowerRankedDivider: "排名較低",
  },
  ja: {
    divisiveTitle: "分断",
    divisiveLongTitle: "意見グループ間で参加者を{keyword}しているものは何ですか？",
    divisiveKeyword: "分断",
    statisticalSubtitle:
      "意見グループ同士を対立させる意見です。グループ間の分断の強さで順位付け。",
    loadMore: "もっと読み込む",
    noDivisiveOpinionsMessage: "有意な分断的主張はまだ見つかりません。",
    lowerRankedDivider: "順位が低い",
  },
};
