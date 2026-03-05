import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupVisualizationTranslations {
  analysisTabTest: string;
  controls: string;
  clusterCountLabel: string;
  aiLabelsLabel: string;
  withAiLabels: string;
  withoutAiLabels: string;
  emptySectionsLabel: string;
  emptySectionsNone: string;
  emptySectionsAll: string;
  emptySectionsAgreements: string;
  emptySectionsDisagreements: string;
  emptySectionsDivisive: string;
  clusterCount0: string;
  clusterCount1: string;
  clusterCount2: string;
  clusterCount3: string;
  clusterCount4: string;
  clusterCount5: string;
  clusterCount6: string;
  analysisPreview: string;
}

export const opinionGroupVisualizationTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupVisualizationTranslations
> = {
  en: {
    analysisTabTest: "Analysis Tab Test",
    controls: "Controls",
    clusterCountLabel: "Number of Groups",
    aiLabelsLabel: "AI Labels",
    withAiLabels: "With AI Labels",
    withoutAiLabels: "Without AI Labels (A/B/C fallback)",
    emptySectionsLabel: "Empty Sections",
    emptySectionsNone: "All sections have data",
    emptySectionsAll: "All sections empty",
    emptySectionsAgreements: "No agreements",
    emptySectionsDisagreements: "No disagreements",
    emptySectionsDivisive: "No divisive",
    clusterCount0: "0 Groups",
    clusterCount1: "1 Group",
    clusterCount2: "2 Groups",
    clusterCount3: "3 Groups",
    clusterCount4: "4 Groups",
    clusterCount5: "5 Groups",
    clusterCount6: "6 Groups",
    analysisPreview: "Analysis Preview",
  },
  ar: {
    analysisTabTest: "اختبار تبويب التحليل",
    controls: "التحكم",
    clusterCountLabel: "عدد المجموعات",
    aiLabelsLabel: "تسميات الذكاء الاصطناعي",
    withAiLabels: "مع تسميات الذكاء الاصطناعي",
    withoutAiLabels: "بدون تسميات (A/B/C)",
    emptySectionsLabel: "أقسام فارغة",
    emptySectionsNone: "جميع الأقسام تحتوي على بيانات",
    emptySectionsAll: "جميع الأقسام فارغة",
    emptySectionsAgreements: "لا توجد مقترحات معتمدة",
    emptySectionsDisagreements: "لا توجد مقترحات مرفوضة",
    emptySectionsDivisive: "لا توجد مقترحات مثيرة للجدل",
    clusterCount0: "بدون مجموعات",
    clusterCount1: "مجموعة واحدة",
    clusterCount2: "مجموعتان",
    clusterCount3: "3 مجموعات",
    clusterCount4: "4 مجموعات",
    clusterCount5: "5 مجموعات",
    clusterCount6: "6 مجموعات",
    analysisPreview: "معاينة التحليل",
  },
  es: {
    analysisTabTest: "Prueba de Pestaña de Análisis",
    controls: "Controles",
    clusterCountLabel: "Número de Grupos",
    aiLabelsLabel: "Etiquetas IA",
    withAiLabels: "Con Etiquetas IA",
    withoutAiLabels: "Sin Etiquetas (A/B/C)",
    emptySectionsLabel: "Secciones Vacías",
    emptySectionsNone: "Todas las secciones con datos",
    emptySectionsAll: "Todas las secciones vacías",
    emptySectionsAgreements: "Sin proposiciones aprobadas",
    emptySectionsDisagreements: "Sin proposiciones rechazadas",
    emptySectionsDivisive: "Sin proposiciones divisivas",
    clusterCount0: "0 Grupos",
    clusterCount1: "1 Grupo",
    clusterCount2: "2 Grupos",
    clusterCount3: "3 Grupos",
    clusterCount4: "4 Grupos",
    clusterCount5: "5 Grupos",
    clusterCount6: "6 Grupos",
    analysisPreview: "Vista Previa del Análisis",
  },
  fr: {
    analysisTabTest: "Test de l'Onglet Analyse",
    controls: "Contrôles",
    clusterCountLabel: "Nombre de Groupes",
    aiLabelsLabel: "Libellés IA",
    withAiLabels: "Avec Libellés IA",
    withoutAiLabels: "Sans Libellés (A/B/C)",
    emptySectionsLabel: "Sections Vides",
    emptySectionsNone: "Toutes les sections remplies",
    emptySectionsAll: "Toutes les sections vides",
    emptySectionsAgreements: "Aucune proposition approuvée",
    emptySectionsDisagreements: "Aucune proposition rejetée",
    emptySectionsDivisive: "Aucune proposition controversée",
    clusterCount0: "0 Groupes",
    clusterCount1: "1 Groupe",
    clusterCount2: "2 Groupes",
    clusterCount3: "3 Groupes",
    clusterCount4: "4 Groupes",
    clusterCount5: "5 Groupes",
    clusterCount6: "6 Groupes",
    analysisPreview: "Aperçu de l'Analyse",
  },
  "zh-Hans": {
    analysisTabTest: "分析标签测试",
    controls: "控制",
    clusterCountLabel: "群组数量",
    aiLabelsLabel: "AI 标签",
    withAiLabels: "带 AI 标签",
    withoutAiLabels: "无标签 (A/B/C)",
    emptySectionsLabel: "空白部分",
    emptySectionsNone: "所有部分都有数据",
    emptySectionsAll: "所有部分为空",
    emptySectionsAgreements: "无通过的观点",
    emptySectionsDisagreements: "无否决的观点",
    emptySectionsDivisive: "无分歧的观点",
    clusterCount0: "无群组",
    clusterCount1: "1 个群组",
    clusterCount2: "2 个群组",
    clusterCount3: "3 个群组",
    clusterCount4: "4 个群组",
    clusterCount5: "5 个群组",
    clusterCount6: "6 个群组",
    analysisPreview: "分析预览",
  },
  "zh-Hant": {
    analysisTabTest: "分析標籤測試",
    controls: "控制",
    clusterCountLabel: "群組數量",
    aiLabelsLabel: "AI 標籤",
    withAiLabels: "帶 AI 標籤",
    withoutAiLabels: "無標籤 (A/B/C)",
    emptySectionsLabel: "空白部分",
    emptySectionsNone: "所有部分都有資料",
    emptySectionsAll: "所有部分為空",
    emptySectionsAgreements: "無通過的觀點",
    emptySectionsDisagreements: "無否決的觀點",
    emptySectionsDivisive: "無分歧的觀點",
    clusterCount0: "無群組",
    clusterCount1: "1 個群組",
    clusterCount2: "2 個群組",
    clusterCount3: "3 個群組",
    clusterCount4: "4 個群組",
    clusterCount5: "5 個群組",
    clusterCount6: "6 個群組",
    analysisPreview: "分析預覽",
  },
  ja: {
    analysisTabTest: "分析タブテスト",
    controls: "コントロール",
    clusterCountLabel: "グループ数",
    aiLabelsLabel: "AIラベル",
    withAiLabels: "AIラベルあり",
    withoutAiLabels: "ラベルなし (A/B/C)",
    emptySectionsLabel: "空のセクション",
    emptySectionsNone: "全セクションにデータあり",
    emptySectionsAll: "全セクション空",
    emptySectionsAgreements: "承認された意見なし",
    emptySectionsDisagreements: "否決された意見なし",
    emptySectionsDivisive: "分断的な意見なし",
    clusterCount0: "グループなし",
    clusterCount1: "1 グループ",
    clusterCount2: "2 グループ",
    clusterCount3: "3 グループ",
    clusterCount4: "4 グループ",
    clusterCount5: "5 グループ",
    clusterCount6: "6 グループ",
    analysisPreview: "分析プレビュー",
  },
};
