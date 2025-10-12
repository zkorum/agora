import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface RequestExportButtonTranslations {
  requestNewExport: string;
}

export const requestExportButtonTranslations: Record<
  SupportedDisplayLanguageCodes,
  RequestExportButtonTranslations
> = {
  en: {
    requestNewExport: "Request New Export",
  },
  ar: {
    requestNewExport: "طلب تصدير جديد",
  },
  es: {
    requestNewExport: "Solicitar Nueva Exportación",
  },
  fr: {
    requestNewExport: "Demander une Nouvelle Exportation",
  },
  "zh-Hans": {
    requestNewExport: "请求新导出",
  },
  "zh-Hant": {
    requestNewExport: "請求新匯出",
  },
  ja: {
    requestNewExport: "新しいエクスポートをリクエスト",
  },
};
