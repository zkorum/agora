import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportStatusPageTranslations {
  pageTitle: string;
}

export const exportStatusPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportStatusPageTranslations
> = {
  en: {
    pageTitle: "Export Status",
  },
  ar: {
    pageTitle: "حالة التصدير",
  },
  es: {
    pageTitle: "Estado de Exportación",
  },
  fr: {
    pageTitle: "État de l'Exportation",
  },
  "zh-Hans": {
    pageTitle: "导出状态",
  },
  "zh-Hant": {
    pageTitle: "匯出狀態",
  },
  ja: {
    pageTitle: "エクスポートステータス",
  },
};
