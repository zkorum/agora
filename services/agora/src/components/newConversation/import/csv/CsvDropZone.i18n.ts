import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CsvDropZoneTranslations {
  statusPending: string;
  statusUploaded: string;
  statusValidating: string;
  statusError: string;
  viewDetails: string;
  remove: string;
  ariaViewDetails: string;
  ariaRemove: string;
}

export const csvDropZoneTranslations: Record<
  SupportedDisplayLanguageCodes,
  CsvDropZoneTranslations
> = {
  en: {
    statusPending: "Pending",
    statusUploaded: "Uploaded",
    statusValidating: "Validating",
    statusError: "Error",
    viewDetails: "View Details",
    remove: "Remove",
    ariaViewDetails: "View error details for {fileName}",
    ariaRemove: "Remove file {fileName}",
  },
  ar: {
    statusPending: "قيد الانتظار",
    statusUploaded: "تم الرفع",
    statusValidating: "جارٍ التحقق",
    statusError: "خطأ",
    viewDetails: "عرض التفاصيل",
    remove: "إزالة",
    ariaViewDetails: "عرض تفاصيل الخطأ لـ {fileName}",
    ariaRemove: "إزالة الملف {fileName}",
  },
  es: {
    statusPending: "Pendiente",
    statusUploaded: "Subido",
    statusValidating: "Validando",
    statusError: "Error",
    viewDetails: "Ver Detalles",
    remove: "Eliminar",
    ariaViewDetails: "Ver detalles del error para {fileName}",
    ariaRemove: "Eliminar archivo {fileName}",
  },
  fr: {
    statusPending: "En attente",
    statusUploaded: "Téléchargé",
    statusValidating: "Validation",
    statusError: "Erreur",
    viewDetails: "Voir les Détails",
    remove: "Supprimer",
    ariaViewDetails: "Voir les détails de l'erreur pour {fileName}",
    ariaRemove: "Supprimer le fichier {fileName}",
  },
  "zh-Hans": {
    statusPending: "等待中",
    statusUploaded: "已上传",
    statusValidating: "验证中",
    statusError: "错误",
    viewDetails: "查看详情",
    remove: "移除",
    ariaViewDetails: "查看 {fileName} 的错误详情",
    ariaRemove: "移除文件 {fileName}",
  },
  "zh-Hant": {
    statusPending: "等待中",
    statusUploaded: "已上傳",
    statusValidating: "驗證中",
    statusError: "錯誤",
    viewDetails: "查看詳情",
    remove: "移除",
    ariaViewDetails: "查看 {fileName} 的錯誤詳情",
    ariaRemove: "移除檔案 {fileName}",
  },
  ja: {
    statusPending: "保留中",
    statusUploaded: "アップロード済み",
    statusValidating: "検証中",
    statusError: "エラー",
    viewDetails: "詳細を表示",
    remove: "削除",
    ariaViewDetails: "{fileName} のエラー詳細を表示",
    ariaRemove: "ファイル {fileName} を削除",
  },
};
