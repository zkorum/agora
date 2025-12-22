import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportStatusPageTranslations {
  pageTitle: string;
  exportFeatureDisabled: string;
}

export const exportStatusPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportStatusPageTranslations
> = {
  en: {
    pageTitle: "Export Status",
    exportFeatureDisabled: "Export feature is disabled",
  },
  ar: {
    pageTitle: "حالة التصدير",
    exportFeatureDisabled: "ميزة التصدير معطلة",
  },
  es: {
    pageTitle: "Estado de Exportación",
    exportFeatureDisabled: "La función de exportación está deshabilitada",
  },
  fr: {
    pageTitle: "État de l'Exportation",
    exportFeatureDisabled: "La fonction d'exportation est désactivée",
  },
  "zh-Hans": {
    pageTitle: "导出状态",
    exportFeatureDisabled: "导出功能已禁用",
  },
  "zh-Hant": {
    pageTitle: "匯出狀態",
    exportFeatureDisabled: "匯出功能已停用",
  },
  ja: {
    pageTitle: "エクスポートステータス",
    exportFeatureDisabled: "エクスポート機能は無効です",
  },
};
