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
      "Statements that split opinion groups against each other. Only the most representative are shown. Load more to see the rest.",
    loadMore: "Load more",
    noDivisiveOpinionsMessage: "No significant divisive statements found yet.",
    lowerRankedDivider: "Less representative",
  },
  ar: {
    divisiveTitle: "مثير للجدل",
    divisiveLongTitle: "ما الذي {keyword} المشاركين عبر مجموعات الرأي؟",
    divisiveKeyword: "يقسم",
    statisticalSubtitle:
      "مقترحات تقسم مجموعات الرأي ضد بعضها البعض. تُعرض الأكثر تمثيلاً فقط. حمّل المزيد لرؤية البقية.",
    loadMore: "تحميل المزيد",
    noDivisiveOpinionsMessage: "لم يتم العثور على مقترحات مثيرة للجدل ذات دلالة بعد.",
    lowerRankedDivider: "أقل تمثيلاً",
  },
  es: {
    divisiveTitle: "Divisivo",
    divisiveLongTitle: "¿Qué {keyword} a los participantes entre los grupos de opinión?",
    divisiveKeyword: "divide",
    statisticalSubtitle:
      "Afirmaciones que dividen a los grupos de opinión entre sí. Solo se muestran las más representativas. Cargue más para ver el resto.",
    loadMore: "Cargar más",
    noDivisiveOpinionsMessage:
      "Aún no se encontraron proposiciones divisivas significativas.",
    lowerRankedDivider: "Menos representativo",
  },
  fr: {
    divisiveTitle: "Controversé",
    divisiveLongTitle: "Qu'est-ce qui {keyword} les participants entre les groupes d'opinion ?",
    divisiveKeyword: "divise",
    statisticalSubtitle:
      "Propositions qui divisent les groupes d'opinion entre eux. Seules les plus représentatives sont affichées. Chargez plus pour voir les suivantes.",
    loadMore: "Charger plus",
    noDivisiveOpinionsMessage:
      "Aucune proposition controversée significative trouvée pour le moment.",
    lowerRankedDivider: "Moins représentatif",
  },
  "zh-Hans": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什么使参与者在各意见群组之间产生{keyword}？",
    divisiveKeyword: "分歧",
    statisticalSubtitle:
      "使意见群组之间产生对立的观点。仅显示最具代表性的观点。加载更多以查看其余。",
    loadMore: "加载更多",
    noDivisiveOpinionsMessage: "尚未找到显著的分歧观点。",
    lowerRankedDivider: "代表性较低",
  },
  "zh-Hant": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什麼使參與者在各意見群組之間產生{keyword}？",
    divisiveKeyword: "分歧",
    statisticalSubtitle:
      "使意見群組之間產生對立的觀點。僅顯示最具代表性的觀點。載入更多以查看其餘。",
    loadMore: "載入更多",
    noDivisiveOpinionsMessage: "尚未找到顯著的分歧觀點。",
    lowerRankedDivider: "代表性較低",
  },
  ja: {
    divisiveTitle: "分断",
    divisiveLongTitle: "意見グループ間で参加者を{keyword}しているものは何ですか？",
    divisiveKeyword: "分断",
    statisticalSubtitle:
      "意見グループ同士を対立させる意見です。最も代表的なもののみ表示。残りを見るにはもっと読み込んでください。",
    loadMore: "もっと読み込む",
    noDivisiveOpinionsMessage: "有意な分断的主張はまだ見つかりません。",
    lowerRankedDivider: "代表性が低い",
  },
};
