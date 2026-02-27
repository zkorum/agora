import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConsensusTabTranslations {
  agreementsTitle: string;
  disagreementsTitle: string;
  agreementsLongTitle: string;
  disagreementsLongTitle: string;
  agreementsKeyword: string;
  disagreementsKeyword: string;
  subtitleAgree: string;
  subtitleDisagree: string;
  subtitleLoadMoreHint: string;
  subtitleLoadMoreHintEmphasis: string;
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
    subtitleAgree:
      "Statements all opinion groups agree to agree on. Not a simple majority, but a cross-group consensus. Ranked by statistical significance.",
    subtitleDisagree:
      "Statements all opinion groups agree to disagree on. Not a simple majority, but a cross-group consensus. Ranked by statistical significance.",
    subtitleLoadMoreHint: "Load all to show {emphasis} statement.",
    subtitleLoadMoreHintEmphasis: "every",
    loadMore: "Load all",
    noAgreementsMessage: "No consensus has emerged yet.",
    noDisagreementsMessage: "No consensus has emerged yet.",
    lowerRankedDivider: "Less statistically significant",
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
    subtitleAgree:
      "مقترحات تتفق جميع مجموعات الرأي على الموافقة عليها — إجماع بين المجموعات، وليس مجرد تصويت أغلبية. مرتبة حسب الدلالة الإحصائية.",
    subtitleDisagree:
      "مقترحات تتفق جميع مجموعات الرأي على رفضها — إجماع بين المجموعات، وليس مجرد تصويت أغلبية. مرتبة حسب الدلالة الإحصائية.",
    subtitleLoadMoreHint: "حمّل الكل لعرض {emphasis} المقترحات.",
    subtitleLoadMoreHintEmphasis: "جميع",
    loadMore: "تحميل الكل",
    noAgreementsMessage: "لم يظهر أي إجماع بعد.",
    noDisagreementsMessage: "لم يظهر أي إجماع بعد.",
    lowerRankedDivider: "أقل دلالة إحصائياً",
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
    subtitleAgree:
      "Proposiciones aprobadas por unanimidad por todos los grupos de opinión. No se trata de una simple mayoría, sino de un consenso entre grupos. Ordenadas por significancia estadística.",
    subtitleDisagree:
      "Proposiciones rechazadas por unanimidad por todos los grupos de opinión. No se trata de una simple mayoría, sino de un consenso entre grupos. Ordenadas por significancia estadística.",
    subtitleLoadMoreHint: "Cargue todo para mostrar {emphasis} proposición.",
    subtitleLoadMoreHintEmphasis: "cada",
    loadMore: "Cargar todo",
    noAgreementsMessage: "Aún no ha surgido ningún consenso.",
    noDisagreementsMessage: "Aún no ha surgido ningún consenso.",
    lowerRankedDivider: "Menos estadísticamente significativas",
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
    subtitleAgree:
      "Propositions approuvées à l'unanimité par tous les groupes d'opinion. Il ne s'agit pas d'une simple majorité, mais d'un consensus inter-groupes. Elles sont classées par significativité statistique.",
    subtitleDisagree:
      "Propositions rejetées à l'unanimité par tous les groupes d'opinion. Il ne s'agit pas d'une simple majorité, mais d'un consensus inter-groupes. Elles sont classées par significativité statistique.",
    subtitleLoadMoreHint: "Tout charger pour afficher {emphasis} proposition.",
    subtitleLoadMoreHintEmphasis: "chaque",
    loadMore: "Tout charger",
    noAgreementsMessage: "Aucun consensus n'a encore émergé.",
    noDisagreementsMessage: "Aucun consensus n'a encore émergé.",
    lowerRankedDivider: "Moins statistiquement significatives",
  },
  "zh-Hans": {
    agreementsTitle: "通过",
    disagreementsTitle: "否决",
    agreementsLongTitle: "哪些观点被所有群组{keyword}？",
    disagreementsLongTitle: "哪些观点被所有群组{keyword}？",
    agreementsKeyword: "认可",
    disagreementsKeyword: "否决",
    subtitleAgree:
      "所有意见群组一致同意认可的观点——跨群组共识，而非简单的多数投票。按统计显著性排序。",
    subtitleDisagree:
      "所有意见群组一致同意否决的观点——跨群组共识，而非简单的多数投票。按统计显著性排序。",
    subtitleLoadMoreHint: "全部加载以显示{emphasis}观点。",
    subtitleLoadMoreHintEmphasis: "每个",
    loadMore: "全部加载",
    noAgreementsMessage: "尚未形成共识。",
    noDisagreementsMessage: "尚未形成共识。",
    lowerRankedDivider: "统计显著性较低",
  },
  "zh-Hant": {
    agreementsTitle: "通過",
    disagreementsTitle: "否決",
    agreementsLongTitle: "哪些觀點被所有群組{keyword}？",
    disagreementsLongTitle: "哪些觀點被所有群組{keyword}？",
    agreementsKeyword: "認可",
    disagreementsKeyword: "否決",
    subtitleAgree:
      "所有意見群組一致同意認可的觀點——跨群組共識，而非簡單的多數投票。按統計顯著性排序。",
    subtitleDisagree:
      "所有意見群組一致同意否決的觀點——跨群組共識，而非簡單的多數投票。按統計顯著性排序。",
    subtitleLoadMoreHint: "全部載入以顯示{emphasis}觀點。",
    subtitleLoadMoreHintEmphasis: "每個",
    loadMore: "全部載入",
    noAgreementsMessage: "尚未形成共識。",
    noDisagreementsMessage: "尚未形成共識。",
    lowerRankedDivider: "統計顯著性較低",
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
    subtitleAgree:
      "すべての意見グループが合意して承認した意見です——多数決ではなく、グループ間の合意です。統計的有意性の順に表示。",
    subtitleDisagree:
      "すべての意見グループが合意して否決した意見です——多数決ではなく、グループ間の合意です。統計的有意性の順に表示。",
    subtitleLoadMoreHint: "すべて読み込んで{emphasis}意見を表示。",
    subtitleLoadMoreHintEmphasis: "各",
    loadMore: "すべて読み込む",
    noAgreementsMessage: "まだ合意は形成されていません。",
    noDisagreementsMessage: "まだ合意は形成されていません。",
    lowerRankedDivider: "統計的有意性が低い",
  },
};
