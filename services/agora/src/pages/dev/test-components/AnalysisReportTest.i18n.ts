import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisReportTestTranslations {
  analysisReportTest: string;
  analysisReportTestDescription: string;
  openReportTestButton: string;
}

export const analysisReportTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisReportTestTranslations
> = {
  en: {
    analysisReportTest: "Analysis Report",
    analysisReportTestDescription:
      "Test the analysis report layout with different numbers of opinion groups and AI label configurations.",
    openReportTestButton: "Open Report Test",
  },
  ar: {
    analysisReportTest: "تقرير التحليل",
    analysisReportTestDescription:
      "اختبار تخطيط تقرير التحليل مع أعداد مختلفة من مجموعات الرأي وتكوينات تسميات الذكاء الاصطناعي.",
    openReportTestButton: "فتح اختبار التقرير",
  },
  es: {
    analysisReportTest: "Informe de Análisis",
    analysisReportTestDescription:
      "Probar el diseño del informe de análisis con diferentes números de grupos de opinión y configuraciones de etiquetas IA.",
    openReportTestButton: "Abrir Prueba de Informe",
  },
  fr: {
    analysisReportTest: "Rapport d'Analyse",
    analysisReportTestDescription:
      "Tester la mise en page du rapport d'analyse avec différents nombres de groupes d'opinion et configurations de libellés IA.",
    openReportTestButton: "Ouvrir le Test du Rapport",
  },
  "zh-Hans": {
    analysisReportTest: "分析报告",
    analysisReportTestDescription:
      "测试具有不同意见群组数量和 AI 标签配置的分析报告布局。",
    openReportTestButton: "打开报告测试",
  },
  "zh-Hant": {
    analysisReportTest: "分析報告",
    analysisReportTestDescription:
      "測試具有不同意見群組數量和 AI 標籤配置的分析報告佈局。",
    openReportTestButton: "打開報告測試",
  },
  ja: {
    analysisReportTest: "分析レポート",
    analysisReportTestDescription:
      "異なる意見グループ数とAIラベル設定で分析レポートのレイアウトをテスト。",
    openReportTestButton: "レポートテストを開く",
  },
};
