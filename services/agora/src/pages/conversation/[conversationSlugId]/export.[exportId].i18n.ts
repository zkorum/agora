import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportStatusPageTranslations {
  pageTitle: string;
  backToHistory: string;
  loadingStatus: string;
  exportInfo: string;
  exportId: string;
  conversationId: string;
  createdAt: string;
  statusLabel: string;
  statusProcessing: string;
  statusCompleted: string;
  statusFailed: string;
  processingMessage: string;
  completedMessage: string;
  failedMessage: string;
  download: string;
  downloadUrl: string;
  fileSize: string;
  opinionCount: string;
  errorMessage: string;
  urlExpiresAt: string;
  urlExpiresSoon: string;
  errorLoadingStatus: string;
}

export const exportStatusPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportStatusPageTranslations
> = {
  en: {
    pageTitle: "Export Status",
    backToHistory: "Back to Export History",
    loadingStatus: "Loading export status...",
    exportInfo: "Export Information",
    exportId: "Export ID",
    conversationId: "Conversation ID",
    createdAt: "Created At",
    statusLabel: "Status",
    statusProcessing: "Processing",
    statusCompleted: "Completed",
    statusFailed: "Failed",
    processingMessage:
      "Your export is being processed. This page will update automatically.",
    completedMessage: "Your export is ready for download!",
    failedMessage:
      "The export failed. Please return to the export history page and request a new export.",
    download: "Download Export",
    downloadUrl: "Download URL",
    fileSize: "File Size",
    opinionCount: "Opinions Included",
    errorMessage: "Error",
    urlExpiresAt: "Download URL expires at",
    urlExpiresSoon: "Download URL expires soon! Download now.",
    errorLoadingStatus: "Failed to load export status",
  },
  ar: {
    pageTitle: "حالة التصدير",
    backToHistory: "العودة إلى سجل التصدير",
    loadingStatus: "جارٍ تحميل حالة التصدير...",
    exportInfo: "معلومات التصدير",
    exportId: "معرف التصدير",
    conversationId: "معرف المحادثة",
    createdAt: "تم الإنشاء في",
    statusLabel: "الحالة",
    statusProcessing: "قيد المعالجة",
    statusCompleted: "مكتمل",
    statusFailed: "فشل",
    processingMessage:
      "جارٍ معالجة التصدير الخاص بك. سيتم تحديث هذه الصفحة تلقائيًا.",
    completedMessage: "التصدير الخاص بك جاهز للتنزيل!",
    failedMessage:
      "فشل التصدير. يرجى العودة إلى صفحة سجل التصدير وطلب تصدير جديد.",
    download: "تنزيل التصدير",
    downloadUrl: "رابط التنزيل",
    fileSize: "حجم الملف",
    opinionCount: "الآراء المضمنة",
    errorMessage: "خطأ",
    urlExpiresAt: "ينتهي رابط التنزيل في",
    urlExpiresSoon: "ينتهي رابط التنزيل قريبًا! قم بالتنزيل الآن.",
    errorLoadingStatus: "فشل تحميل حالة التصدير",
  },
  es: {
    pageTitle: "Estado de Exportación",
    backToHistory: "Volver al Historial de Exportaciones",
    loadingStatus: "Cargando estado de exportación...",
    exportInfo: "Información de Exportación",
    exportId: "ID de Exportación",
    conversationId: "ID de Conversación",
    createdAt: "Creado el",
    statusLabel: "Estado",
    statusProcessing: "Procesando",
    statusCompleted: "Completado",
    statusFailed: "Fallido",
    processingMessage:
      "Se está procesando su exportación. Esta página se actualizará automáticamente.",
    completedMessage: "¡Su exportación está lista para descargar!",
    failedMessage:
      "La exportación falló. Por favor, vuelva a la página de historial de exportaciones y solicite una nueva exportación.",
    download: "Descargar Exportación",
    downloadUrl: "URL de Descarga",
    fileSize: "Tamaño del Archivo",
    opinionCount: "Opiniones Incluidas",
    errorMessage: "Error",
    urlExpiresAt: "La URL de descarga expira el",
    urlExpiresSoon: "¡La URL de descarga expira pronto! Descargue ahora.",
    errorLoadingStatus: "Error al cargar el estado de exportación",
  },
  fr: {
    pageTitle: "État de l'Exportation",
    backToHistory: "Retour à l'Historique des Exportations",
    loadingStatus: "Chargement de l'état de l'exportation...",
    exportInfo: "Informations sur l'Exportation",
    exportId: "ID de l'Exportation",
    conversationId: "ID de la Conversation",
    createdAt: "Créé le",
    statusLabel: "État",
    statusProcessing: "En cours",
    statusCompleted: "Terminé",
    statusFailed: "Échec",
    processingMessage:
      "Votre exportation est en cours de traitement. Cette page se mettra à jour automatiquement.",
    completedMessage: "Votre exportation est prête à être téléchargée !",
    failedMessage:
      "L'exportation a échoué. Veuillez retourner à la page d'historique des exportations et demander une nouvelle exportation.",
    download: "Télécharger l'Exportation",
    downloadUrl: "URL de Téléchargement",
    fileSize: "Taille du Fichier",
    opinionCount: "Opinions Incluses",
    errorMessage: "Erreur",
    urlExpiresAt: "L'URL de téléchargement expire le",
    urlExpiresSoon:
      "L'URL de téléchargement expire bientôt ! Téléchargez maintenant.",
    errorLoadingStatus: "Échec du chargement de l'état de l'exportation",
  },
  "zh-Hans": {
    pageTitle: "导出状态",
    backToHistory: "返回导出历史",
    loadingStatus: "正在加载导出状态...",
    exportInfo: "导出信息",
    exportId: "导出ID",
    conversationId: "对话ID",
    createdAt: "创建于",
    statusLabel: "状态",
    statusProcessing: "处理中",
    statusCompleted: "已完成",
    statusFailed: "失败",
    processingMessage: "您的导出正在处理中。此页面将自动更新。",
    completedMessage: "您的导出已准备好下载！",
    failedMessage: "导出失败。请返回导出历史页面并请求新的导出。",
    download: "下载导出",
    downloadUrl: "下载URL",
    fileSize: "文件大小",
    opinionCount: "包含的意见",
    errorMessage: "错误",
    urlExpiresAt: "下载URL过期于",
    urlExpiresSoon: "下载URL即将过期！请立即下载。",
    errorLoadingStatus: "加载导出状态失败",
  },
  "zh-Hant": {
    pageTitle: "匯出狀態",
    backToHistory: "返回匯出歷史",
    loadingStatus: "正在載入匯出狀態...",
    exportInfo: "匯出資訊",
    exportId: "匯出ID",
    conversationId: "對話ID",
    createdAt: "建立於",
    statusLabel: "狀態",
    statusProcessing: "處理中",
    statusCompleted: "已完成",
    statusFailed: "失敗",
    processingMessage: "您的匯出正在處理中。此頁面將自動更新。",
    completedMessage: "您的匯出已準備好下載！",
    failedMessage: "匯出失敗。請返回匯出歷史頁面並請求新的匯出。",
    download: "下載匯出",
    downloadUrl: "下載URL",
    fileSize: "檔案大小",
    opinionCount: "包含的意見",
    errorMessage: "錯誤",
    urlExpiresAt: "下載URL過期於",
    urlExpiresSoon: "下載URL即將過期！請立即下載。",
    errorLoadingStatus: "載入匯出狀態失敗",
  },
  ja: {
    pageTitle: "エクスポートステータス",
    backToHistory: "エクスポート履歴に戻る",
    loadingStatus: "エクスポートステータスを読み込んでいます...",
    exportInfo: "エクスポート情報",
    exportId: "エクスポートID",
    conversationId: "会話ID",
    createdAt: "作成日",
    statusLabel: "ステータス",
    statusProcessing: "処理中",
    statusCompleted: "完了",
    statusFailed: "失敗",
    processingMessage:
      "エクスポートが処理されています。このページは自動的に更新されます。",
    completedMessage: "エクスポートのダウンロード準備が整いました！",
    failedMessage:
      "エクスポートが失敗しました。エクスポート履歴ページに戻り、新しいエクスポートをリクエストしてください。",
    download: "エクスポートをダウンロード",
    downloadUrl: "ダウンロードURL",
    fileSize: "ファイルサイズ",
    opinionCount: "含まれる意見",
    errorMessage: "エラー",
    urlExpiresAt: "ダウンロードURLの有効期限",
    urlExpiresSoon:
      "ダウンロードURLの有効期限が近づいています！今すぐダウンロードしてください。",
    errorLoadingStatus: "エクスポートステータスの読み込みに失敗しました",
  },
};
