import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupVisualizationTestTranslations {
  analysisTabTest: string;
  analysisTabTestDescription: string;
  openTestButton: string;
}

export const opinionGroupVisualizationTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupVisualizationTestTranslations
> = {
  en: {
    analysisTabTest: "Analysis Tab Test",
    analysisTabTestDescription:
      "Test the full analysis tabs (Groups, Agreements, Disagreements, Divisive) with configurable cluster count, AI labels, and empty sections.",
    openTestButton: "Open Analysis Test",
  },
  ar: {
    analysisTabTest: "اختبار تبويب التحليل",
    analysisTabTestDescription:
      "اختبر تبويبات التحليل الكاملة (المجموعات، المعتمدة، المرفوضة، المثيرة للجدل) مع إمكانية تعديل عدد المجموعات وتسميات الذكاء الاصطناعي والأقسام الفارغة.",
    openTestButton: "فتح اختبار التحليل",
  },
  es: {
    analysisTabTest: "Prueba de Pestaña de Análisis",
    analysisTabTestDescription:
      "Pruebe las pestañas de análisis completas (Grupos, Aprobadas, Rechazadas, Divisivas) con número de grupos, etiquetas IA y secciones vacías configurables.",
    openTestButton: "Abrir Prueba de Análisis",
  },
  fr: {
    analysisTabTest: "Test de l'Onglet Analyse",
    analysisTabTestDescription:
      "Testez les onglets d'analyse complets (Groupes, Approuvées, Rejetées, Controversées) avec un nombre de groupes, libellés IA et sections vides configurables.",
    openTestButton: "Ouvrir le Test d'Analyse",
  },
  "zh-Hans": {
    analysisTabTest: "分析标签测试",
    analysisTabTestDescription:
      "测试完整的分析标签（群组、通过、否决、分歧），可配置群组数量、AI 标签和空白部分。",
    openTestButton: "打开分析测试",
  },
  "zh-Hant": {
    analysisTabTest: "分析標籤測試",
    analysisTabTestDescription:
      "測試完整的分析標籤（群組、通過、否決、分歧），可配置群組數量、AI 標籤和空白部分。",
    openTestButton: "打開分析測試",
  },
  ja: {
    analysisTabTest: "分析タブテスト",
    analysisTabTestDescription:
      "完全な分析タブ（グループ、承認、否決、分断）をグループ数、AIラベル、空セクションを設定してテストします。",
    openTestButton: "分析テストを開く",
  },
  ky: {
    analysisTabTest: "Анализ өтмөгүн тестирлөө",
    analysisTabTestDescription:
      "Толук анализ өтмөктөрүн (Топтор, Макулдашуулар, Макул эместиктер, Талаштуу) топтордун саны, AI энбелгилери жана бош бөлүмдөр менен тестирлөө.",
    openTestButton: "Анализ тестин ачуу",
  },
  ru: {
    analysisTabTest: "Тест вкладки анализа",
    analysisTabTestDescription:
      "Тестирование полных вкладок анализа (Группы, Согласия, Несогласия, Спорные) с настраиваемым количеством групп, метками ИИ и пустыми разделами.",
    openTestButton: "Открыть тест анализа",
  },
  fa: {
    opinionGroupVisualization: "تجسم گروه‌های نظری",
    opinionGroupVisualizationDescription:
      "Test the OpinionGroupTab component with different cluster configurations to see how it adapts its layout.",
    openVisualizationButton: "باز کردن ابزار تجسم",
  },
};
