import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisReportTestTranslations {
  analysisReportTest: string;
  controls: string;
  clusterCountLabel: string;
  aiLabelsLabel: string;
  withAiLabels: string;
  withoutAiLabels: string;
  reportPreview: string;
}

export const analysisReportTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisReportTestTranslations
> = {
  en: {
    analysisReportTest: "Analysis Report Test",
    controls: "Controls",
    clusterCountLabel: "Number of Groups",
    aiLabelsLabel: "AI Labels",
    withAiLabels: "With AI Labels",
    withoutAiLabels: "Without AI Labels (A/B/C fallback)",
    reportPreview: "Report Preview",
  },
  ar: {
    analysisReportTest: "اختبار تقرير التحليل",
    controls: "التحكم",
    clusterCountLabel: "عدد المجموعات",
    aiLabelsLabel: "تسميات الذكاء الاصطناعي",
    withAiLabels: "مع تسميات الذكاء الاصطناعي",
    withoutAiLabels: "بدون تسميات (A/B/C)",
    reportPreview: "معاينة التقرير",
  },
  es: {
    analysisReportTest: "Prueba de Informe de Análisis",
    controls: "Controles",
    clusterCountLabel: "Número de Grupos",
    aiLabelsLabel: "Etiquetas IA",
    withAiLabels: "Con Etiquetas IA",
    withoutAiLabels: "Sin Etiquetas (A/B/C)",
    reportPreview: "Vista Previa del Informe",
  },
  fr: {
    analysisReportTest: "Test du Rapport d'Analyse",
    controls: "Contrôles",
    clusterCountLabel: "Nombre de Groupes",
    aiLabelsLabel: "Libellés IA",
    withAiLabels: "Avec Libellés IA",
    withoutAiLabels: "Sans Libellés (A/B/C)",
    reportPreview: "Aperçu du Rapport",
  },
  "zh-Hans": {
    analysisReportTest: "分析报告测试",
    controls: "控制",
    clusterCountLabel: "群组数量",
    aiLabelsLabel: "AI 标签",
    withAiLabels: "带 AI 标签",
    withoutAiLabels: "无标签 (A/B/C)",
    reportPreview: "报告预览",
  },
  "zh-Hant": {
    analysisReportTest: "分析報告測試",
    controls: "控制",
    clusterCountLabel: "群組數量",
    aiLabelsLabel: "AI 標籤",
    withAiLabels: "帶 AI 標籤",
    withoutAiLabels: "無標籤 (A/B/C)",
    reportPreview: "報告預覽",
  },
  ja: {
    analysisReportTest: "分析レポートテスト",
    controls: "コントロール",
    clusterCountLabel: "グループ数",
    aiLabelsLabel: "AIラベル",
    withAiLabels: "AIラベルあり",
    withoutAiLabels: "ラベルなし (A/B/C)",
    reportPreview: "レポートプレビュー",
  },
};
