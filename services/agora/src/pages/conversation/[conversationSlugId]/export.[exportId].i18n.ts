import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportStatusPageTranslations {
  pageTitle: string;
  backToHistory: string;
}

export const exportStatusPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportStatusPageTranslations
> = {
  en: {
    pageTitle: "Export Status",
    backToHistory: "Back to Export History",
  },
  ar: {
    pageTitle: "حالة التصدير",
    backToHistory: "العودة إلى سجل التصدير",
  },
  es: {
    pageTitle: "Estado de Exportación",
    backToHistory: "Volver al Historial de Exportaciones",
  },
  fr: {
    pageTitle: "État de l'Exportation",
    backToHistory: "Retour à l'Historique des Exportations",
  },
  "zh-Hans": {
    pageTitle: "导出状态",
    backToHistory: "返回导出历史",
  },
  "zh-Hant": {
    pageTitle: "匯出狀態",
    backToHistory: "返回匯出歷史",
  },
  ja: {
    pageTitle: "エクスポートステータス",
    backToHistory: "エクスポート履歴に戻る",
  },
};
