import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisReportTranslations {
  summary: string;
  agreements: string;
  disagreements: string;
  divisive: string;
  agreementsLong: string;
  disagreementsLong: string;
  divisiveLong: string;
  agreementsSubtitle: string;
  disagreementsSubtitle: string;
  divisiveSubtitle: string;
  noAgreementsMessage: string;
  noDisagreementsMessage: string;
  noDivisiveMessage: string;
}

export const analysisReportTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisReportTranslations
> = {
  en: {
    summary: "Summary",
    agreements: "Approved",
    disagreements: "Rejected",
    divisive: "Divisive",
    agreementsLong: "Which statements are approved by all groups?",
    disagreementsLong: "Which statements are rejected by all groups?",
    divisiveLong: "What divides people across groups?",
    agreementsSubtitle: "Cross-group consensus, not simple majority. Only the most statistically significant are shown.",
    disagreementsSubtitle: "Cross-group consensus, not simple majority. Only the most statistically significant are shown.",
    divisiveSubtitle: "Statements that split opinion groups against each other. Only the most statistically significant are shown.",
    noAgreementsMessage: "No consensus has emerged yet.",
    noDisagreementsMessage: "No consensus has emerged yet.",
    noDivisiveMessage: "No significant divisive statements found yet.",
  },
  ar: {
    summary: "ملخص",
    agreements: "معتمدة",
    disagreements: "مرفوضة",
    divisive: "مثير للجدل",
    agreementsLong: "ما المقترحات المعتمدة من جميع المجموعات؟",
    disagreementsLong: "ما المقترحات المرفوضة من جميع المجموعات؟",
    divisiveLong: "ما الذي يقسم المشاركين عبر مجموعات الرأي؟",
    agreementsSubtitle: "إجماع بين المجموعات وليس أغلبية بسيطة. تُعرض فقط الأكثر دلالة إحصائياً.",
    disagreementsSubtitle: "إجماع بين المجموعات وليس أغلبية بسيطة. تُعرض فقط الأكثر دلالة إحصائياً.",
    divisiveSubtitle: "مقترحات تفرّق مجموعات الرأي. تُعرض فقط الأكثر دلالة إحصائياً.",
    noAgreementsMessage: "لم يظهر أي إجماع بعد.",
    noDisagreementsMessage: "لم يظهر أي إجماع بعد.",
    noDivisiveMessage: "لم يتم العثور على مقترحات مثيرة للجدل ذات دلالة بعد.",
  },
  es: {
    summary: "Resumen",
    agreements: "Aprobados",
    disagreements: "Rechazados",
    divisive: "Divisivo",
    agreementsLong: "¿Qué afirmaciones son aprobadas por todos los grupos?",
    disagreementsLong: "¿Qué afirmaciones son rechazadas por todos los grupos?",
    divisiveLong: "¿Qué divide a los participantes entre los grupos de opinión?",
    agreementsSubtitle: "Consenso entre grupos, no una mayoría simple. Solo se muestran las más significativas estadísticamente.",
    disagreementsSubtitle: "Consenso entre grupos, no una mayoría simple. Solo se muestran las más significativas estadísticamente.",
    divisiveSubtitle: "Afirmaciones que dividen a los grupos de opinión entre sí. Solo se muestran las más significativas estadísticamente.",
    noAgreementsMessage: "Aún no ha surgido ningún consenso.",
    noDisagreementsMessage: "Aún no ha surgido ningún consenso.",
    noDivisiveMessage: "Aún no se encontraron proposiciones divisivas significativas.",
  },
  fr: {
    summary: "Résumé",
    agreements: "Approuvés",
    disagreements: "Rejetés",
    divisive: "Controversé",
    agreementsLong: "Quelles propositions sont approuvées par tous les groupes ?",
    disagreementsLong: "Quelles propositions sont rejetées par tous les groupes ?",
    divisiveLong: "Qu'est-ce qui divise les participants entre les groupes d'opinion ?",
    agreementsSubtitle: "Consensus entre groupes, pas une simple majorité. Seules les plus significatives statistiquement sont affichées.",
    disagreementsSubtitle: "Consensus entre groupes, pas une simple majorité. Seules les plus significatives statistiquement sont affichées.",
    divisiveSubtitle: "Propositions qui divisent les groupes d'opinion entre eux. Seules les plus significatives statistiquement sont affichées.",
    noAgreementsMessage: "Aucun consensus n'a encore émergé.",
    noDisagreementsMessage: "Aucun consensus n'a encore émergé.",
    noDivisiveMessage: "Aucune proposition controversée significative trouvée pour le moment.",
  },
  "zh-Hans": {
    summary: "摘要",
    agreements: "通过",
    disagreements: "否决",
    divisive: "分歧",
    agreementsLong: "哪些观点被所有群组认可？",
    disagreementsLong: "哪些观点被所有群组否决？",
    divisiveLong: "什么使参与者在各意见群组之间产生分歧？",
    agreementsSubtitle: "跨群组共识，非简单多数。仅显示统计上最显著的结果。",
    disagreementsSubtitle: "跨群组共识，非简单多数。仅显示统计上最显著的结果。",
    divisiveSubtitle: "使意见群组相互对立的观点。仅显示统计上最显著的结果。",
    noAgreementsMessage: "尚未形成共识。",
    noDisagreementsMessage: "尚未形成共识。",
    noDivisiveMessage: "尚未找到显著的分歧观点。",
  },
  "zh-Hant": {
    summary: "摘要",
    agreements: "通過",
    disagreements: "否決",
    divisive: "分歧",
    agreementsLong: "哪些觀點被所有群組認可？",
    disagreementsLong: "哪些觀點被所有群組否決？",
    divisiveLong: "什麼使參與者在各意見群組之間產生分歧？",
    agreementsSubtitle: "跨群組共識，非簡單多數。僅顯示統計上最顯著的結果。",
    disagreementsSubtitle: "跨群組共識，非簡單多數。僅顯示統計上最顯著的結果。",
    divisiveSubtitle: "使意見群組相互對立的觀點。僅顯示統計上最顯著的結果。",
    noAgreementsMessage: "尚未形成共識。",
    noDisagreementsMessage: "尚未形成共識。",
    noDivisiveMessage: "尚未找到顯著的分歧觀點。",
  },
  ja: {
    summary: "概要",
    agreements: "承認",
    disagreements: "否決",
    divisive: "分断",
    agreementsLong: "すべてのグループに承認された意見は？",
    disagreementsLong: "すべてのグループに否決された意見は？",
    divisiveLong: "意見グループ間で参加者を分断しているものは何ですか？",
    agreementsSubtitle: "グループ間の合意であり、単純多数決ではありません。統計的に最も有意なもののみ表示されます。",
    disagreementsSubtitle: "グループ間の合意であり、単純多数決ではありません。統計的に最も有意なもののみ表示されます。",
    divisiveSubtitle: "意見グループを対立させる意見。統計的に最も有意なもののみ表示されます。",
    noAgreementsMessage: "まだ合意は形成されていません。",
    noDisagreementsMessage: "まだ合意は形成されていません。",
    noDivisiveMessage: "有意な分断的主張はまだ見つかりません。",
  },
  ky: {
    summary: "Корутунду",
    agreements: "Жактырылган",
    disagreements: "Четке кагылган",
    divisive: "Талаштуу",
    agreementsLong: "Кайсы пикирлер бардык топтор тарабынан жактырылган?",
    disagreementsLong: "Кайсы пикирлер бардык топтор тарабынан четке кагылган?",
    divisiveLong: "Топтор аралык катышуучуларды эмне бөлөт?",
    agreementsSubtitle: "Топтор аралык консенсус, жөнөкөй көпчүлүк эмес. Статистикалык жактан эң маанилүүлөрү гана көрсөтүлөт.",
    disagreementsSubtitle: "Топтор аралык консенсус, жөнөкөй көпчүлүк эмес. Статистикалык жактан эң маанилүүлөрү гана көрсөтүлөт.",
    divisiveSubtitle: "Пикир топторун бири-бирине каршы коюучу пикирлер. Статистикалык жактан эң маанилүүлөрү гана көрсөтүлөт.",
    noAgreementsMessage: "Азырынча консенсус түзүлө элек.",
    noDisagreementsMessage: "Азырынча консенсус түзүлө элек.",
    noDivisiveMessage: "Азырынча маанилүү талаштуу пикирлер табылган жок.",
  },
  ru: {
    summary: "Сводка",
    agreements: "Одобрено",
    disagreements: "Отклонено",
    divisive: "Спорные",
    agreementsLong: "Какие высказывания одобрены всеми группами?",
    disagreementsLong: "Какие высказывания отклонены всеми группами?",
    divisiveLong: "Что разделяет участников между группами?",
    agreementsSubtitle: "Межгрупповой консенсус, а не простое большинство. Показаны только наиболее статистически значимые.",
    disagreementsSubtitle: "Межгрупповой консенсус, а не простое большинство. Показаны только наиболее статистически значимые.",
    divisiveSubtitle: "Высказывания, по которым группы мнений расходятся. Показаны только наиболее статистически значимые.",
    noAgreementsMessage: "Консенсус пока не сформирован.",
    noDisagreementsMessage: "Консенсус пока не сформирован.",
    noDivisiveMessage: "Значимых спорных высказываний пока не найдено.",
  },
};
