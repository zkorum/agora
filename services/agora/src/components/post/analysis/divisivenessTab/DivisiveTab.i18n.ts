import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DivisiveTabTranslations {
  divisiveTitle: string;
  divisiveLongTitle: string;
  divisiveKeyword: string;
  subtitle: string;
  subtitleLoadMoreHint: string;
  subtitleLoadMoreHintEmphasis: string;
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
    subtitle:
      "Statements that split opinion groups against each other. Ranked by statistical significance.",
    subtitleLoadMoreHint: "You can load more to see {emphasis} statements.",
    subtitleLoadMoreHintEmphasis: "all",
    loadMore: "Load all",
    noDivisiveOpinionsMessage: "No significant divisive statements found yet.",
    lowerRankedDivider: "Less statistically significant",
  },
  ar: {
    divisiveTitle: "مثير للجدل",
    divisiveLongTitle: "ما الذي {keyword} المشاركين عبر مجموعات الرأي؟",
    divisiveKeyword: "يقسم",
    subtitle:
      "مقترحات تقسم مجموعات الرأي ضد بعضها البعض. مرتبة حسب الدلالة الإحصائية.",
    subtitleLoadMoreHint: "يمكنك تحميل المزيد لرؤية {emphasis} المقترحات.",
    subtitleLoadMoreHintEmphasis: "جميع",
    loadMore: "تحميل الكل",
    noDivisiveOpinionsMessage: "لم يتم العثور على مقترحات مثيرة للجدل ذات دلالة بعد.",
    lowerRankedDivider: "أقل دلالة إحصائياً",
  },
  es: {
    divisiveTitle: "Divisivo",
    divisiveLongTitle: "¿Qué {keyword} a los participantes entre los grupos de opinión?",
    divisiveKeyword: "divide",
    subtitle:
      "Proposiciones que dividen a los grupos de opinión entre sí. Ordenadas por significancia estadística.",
    subtitleLoadMoreHint: "Puede cargar más para ver {emphasis} las proposiciones.",
    subtitleLoadMoreHintEmphasis: "todas",
    loadMore: "Cargar todo",
    noDivisiveOpinionsMessage:
      "Aún no se encontraron proposiciones divisivas significativas.",
    lowerRankedDivider: "Menos estadísticamente significativas",
  },
  fr: {
    divisiveTitle: "Controversé",
    divisiveLongTitle: "Qu'est-ce qui {keyword} les participants entre les groupes d'opinion ?",
    divisiveKeyword: "divise",
    subtitle:
      "Propositions qui divisent les groupes d'opinion entre eux. Elles sont classées par significativité statistique.",
    subtitleLoadMoreHint: "Vous pouvez charger plus pour voir {emphasis} les propositions.",
    subtitleLoadMoreHintEmphasis: "toutes",
    loadMore: "Tout charger",
    noDivisiveOpinionsMessage:
      "Aucune proposition controversée significative trouvée pour le moment.",
    lowerRankedDivider: "Moins statistiquement significatives",
  },
  "zh-Hans": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什么使参与者在各意见群组之间产生{keyword}？",
    divisiveKeyword: "分歧",
    subtitle:
      "使意见群组之间产生对立的观点。按统计显著性排序。",
    subtitleLoadMoreHint: "您可以加载更多以查看{emphasis}观点。",
    subtitleLoadMoreHintEmphasis: "所有",
    loadMore: "全部加载",
    noDivisiveOpinionsMessage: "尚未找到显著的分歧观点。",
    lowerRankedDivider: "统计显著性较低",
  },
  "zh-Hant": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什麼使參與者在各意見群組之間產生{keyword}？",
    divisiveKeyword: "分歧",
    subtitle:
      "使意見群組之間產生對立的觀點。按統計顯著性排序。",
    subtitleLoadMoreHint: "您可以載入更多以查看{emphasis}觀點。",
    subtitleLoadMoreHintEmphasis: "所有",
    loadMore: "全部載入",
    noDivisiveOpinionsMessage: "尚未找到顯著的分歧觀點。",
    lowerRankedDivider: "統計顯著性較低",
  },
  ja: {
    divisiveTitle: "分断",
    divisiveLongTitle: "意見グループ間で参加者を{keyword}しているものは何ですか？",
    divisiveKeyword: "分断",
    subtitle:
      "意見グループ同士を対立させる意見です。統計的有意性の順に表示。",
    subtitleLoadMoreHint: "もっと読み込んで{emphasis}意見を表示できます。",
    subtitleLoadMoreHintEmphasis: "すべての",
    loadMore: "すべて読み込む",
    noDivisiveOpinionsMessage: "有意な分断的主張はまだ見つかりません。",
    lowerRankedDivider: "統計的有意性が低い",
  },
};
