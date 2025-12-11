import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ActiveImportBannerTranslations {
  message: string;
  viewStatus: string;
}

export const activeImportBannerTranslations: Record<
  SupportedDisplayLanguageCodes,
  ActiveImportBannerTranslations
> = {
  en: {
    message:
      "You have an import in progress. Please wait for it to complete before starting a new one.",
    viewStatus: "View Import Status",
  },
  ar: {
    message:
      "لديك عملية استيراد قيد التقدم. يرجى الانتظار حتى تكتمل قبل بدء عملية جديدة.",
    viewStatus: "عرض حالة الاستيراد",
  },
  es: {
    message:
      "Tiene una importación en progreso. Espere a que se complete antes de iniciar una nueva.",
    viewStatus: "Ver Estado de Importación",
  },
  fr: {
    message:
      "Vous avez une importation en cours. Veuillez attendre qu'elle soit terminée avant d'en démarrer une nouvelle.",
    viewStatus: "Voir l'État de l'Importation",
  },
  "zh-Hans": {
    message: "您有一个正在进行的导入。请等待完成后再开始新的导入。",
    viewStatus: "查看导入状态",
  },
  "zh-Hant": {
    message: "您有一個正在進行的匯入。請等待完成後再開始新的匯入。",
    viewStatus: "查看匯入狀態",
  },
  ja: {
    message:
      "インポートが進行中です。新しいインポートを開始する前に完了するまでお待ちください。",
    viewStatus: "インポート状態を表示",
  },
};
