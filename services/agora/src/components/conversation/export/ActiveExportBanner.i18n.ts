import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ActiveExportBannerTranslations {
  message: string;
  viewStatus: string;
}

export const activeExportBannerTranslations: Record<
  SupportedDisplayLanguageCodes,
  ActiveExportBannerTranslations
> = {
  en: {
    message:
      "You have an export in progress. Please wait for it to complete before starting a new one.",
    viewStatus: "View Export Status",
  },
  ar: {
    message:
      "لديك عملية تصدير قيد التقدم. يرجى الانتظار حتى تكتمل قبل بدء عملية جديدة.",
    viewStatus: "عرض حالة التصدير",
  },
  es: {
    message:
      "Tiene una exportación en progreso. Espere a que se complete antes de iniciar una nueva.",
    viewStatus: "Ver Estado de Exportación",
  },
  fr: {
    message:
      "Vous avez une exportation en cours. Veuillez attendre qu'elle soit terminée avant d'en démarrer une nouvelle.",
    viewStatus: "Voir l'État de l'Exportation",
  },
  "zh-Hans": {
    message: "您有一个正在进行的导出。请等待完成后再开始新的导出。",
    viewStatus: "查看导出状态",
  },
  "zh-Hant": {
    message: "您有一個正在進行的匯出。請等待完成後再開始新的匯出。",
    viewStatus: "查看匯出狀態",
  },
  ja: {
    message:
      "エクスポートが進行中です。新しいエクスポートを開始する前に完了するまでお待ちください。",
    viewStatus: "エクスポート状態を表示",
  },
};
