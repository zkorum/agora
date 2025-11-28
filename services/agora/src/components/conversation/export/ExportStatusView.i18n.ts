import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportStatusViewTranslations {
  loadingStatus: string;
  errorLoadingStatus: string;
  processingMessage: string;
  failedMessage: string;
  cancelledMessage: string;
  expiredMessage: string;
  expiredDeletedOn: string;
  originalError: string;
  originalCancellation: string;
  requestNewExport: string;
  download: string;
  downloadExpired: string;
  exportInfo: string;
  exportId: string;
  status: string;
  status_processing: string;
  status_completed: string;
  status_failed: string;
  status_cancelled: string;
  status_expired: string;
  conversationId: string;
  createdAt: string;
  totalFiles: string;
  totalSize: string;
  availableFiles: string;
  fileName: string;
  fileSize: string;
  recordCount: string;
  urlExpiresAt: string;
  errorMessage: string;
  cancellationReason: string;
  deleteExport: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  deleteSuccess: string;
  deleteError: string;
}

export const exportStatusViewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportStatusViewTranslations
> = {
  en: {
    loadingStatus: "Loading export status...",
    errorLoadingStatus: "Failed to load export status",
    processingMessage:
      "Your export is being processed. This page will update automatically.",
    failedMessage:
      "The export failed. Please return to the export history page and request a new export.",
    cancelledMessage:
      "This export was cancelled. Please return to the export history page to request a new export.",
    expiredMessage: "This export has expired and been automatically deleted.",
    expiredDeletedOn: "Deleted on",
    originalError: "Original error",
    originalCancellation: "Cancellation reason",
    requestNewExport: "Request New Export",
    download: "Download",
    downloadExpired: "Download Expired",
    exportInfo: "Export Information",
    exportId: "Export ID",
    status: "Status",
    status_processing: "Processing",
    status_completed: "Completed",
    status_failed: "Failed",
    status_cancelled: "Cancelled",
    status_expired: "Expired",
    conversationId: "Conversation ID",
    createdAt: "Created At",
    totalFiles: "Total Files",
    totalSize: "Total Size",
    availableFiles: "Available Files",
    fileName: "File Name",
    fileSize: "Size",
    recordCount: "Records",
    urlExpiresAt: "Expires",
    errorMessage: "Error",
    cancellationReason: "Cancellation Reason",
    deleteExport: "Delete Export",
    deleteConfirmTitle: "Delete Export",
    deleteConfirmMessage:
      "Are you sure you want to delete this export? This action cannot be undone.",
    deleteSuccess: "Export deleted successfully",
    deleteError: "Failed to delete export",
  },
  ar: {
    loadingStatus: "جارٍ تحميل حالة التصدير...",
    errorLoadingStatus: "فشل تحميل حالة التصدير",
    processingMessage:
      "جارٍ معالجة التصدير الخاص بك. سيتم تحديث هذه الصفحة تلقائيًا.",
    failedMessage:
      "فشل التصدير. يرجى العودة إلى صفحة سجل التصدير وطلب تصدير جديد.",
    cancelledMessage:
      "تم إلغاء هذا التصدير. يرجى العودة إلى صفحة سجل التصدير لطلب تصدير جديد.",
    expiredMessage: "انتهت صلاحية هذا التصدير وتم حذفه تلقائيًا.",
    expiredDeletedOn: "تم الحذف في",
    originalError: "الخطأ الأصلي",
    originalCancellation: "سبب الإلغاء",
    requestNewExport: "طلب تصدير جديد",
    download: "تنزيل",
    downloadExpired: "انتهت صلاحية التنزيل",
    exportInfo: "معلومات التصدير",
    exportId: "معرف التصدير",
    status: "الحالة",
    status_processing: "قيد المعالجة",
    status_completed: "مكتمل",
    status_failed: "فشل",
    status_cancelled: "ملغى",
    status_expired: "منتهي الصلاحية",
    conversationId: "معرف المحادثة",
    createdAt: "تم الإنشاء في",
    totalFiles: "إجمالي الملفات",
    totalSize: "الحجم الإجمالي",
    availableFiles: "الملفات المتاحة",
    fileName: "اسم الملف",
    fileSize: "الحجم",
    recordCount: "السجلات",
    urlExpiresAt: "ينتهي",
    errorMessage: "خطأ",
    cancellationReason: "سبب الإلغاء",
    deleteExport: "حذف التصدير",
    deleteConfirmTitle: "حذف التصدير",
    deleteConfirmMessage:
      "هل أنت متأكد من رغبتك في حذف هذا التصدير؟ لا يمكن التراجع عن هذا الإجراء.",
    deleteSuccess: "تم حذف التصدير بنجاح",
    deleteError: "فشل حذف التصدير",
  },
  es: {
    loadingStatus: "Cargando estado de exportación...",
    errorLoadingStatus: "Error al cargar el estado de exportación",
    processingMessage:
      "Se está procesando su exportación. Esta página se actualizará automáticamente.",
    failedMessage:
      "La exportación falló. Por favor, vuelva a la página de historial de exportaciones y solicite una nueva exportación.",
    cancelledMessage:
      "Esta exportación fue cancelada. Por favor, vuelva a la página de historial de exportaciones para solicitar una nueva exportación.",
    expiredMessage:
      "Esta exportación ha expirado y se eliminó automáticamente.",
    expiredDeletedOn: "Eliminada el",
    originalError: "Error original",
    originalCancellation: "Motivo de cancelación",
    requestNewExport: "Solicitar Nueva Exportación",
    download: "Descargar",
    downloadExpired: "Descarga Expirada",
    exportInfo: "Información de Exportación",
    exportId: "ID de Exportación",
    status: "Estado",
    status_processing: "Procesando",
    status_completed: "Completado",
    status_failed: "Fallido",
    status_cancelled: "Cancelado",
    status_expired: "Expirado",
    conversationId: "ID de Conversación",
    createdAt: "Creado el",
    totalFiles: "Archivos Totales",
    totalSize: "Tamaño Total",
    availableFiles: "Archivos Disponibles",
    fileName: "Nombre del Archivo",
    fileSize: "Tamaño",
    recordCount: "Registros",
    urlExpiresAt: "Expira",
    errorMessage: "Error",
    cancellationReason: "Motivo de Cancelación",
    deleteExport: "Eliminar Exportación",
    deleteConfirmTitle: "Eliminar Exportación",
    deleteConfirmMessage:
      "¿Está seguro de que desea eliminar esta exportación? Esta acción no se puede deshacer.",
    deleteSuccess: "Exportación eliminada con éxito",
    deleteError: "Error al eliminar la exportación",
  },
  fr: {
    loadingStatus: "Chargement de l'état de l'exportation...",
    errorLoadingStatus: "Échec du chargement de l'état de l'exportation",
    processingMessage:
      "Votre exportation est en cours de traitement. Cette page se mettra à jour automatiquement.",
    failedMessage:
      "L'exportation a échoué. Veuillez retourner à la page d'historique des exportations et demander une nouvelle exportation.",
    cancelledMessage:
      "Cette exportation a été annulée. Veuillez retourner à la page d'historique des exportations pour demander une nouvelle exportation.",
    expiredMessage:
      "Cette exportation a expiré et a été automatiquement supprimée.",
    expiredDeletedOn: "Supprimée le",
    originalError: "Erreur d'origine",
    originalCancellation: "Raison de l'annulation",
    requestNewExport: "Demander une Nouvelle Exportation",
    download: "Télécharger",
    downloadExpired: "Téléchargement Expiré",
    exportInfo: "Informations sur l'Exportation",
    exportId: "ID de l'Exportation",
    status: "Statut",
    status_processing: "En cours",
    status_completed: "Terminé",
    status_failed: "Échoué",
    status_cancelled: "Annulé",
    status_expired: "Expiré",
    conversationId: "ID de la Conversation",
    createdAt: "Créé le",
    totalFiles: "Fichiers Totaux",
    totalSize: "Taille Totale",
    availableFiles: "Fichiers Disponibles",
    fileName: "Nom du Fichier",
    fileSize: "Taille",
    recordCount: "Enregistrements",
    urlExpiresAt: "Expire",
    errorMessage: "Erreur",
    cancellationReason: "Raison de l'Annulation",
    deleteExport: "Supprimer l'Exportation",
    deleteConfirmTitle: "Supprimer l'Exportation",
    deleteConfirmMessage:
      "Êtes-vous sûr de vouloir supprimer cette exportation ? Cette action ne peut pas être annulée.",
    deleteSuccess: "Exportation supprimée avec succès",
    deleteError: "Échec de la suppression de l'exportation",
  },
  "zh-Hans": {
    loadingStatus: "正在加载导出状态...",
    errorLoadingStatus: "加载导出状态失败",
    processingMessage: "您的导出正在处理中。此页面将自动更新。",
    failedMessage: "导出失败。请返回导出历史页面并请求新的导出。",
    cancelledMessage: "此导出已被取消。请返回导出历史页面以请求新的导出。",
    expiredMessage: "此导出已过期并被自动删除。",
    expiredDeletedOn: "删除于",
    originalError: "原始错误",
    originalCancellation: "取消原因",
    requestNewExport: "请求新导出",
    download: "下载",
    downloadExpired: "下载已过期",
    exportInfo: "导出信息",
    exportId: "导出ID",
    status: "状态",
    status_processing: "处理中",
    status_completed: "已完成",
    status_failed: "失败",
    status_cancelled: "已取消",
    status_expired: "已过期",
    conversationId: "对话ID",
    createdAt: "创建于",
    totalFiles: "文件总数",
    totalSize: "总大小",
    availableFiles: "可用文件",
    fileName: "文件名",
    fileSize: "大小",
    recordCount: "记录数",
    urlExpiresAt: "过期于",
    errorMessage: "错误",
    cancellationReason: "取消原因",
    deleteExport: "删除导出",
    deleteConfirmTitle: "删除导出",
    deleteConfirmMessage: "您确定要删除此导出吗？此操作无法撤销。",
    deleteSuccess: "导出删除成功",
    deleteError: "删除导出失败",
  },
  "zh-Hant": {
    loadingStatus: "正在載入匯出狀態...",
    errorLoadingStatus: "載入匯出狀態失敗",
    processingMessage: "您的匯出正在處理中。此頁面將自動更新。",
    failedMessage: "匯出失敗。請返回匯出歷史頁面並請求新的匯出。",
    cancelledMessage: "此匯出已被取消。請返回匯出歷史頁面以請求新的匯出。",
    expiredMessage: "此匯出已過期並被自動刪除。",
    expiredDeletedOn: "刪除於",
    originalError: "原始錯誤",
    originalCancellation: "取消原因",
    requestNewExport: "請求新匯出",
    download: "下載",
    downloadExpired: "下載已過期",
    exportInfo: "匯出資訊",
    exportId: "匯出ID",
    status: "狀態",
    status_processing: "處理中",
    status_completed: "已完成",
    status_failed: "失敗",
    status_cancelled: "已取消",
    status_expired: "已過期",
    conversationId: "對話ID",
    createdAt: "建立於",
    totalFiles: "檔案總數",
    totalSize: "總大小",
    availableFiles: "可用檔案",
    fileName: "檔案名稱",
    fileSize: "大小",
    recordCount: "記錄數",
    urlExpiresAt: "過期於",
    errorMessage: "錯誤",
    cancellationReason: "取消原因",
    deleteExport: "刪除匯出",
    deleteConfirmTitle: "刪除匯出",
    deleteConfirmMessage: "您確定要刪除此匯出嗎？此操作無法撤銷。",
    deleteSuccess: "匯出刪除成功",
    deleteError: "刪除匯出失敗",
  },
  ja: {
    loadingStatus: "エクスポートステータスを読み込んでいます...",
    errorLoadingStatus: "エクスポートステータスの読み込みに失敗しました",
    processingMessage:
      "エクスポートが処理されています。このページは自動的に更新されます。",
    failedMessage:
      "エクスポートが失敗しました。エクスポート履歴ページに戻り、新しいエクスポートをリクエストしてください。",
    cancelledMessage:
      "このエクスポートはキャンセルされました。エクスポート履歴ページに戻り、新しいエクスポートをリクエストしてください。",
    expiredMessage:
      "このエクスポートは期限切れとなり、自動的に削除されました。",
    expiredDeletedOn: "削除日",
    originalError: "元のエラー",
    originalCancellation: "キャンセル理由",
    requestNewExport: "新しいエクスポートをリクエスト",
    download: "ダウンロード",
    downloadExpired: "ダウンロード期限切れ",
    exportInfo: "エクスポート情報",
    exportId: "エクスポートID",
    status: "ステータス",
    status_processing: "処理中",
    status_completed: "完了",
    status_failed: "失敗",
    status_cancelled: "キャンセル",
    status_expired: "期限切れ",
    conversationId: "会話ID",
    createdAt: "作成日",
    totalFiles: "ファイル総数",
    totalSize: "合計サイズ",
    availableFiles: "利用可能なファイル",
    fileName: "ファイル名",
    fileSize: "サイズ",
    recordCount: "レコード数",
    urlExpiresAt: "有効期限",
    errorMessage: "エラー",
    cancellationReason: "キャンセル理由",
    deleteExport: "エクスポートを削除",
    deleteConfirmTitle: "エクスポートを削除",
    deleteConfirmMessage:
      "このエクスポートを削除してもよろしいですか？この操作は元に戻せません。",
    deleteSuccess: "エクスポートが正常に削除されました",
    deleteError: "エクスポートの削除に失敗しました",
  },
};
