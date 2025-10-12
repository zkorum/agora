import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportStatusViewTranslations {
  loadingStatus: string;
  errorLoadingStatus: string;
  processingMessage: string;
  failedMessage: string;
  urlExpiresSoon: string;
  download: string;
  exportInfo: string;
  exportId: string;
  conversationId: string;
  createdAt: string;
  fileSize: string;
  opinionCount: string;
  urlExpiresAt: string;
  errorMessage: string;
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
    urlExpiresSoon: "Download URL expires soon! Download now.",
    download: "Download Export",
    exportInfo: "Export Information",
    exportId: "Export ID",
    conversationId: "Conversation ID",
    createdAt: "Created At",
    fileSize: "File Size",
    opinionCount: "Opinions Included",
    urlExpiresAt: "Download URL expires at",
    errorMessage: "Error",
  },
  ar: {
    loadingStatus: "جارٍ تحميل حالة التصدير...",
    errorLoadingStatus: "فشل تحميل حالة التصدير",
    processingMessage:
      "جارٍ معالجة التصدير الخاص بك. سيتم تحديث هذه الصفحة تلقائيًا.",
    failedMessage:
      "فشل التصدير. يرجى العودة إلى صفحة سجل التصدير وطلب تصدير جديد.",
    urlExpiresSoon: "ينتهي رابط التنزيل قريبًا! قم بالتنزيل الآن.",
    download: "تنزيل التصدير",
    exportInfo: "معلومات التصدير",
    exportId: "معرف التصدير",
    conversationId: "معرف المحادثة",
    createdAt: "تم الإنشاء في",
    fileSize: "حجم الملف",
    opinionCount: "الآراء المضمنة",
    urlExpiresAt: "ينتهي رابط التنزيل في",
    errorMessage: "خطأ",
  },
  es: {
    loadingStatus: "Cargando estado de exportación...",
    errorLoadingStatus: "Error al cargar el estado de exportación",
    processingMessage:
      "Se está procesando su exportación. Esta página se actualizará automáticamente.",
    failedMessage:
      "La exportación falló. Por favor, vuelva a la página de historial de exportaciones y solicite una nueva exportación.",
    urlExpiresSoon: "¡La URL de descarga expira pronto! Descargue ahora.",
    download: "Descargar Exportación",
    exportInfo: "Información de Exportación",
    exportId: "ID de Exportación",
    conversationId: "ID de Conversación",
    createdAt: "Creado el",
    fileSize: "Tamaño del Archivo",
    opinionCount: "Opiniones Incluidas",
    urlExpiresAt: "La URL de descarga expira el",
    errorMessage: "Error",
  },
  fr: {
    loadingStatus: "Chargement de l'état de l'exportation...",
    errorLoadingStatus: "Échec du chargement de l'état de l'exportation",
    processingMessage:
      "Votre exportation est en cours de traitement. Cette page se mettra à jour automatiquement.",
    failedMessage:
      "L'exportation a échoué. Veuillez retourner à la page d'historique des exportations et demander une nouvelle exportation.",
    urlExpiresSoon:
      "L'URL de téléchargement expire bientôt ! Téléchargez maintenant.",
    download: "Télécharger l'Exportation",
    exportInfo: "Informations sur l'Exportation",
    exportId: "ID de l'Exportation",
    conversationId: "ID de la Conversation",
    createdAt: "Créé le",
    fileSize: "Taille du Fichier",
    opinionCount: "Opinions Incluses",
    urlExpiresAt: "L'URL de téléchargement expire le",
    errorMessage: "Erreur",
  },
  "zh-Hans": {
    loadingStatus: "正在加载导出状态...",
    errorLoadingStatus: "加载导出状态失败",
    processingMessage: "您的导出正在处理中。此页面将自动更新。",
    failedMessage: "导出失败。请返回导出历史页面并请求新的导出。",
    urlExpiresSoon: "下载URL即将过期！请立即下载。",
    download: "下载导出",
    exportInfo: "导出信息",
    exportId: "导出ID",
    conversationId: "对话ID",
    createdAt: "创建于",
    fileSize: "文件大小",
    opinionCount: "包含的意见",
    urlExpiresAt: "下载URL过期于",
    errorMessage: "错误",
  },
  "zh-Hant": {
    loadingStatus: "正在載入匯出狀態...",
    errorLoadingStatus: "載入匯出狀態失敗",
    processingMessage: "您的匯出正在處理中。此頁面將自動更新。",
    failedMessage: "匯出失敗。請返回匯出歷史頁面並請求新的匯出。",
    urlExpiresSoon: "下載URL即將過期！請立即下載。",
    download: "下載匯出",
    exportInfo: "匯出資訊",
    exportId: "匯出ID",
    conversationId: "對話ID",
    createdAt: "建立於",
    fileSize: "檔案大小",
    opinionCount: "包含的意見",
    urlExpiresAt: "下載URL過期於",
    errorMessage: "錯誤",
  },
  ja: {
    loadingStatus: "エクスポートステータスを読み込んでいます...",
    errorLoadingStatus: "エクスポートステータスの読み込みに失敗しました",
    processingMessage:
      "エクスポートが処理されています。このページは自動的に更新されます。",
    failedMessage:
      "エクスポートが失敗しました。エクスポート履歴ページに戻り、新しいエクスポートをリクエストしてください。",
    urlExpiresSoon:
      "ダウンロードURLの有効期限が近づいています！今すぐダウンロードしてください。",
    download: "エクスポートをダウンロード",
    exportInfo: "エクスポート情報",
    exportId: "エクスポートID",
    conversationId: "会話ID",
    createdAt: "作成日",
    fileSize: "ファイルサイズ",
    opinionCount: "含まれる意見",
    urlExpiresAt: "ダウンロードURLの有効期限",
    errorMessage: "エラー",
  },
};
