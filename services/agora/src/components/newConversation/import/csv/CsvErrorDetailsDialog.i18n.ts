import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CsvErrorDetailsDialogTranslations {
  dialogTitle: string;
  helpText: string;
  supportTextPrefix: string;
  supportLinkText: string;
  supportTextSuffix: string;
  copyError: string;
  errorCopied: string;
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
    copyError: "Copy Error",
    errorCopied: "Error message copied to clipboard",
    close: "Close",
  },
  ar: {
    dialogTitle: "تفاصيل الخطأ",
    helpText: "يرجى التحقق مرة أخرى من تنسيق ملف CSV الخاص بك.",
    supportTextPrefix: "إذا كان هناك شيء يبدو خاطئًا، يرجى الاتصال بنا على ",
    supportLinkText: "Discord",
    supportTextSuffix: " للحصول على الدعم.",
    copyError: "نسخ الخطأ",
    errorCopied: "تم نسخ رسالة الخطأ إلى الحافظة",
    close: "إغلاق",
  },
  es: {
    dialogTitle: "Detalles del Error",
    helpText: "Por favor, verifique el formato de su archivo CSV.",
    supportTextPrefix: "Si algo parece incorrecto, contáctenos en ",
    supportLinkText: "Discord",
    supportTextSuffix: " para obtener soporte.",
    copyError: "Copiar Error",
    errorCopied: "Mensaje de error copiado al portapapeles",
    close: "Cerrar",
  },
  fr: {
    dialogTitle: "Détails de l'Erreur",
    helpText: "Veuillez vérifier le format de votre fichier CSV.",
    supportTextPrefix:
      "Si quelque chose semble incorrect, veuillez nous contacter sur ",
    supportLinkText: "Discord",
    supportTextSuffix: " pour obtenir de l'aide.",
    copyError: "Copier l'Erreur",
    errorCopied: "Message d'erreur copié dans le presse-papiers",
    close: "Fermer",
  },
  "zh-Hans": {
    dialogTitle: "错误详情",
    helpText: "请仔细检查您的 CSV 文件格式。",
    supportTextPrefix: "如果发现问题，请通过 ",
    supportLinkText: "Discord",
    supportTextSuffix: " 联系我们获取支持。",
    copyError: "复制错误",
    errorCopied: "错误信息已复制到剪贴板",
    close: "关闭",
  },
  "zh-Hant": {
    dialogTitle: "錯誤詳情",
    helpText: "請仔細檢查您的 CSV 檔案格式。",
    supportTextPrefix: "如果發現問題，請透過 ",
    supportLinkText: "Discord",
    supportTextSuffix: " 聯繫我們獲取支援。",
    copyError: "複製錯誤",
    errorCopied: "錯誤訊息已複製到剪貼簿",
    close: "關閉",
  },
  ja: {
    dialogTitle: "エラー詳細",
    helpText: "CSV ファイル形式を再確認してください。",
    supportTextPrefix: "何か問題があれば、",
    supportLinkText: "Discord",
    supportTextSuffix: " でサポートにご連絡ください。",
    copyError: "エラーをコピー",
    errorCopied: "エラーメッセージをクリップボードにコピーしました",
    close: "閉じる",
  },
};
