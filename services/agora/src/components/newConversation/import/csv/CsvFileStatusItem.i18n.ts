import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CsvFileStatusItemTranslations {
  statusPending: string;
  statusUploaded: string;
  statusValidating: string;
  statusError: string;
  removeFile: string;
  removeFileAriaLabel: string;
  viewDetails: string;
}

export const csvFileStatusItemTranslations: Record<
  SupportedDisplayLanguageCodes,
  CsvFileStatusItemTranslations
> = {
  en: {
    statusPending: "Waiting for file",
    statusUploaded: "Uploaded successfully",
    statusValidating: "Validating...",
    statusError: "Error",
    removeFile: "Remove",
    removeFileAriaLabel: "Remove {fileName}",
    viewDetails: "View Details",
  },
  ar: {
    statusPending: "في انتظار الملف",
    statusUploaded: "تم التحميل بنجاح",
    statusValidating: "جارٍ التحقق...",
    statusError: "خطأ",
    removeFile: "إزالة",
    removeFileAriaLabel: "إزالة {fileName}",
    viewDetails: "عرض التفاصيل",
  },
  es: {
    statusPending: "Esperando archivo",
    statusUploaded: "Subido exitosamente",
    statusValidating: "Validando...",
    statusError: "Error",
    removeFile: "Eliminar",
    removeFileAriaLabel: "Eliminar {fileName}",
    viewDetails: "Ver Detalles",
  },
  fr: {
    statusPending: "En attente du fichier",
    statusUploaded: "Téléchargé avec succès",
    statusValidating: "Validation en cours...",
    statusError: "Erreur",
    removeFile: "Supprimer",
    removeFileAriaLabel: "Supprimer {fileName}",
    viewDetails: "Voir les Détails",
  },
  "zh-Hans": {
    statusPending: "等待文件",
    statusUploaded: "上传成功",
    statusValidating: "验证中...",
    statusError: "错误",
    removeFile: "移除",
    removeFileAriaLabel: "移除 {fileName}",
    viewDetails: "查看详情",
  },
  "zh-Hant": {
    statusPending: "等待檔案",
    statusUploaded: "上傳成功",
    statusValidating: "驗證中...",
    statusError: "錯誤",
    removeFile: "移除",
    removeFileAriaLabel: "移除 {fileName}",
    viewDetails: "檢視詳情",
  },
  ja: {
    statusPending: "ファイル待ち",
    statusUploaded: "アップロード成功",
    statusValidating: "検証中...",
    statusError: "エラー",
    removeFile: "削除",
    removeFileAriaLabel: "{fileName}を削除",
    viewDetails: "詳細を見る",
  },
};
