import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisPageTranslations {
  loadingAnalysis: string;
  retryingAnalysis: string;
  analysisErrorTitle: string;
  analysisErrorMessage: string;
  noAnalysisData: string;
  retryAnalysis: string;
}

export const analysisPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisPageTranslations
> = {
  en: {
    loadingAnalysis: "Loading analysis...",
    retryingAnalysis: "Retrying to load analysis...",
    analysisErrorTitle: "Failed to load analysis",
    analysisErrorMessage: "Unable to load the analysis data. Please try again.",
    noAnalysisData: "Analysis data is not available for this conversation",
    retryAnalysis: "Retry loading",
  },
  ar: {
    loadingAnalysis: "جاري تحميل التحليل...",
    retryingAnalysis: "جاري إعادة محاولة تحميل التحليل...",
    analysisErrorTitle: "فشل في تحميل التحليل",
    analysisErrorMessage:
      "غير قادر على تحميل بيانات التحليل. يرجى المحاولة مرة أخرى.",
    noAnalysisData: "بيانات التحليل غير متاحة لهذه المحادثة",
    retryAnalysis: "إعادة المحاولة",
  },
  es: {
    loadingAnalysis: "Cargando análisis...",
    retryingAnalysis: "Reintentando cargar análisis...",
    analysisErrorTitle: "Error al cargar el análisis",
    analysisErrorMessage:
      "No se pudieron cargar los datos del análisis. Inténtalo de nuevo.",
    noAnalysisData:
      "Los datos de análisis no están disponibles para esta conversación",
    retryAnalysis: "Reintentar carga",
  },
  fr: {
    loadingAnalysis: "Chargement de l'analyse...",
    retryingAnalysis: "Nouvelle tentative de chargement de l'analyse...",
    analysisErrorTitle: "Échec du chargement de l'analyse",
    analysisErrorMessage:
      "Impossible de charger les données d'analyse. Veuillez réessayer.",
    noAnalysisData:
      "Les données d'analyse ne sont pas disponibles pour cette conversation",
    retryAnalysis: "Réessayer le chargement",
  },
  "zh-Hans": {
    loadingAnalysis: "正在加载分析...",
    retryingAnalysis: "正在重试加载分析...",
    analysisErrorTitle: "分析加载失败",
    analysisErrorMessage: "无法加载分析数据。请重试。",
    noAnalysisData: "此对话没有可用的分析数据",
    retryAnalysis: "重试加载",
  },
  "zh-Hant": {
    loadingAnalysis: "正在載入分析...",
    retryingAnalysis: "正在重試載入分析...",
    analysisErrorTitle: "分析載入失敗",
    analysisErrorMessage: "無法載入分析資料。請重試。",
    noAnalysisData: "此對話沒有可用的分析資料",
    retryAnalysis: "重試載入",
  },
  ja: {
    loadingAnalysis: "分析を読み込み中...",
    retryingAnalysis: "分析の読み込みを再試行中...",
    analysisErrorTitle: "分析の読み込みに失敗しました",
    analysisErrorMessage:
      "分析データを読み込めませんでした。もう一度お試しください。",
    noAnalysisData: "この会話の分析データは利用できません",
    retryAnalysis: "読み込み再試行",
  },
};
