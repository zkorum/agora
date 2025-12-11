import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ImportStatusPageTranslations {
  pageTitle: string;
}

export const importStatusPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ImportStatusPageTranslations
> = {
  en: {
    pageTitle: "Import Status",
  },
  ar: {
    pageTitle: "حالة الاستيراد",
  },
  es: {
    pageTitle: "Estado de Importación",
  },
  fr: {
    pageTitle: "État de l'Importation",
  },
  "zh-Hans": {
    pageTitle: "导入状态",
  },
  "zh-Hant": {
    pageTitle: "匯入狀態",
  },
  ja: {
    pageTitle: "インポートステータス",
  },
};
