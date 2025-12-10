import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CsvErrorDetailsDialogTranslations {
  dialogTitle: string;
  helpText: string;
  supportTextPrefix: string;
  supportLinkText: string;
  supportTextSuffix: string;
  close: string;
}

export const csvErrorDetailsDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  CsvErrorDetailsDialogTranslations
> = {
  en: {
    dialogTitle: "Error Details",
    helpText: "Please double-check your CSV file format.",
    supportTextPrefix: "If something seems wrong, please contact us on ",
    supportLinkText: "Discord",
    supportTextSuffix: " for support.",
    close: "Close",
  },
  ar: {
    dialogTitle: "تفاصيل الخطأ",
    helpText: "يرجى التحقق مرة أخرى من تنسيق ملف CSV الخاص بك.",
    supportTextPrefix: "إذا كان هناك شيء يبدو خاطئًا، يرجى الاتصال بنا على ",
    supportLinkText: "Discord",
    supportTextSuffix: " للحصول على الدعم.",
    close: "إغلاق",
  },
  es: {
    dialogTitle: "Detalles del Error",
    helpText: "Por favor, verifique el formato de su archivo CSV.",
    supportTextPrefix: "Si algo parece incorrecto, contáctenos en ",
    supportLinkText: "Discord",
    supportTextSuffix: " para obtener soporte.",
    close: "Cerrar",
  },
  fr: {
    dialogTitle: "Détails de l'Erreur",
    helpText: "Veuillez vérifier le format de votre fichier CSV.",
    supportTextPrefix:
      "Si quelque chose semble incorrect, veuillez nous contacter sur ",
    supportLinkText: "Discord",
    supportTextSuffix: " pour obtenir de l'aide.",
    close: "Fermer",
  },
  "zh-Hans": {
    dialogTitle: "错误详情",
    helpText: "请仔细检查您的 CSV 文件格式。",
    supportTextPrefix: "如果发现问题，请通过 ",
    supportLinkText: "Discord",
    supportTextSuffix: " 联系我们获取支持。",
    close: "关闭",
  },
  "zh-Hant": {
    dialogTitle: "錯誤詳情",
    helpText: "請仔細檢查您的 CSV 檔案格式。",
    supportTextPrefix: "如果發現問題，請透過 ",
    supportLinkText: "Discord",
    supportTextSuffix: " 聯繫我們獲取支援。",
    close: "關閉",
  },
  ja: {
    dialogTitle: "エラー詳細",
    helpText: "CSV ファイル形式を再確認してください。",
    supportTextPrefix: "何か問題があれば、",
    supportLinkText: "Discord",
    supportTextSuffix: " でサポートにご連絡ください。",
    close: "閉じる",
  },
};
