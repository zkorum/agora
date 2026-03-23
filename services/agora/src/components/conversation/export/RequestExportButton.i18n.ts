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
  fa: {
    requestNewExport: "درخواست صادرات جدید",
  },
  fr: {
    requestNewExport: "Demander un Nouvel Export",
  },
  "zh-Hans": {
    requestNewExport: "请求新导出",
  },
  "zh-Hant": {
    requestNewExport: "請求新匯出",
  },
  he: {
    requestNewExport: "בקשת ייצוא חדש",
  },
  ja: {
    requestNewExport: "新しいエクスポートをリクエスト",
  },
  ky: {
    requestNewExport: "Жаңы экспорт суроо",
  },
  ru: {
    requestNewExport: "Запросить новый экспорт",
  },
};
