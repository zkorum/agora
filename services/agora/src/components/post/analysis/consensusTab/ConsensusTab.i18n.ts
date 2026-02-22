import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConsensusTabTranslations {
  agreementsTitle: string;
  disagreementsTitle: string;
  agreementsLongTitle: string;
  disagreementsLongTitle: string;
  agreementsKeyword: string;
  disagreementsKeyword: string;
  statisticalSubtitleAgree: string;
  statisticalSubtitleDisagree: string;
  loadMore: string;
  noAgreementsMessage: string;
  noDisagreementsMessage: string;
  lowerRankedDivider: string;
}

export const consensusTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConsensusTabTranslations
> = {
  en: {
    agreementsTitle: "Approved",
    disagreementsTitle: "Rejected",
    agreementsLongTitle:
      "Which statements are {keyword} by all groups?",
    disagreementsLongTitle:
      "Which statements are {keyword} by all groups?",
    agreementsKeyword: "approved",
    disagreementsKeyword: "rejected",
    statisticalSubtitleAgree:
      "Statements every opinion group approves, not just the overall majority. Only the most representative are shown. Load more to see the rest.",
    statisticalSubtitleDisagree:
      "Statements every opinion group rejects, not just the overall majority. Only the most representative are shown. Load more to see the rest.",
    loadMore: "Load more",
    noAgreementsMessage: "No significantly approved statements found yet.",
    noDisagreementsMessage: "No significantly rejected statements found yet.",
    lowerRankedDivider: "Less representative",
  },
  ar: {
    agreementsTitle: "معتمدة",
    disagreementsTitle: "مرفوضة",
    agreementsLongTitle:
      "ما المقترحات {keyword} من جميع المجموعات؟",
    disagreementsLongTitle:
      "ما المقترحات {keyword} من جميع المجموعات؟",
    agreementsKeyword: "المعتمدة",
    disagreementsKeyword: "المرفوضة",
    statisticalSubtitleAgree:
      "مقترحات تعتمدها جميع مجموعات الرأي، وليس فقط الأغلبية. تُعرض الأكثر تمثيلاً فقط. حمّل المزيد لرؤية البقية.",
    statisticalSubtitleDisagree:
      "مقترحات ترفضها جميع مجموعات الرأي، وليس فقط الأغلبية. تُعرض الأكثر تمثيلاً فقط. حمّل المزيد لرؤية البقية.",
    loadMore: "تحميل المزيد",
    noAgreementsMessage: "لم يتم العثور على مقترحات معتمدة بشكل ملحوظ بعد.",
    noDisagreementsMessage: "لم يتم العثور على مقترحات مرفوضة بشكل ملحوظ بعد.",
    lowerRankedDivider: "أقل تمثيلاً",
  },
  es: {
    agreementsTitle: "Aprobados",
    disagreementsTitle: "Rechazados",
    agreementsLongTitle:
      "¿Qué afirmaciones son {keyword} por todos los grupos?",
    disagreementsLongTitle:
      "¿Qué afirmaciones son {keyword} por todos los grupos?",
    agreementsKeyword: "aprobadas",
    disagreementsKeyword: "rechazadas",
    statisticalSubtitleAgree:
      "Afirmaciones aprobadas por todos los grupos de opinión, no solo la mayoría. Solo se muestran las más representativas. Cargue más para ver el resto.",
    statisticalSubtitleDisagree:
      "Afirmaciones rechazadas por todos los grupos de opinión, no solo la mayoría. Solo se muestran las más representativas. Cargue más para ver el resto.",
    loadMore: "Cargar más",
    noAgreementsMessage: "Aún no se encontraron proposiciones aprobadas significativamente.",
    noDisagreementsMessage: "Aún no se encontraron proposiciones rechazadas significativamente.",
    lowerRankedDivider: "Menos representativo",
  },
  fr: {
    agreementsTitle: "Approuvés",
    disagreementsTitle: "Rejetés",
    agreementsLongTitle:
      "Quelles propositions sont {keyword} par tous les groupes ?",
    disagreementsLongTitle:
      "Quelles propositions sont {keyword} par tous les groupes ?",
    agreementsKeyword: "approuvées",
    disagreementsKeyword: "rejetées",
    statisticalSubtitleAgree:
      "Propositions approuvées par tous les groupes d'opinion, pas seulement la majorité. Seules les plus représentatives sont affichées. Chargez plus pour voir les suivantes.",
    statisticalSubtitleDisagree:
      "Propositions rejetées par tous les groupes d'opinion, pas seulement la majorité. Seules les plus représentatives sont affichées. Chargez plus pour voir les suivantes.",
    loadMore: "Charger plus",
    noAgreementsMessage: "Aucune proposition significativement approuvée pour le moment.",
    noDisagreementsMessage: "Aucune proposition significativement rejetée pour le moment.",
    lowerRankedDivider: "Moins représentatif",
  },
  "zh-Hans": {
    agreementsTitle: "通过",
    disagreementsTitle: "否决",
    agreementsLongTitle: "哪些观点被所有群组{keyword}？",
    disagreementsLongTitle: "哪些观点被所有群组{keyword}？",
    agreementsKeyword: "认可",
    disagreementsKeyword: "否决",
    statisticalSubtitleAgree:
      "所有意见群组都认可的观点，而非仅仅是多数人的意见。仅显示最具代表性的观点。加载更多以查看其余。",
    statisticalSubtitleDisagree:
      "所有意见群组都否决的观点，而非仅仅是多数人的意见。仅显示最具代表性的观点。加载更多以查看其余。",
    loadMore: "加载更多",
    noAgreementsMessage: "尚未找到显著认可的观点。",
    noDisagreementsMessage: "尚未找到显著否决的观点。",
    lowerRankedDivider: "代表性较低",
  },
  "zh-Hant": {
    agreementsTitle: "通過",
    disagreementsTitle: "否決",
    agreementsLongTitle: "哪些觀點被所有群組{keyword}？",
    disagreementsLongTitle: "哪些觀點被所有群組{keyword}？",
    agreementsKeyword: "認可",
    disagreementsKeyword: "否決",
    statisticalSubtitleAgree:
      "所有意見群組都認可的觀點，而非僅僅是多數人的意見。僅顯示最具代表性的觀點。載入更多以查看其餘。",
    statisticalSubtitleDisagree:
      "所有意見群組都否決的觀點，而非僅僅是多數人的意見。僅顯示最具代表性的觀點。載入更多以查看其餘。",
    loadMore: "載入更多",
    noAgreementsMessage: "尚未找到顯著認可的觀點。",
    noDisagreementsMessage: "尚未找到顯著否決的觀點。",
    lowerRankedDivider: "代表性較低",
  },
  ja: {
    agreementsTitle: "承認",
    disagreementsTitle: "否決",
    agreementsLongTitle:
      "すべてのグループに{keyword}された意見は？",
    disagreementsLongTitle:
      "すべてのグループに{keyword}された意見は？",
    agreementsKeyword: "承認",
    disagreementsKeyword: "否決",
    statisticalSubtitleAgree:
      "単なる多数派ではなく、すべての意見グループが承認した意見です。最も代表的なもののみ表示。残りを見るにはもっと読み込んでください。",
    statisticalSubtitleDisagree:
      "単なる多数派ではなく、すべての意見グループが否決した意見です。最も代表的なもののみ表示。残りを見るにはもっと読み込んでください。",
    loadMore: "もっと読み込む",
    noAgreementsMessage: "有意に承認された意見はまだ見つかりません。",
    noDisagreementsMessage: "有意に否決された意見はまだ見つかりません。",
    lowerRankedDivider: "代表性が低い",
  },
};
