import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportPageTranslations {
  pageTitle: string;
  pageDescription: string;
  requestNewExport: string;
  failedToRequestExport: string;
  exportRequestSuccessful: string;
  loadingExports: string;
  noExportsYet: string;
  errorLoadingExports: string;
  exportId: string;
  createdAt: string;
  statusProcessing: string;
  statusCompleted: string;
  statusFailed: string;
  download: string;
  expiresAt: string;
  exportFailed: string;
}

export const exportPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportPageTranslations
> = {
  en: {
    pageTitle: "Export Conversation",
    pageDescription:
      "Download a CSV export of all opinions and votes for this conversation.",
    requestNewExport: "Request New Export",
    failedToRequestExport: "Failed to request export. Please try again.",
    exportRequestSuccessful:
      "Export requested successfully. It will be ready for download soon.",
    loadingExports: "Loading exports...",
    noExportsYet: "No exports yet. Request your first export above.",
    errorLoadingExports: "Failed to load export history",
    exportId: "Export",
    createdAt: "Created",
    statusProcessing: "Processing",
    statusCompleted: "Completed",
    statusFailed: "Failed",
    download: "Download",
    expiresAt: "Expires",
    exportFailed: "Export failed. Please try requesting a new export.",
  },
  ar: {
    pageTitle: "تصدير المحادثة",
    pageDescription: "قم بتنزيل ملف CSV لجميع الآراء والأصوات لهذه المحادثة.",
    requestNewExport: "طلب تصدير جديد",
    failedToRequestExport: "فشل طلب التصدير. يرجى المحاولة مرة أخرى.",
    exportRequestSuccessful:
      "تم طلب التصدير بنجاح. سيكون جاهزًا للتنزيل قريبًا.",
    loadingExports: "جارٍ تحميل الصادرات...",
    noExportsYet: "لا توجد صادرات بعد. اطلب أول تصدير أعلاه.",
    errorLoadingExports: "فشل تحميل سجل التصدير",
    exportId: "تصدير",
    createdAt: "تم الإنشاء",
    statusProcessing: "قيد المعالجة",
    statusCompleted: "مكتمل",
    statusFailed: "فشل",
    download: "تنزيل",
    expiresAt: "تنتهي الصلاحية",
    exportFailed: "فشل التصدير. يرجى محاولة طلب تصدير جديد.",
  },
  es: {
    pageTitle: "Exportar Conversación",
    pageDescription:
      "Descarga una exportación CSV de todas las opiniones y votos de esta conversación.",
    requestNewExport: "Solicitar Nueva Exportación",
    failedToRequestExport:
      "Error al solicitar la exportación. Inténtalo de nuevo.",
    exportRequestSuccessful:
      "Exportación solicitada con éxito. Estará lista para descargar pronto.",
    loadingExports: "Cargando exportaciones...",
    noExportsYet:
      "Aún no hay exportaciones. Solicita tu primera exportación arriba.",
    errorLoadingExports: "Error al cargar el historial de exportaciones",
    exportId: "Exportación",
    createdAt: "Creado",
    statusProcessing: "Procesando",
    statusCompleted: "Completado",
    statusFailed: "Fallido",
    download: "Descargar",
    expiresAt: "Caduca",
    exportFailed:
      "La exportación falló. Intenta solicitar una nueva exportación.",
  },
  fr: {
    pageTitle: "Exporter la Conversation",
    pageDescription:
      "Téléchargez une exportation CSV de toutes les opinions et votes pour cette conversation.",
    requestNewExport: "Demander une Nouvelle Exportation",
    failedToRequestExport:
      "Échec de la demande d'exportation. Veuillez réessayer.",
    exportRequestSuccessful:
      "Exportation demandée avec succès. Elle sera bientôt prête au téléchargement.",
    loadingExports: "Chargement des exportations...",
    noExportsYet:
      "Aucune exportation pour le moment. Demandez votre première exportation ci-dessus.",
    errorLoadingExports: "Échec du chargement de l'historique des exportations",
    exportId: "Exportation",
    createdAt: "Créé",
    statusProcessing: "En cours",
    statusCompleted: "Terminé",
    statusFailed: "Échec",
    download: "Télécharger",
    expiresAt: "Expire",
    exportFailed:
      "L'exportation a échoué. Veuillez essayer de demander une nouvelle exportation.",
  },
  "zh-Hans": {
    pageTitle: "导出对话",
    pageDescription: "下载此对话的所有意见和投票的CSV导出。",
    requestNewExport: "请求新导出",
    failedToRequestExport: "请求导出失败。请重试。",
    exportRequestSuccessful: "导出请求成功。很快就可以下载了。",
    loadingExports: "正在加载导出...",
    noExportsYet: "还没有导出。在上面请求您的第一个导出。",
    errorLoadingExports: "加载导出历史失败",
    exportId: "导出",
    createdAt: "创建于",
    statusProcessing: "处理中",
    statusCompleted: "已完成",
    statusFailed: "失败",
    download: "下载",
    expiresAt: "过期时间",
    exportFailed: "导出失败。请尝试请求新的导出。",
  },
  "zh-Hant": {
    pageTitle: "匯出對話",
    pageDescription: "下載此對話的所有意見和投票的CSV匯出。",
    requestNewExport: "請求新匯出",
    failedToRequestExport: "請求匯出失敗。請重試。",
    exportRequestSuccessful: "匯出請求成功。很快就可以下載了。",
    loadingExports: "正在載入匯出...",
    noExportsYet: "還沒有匯出。在上面請求您的第一個匯出。",
    errorLoadingExports: "載入匯出歷史失敗",
    exportId: "匯出",
    createdAt: "建立於",
    statusProcessing: "處理中",
    statusCompleted: "已完成",
    statusFailed: "失敗",
    download: "下載",
    expiresAt: "到期時間",
    exportFailed: "匯出失敗。請嘗試請求新的匯出。",
  },
  ja: {
    pageTitle: "会話をエクスポート",
    pageDescription:
      "この会話のすべての意見と投票のCSVエクスポートをダウンロードします。",
    requestNewExport: "新しいエクスポートをリクエスト",
    failedToRequestExport:
      "エクスポートのリクエストに失敗しました。もう一度お試しください。",
    exportRequestSuccessful:
      "エクスポートのリクエストが成功しました。まもなくダウンロード可能になります。",
    loadingExports: "エクスポートを読み込んでいます...",
    noExportsYet:
      "まだエクスポートはありません。上で最初のエクスポートをリクエストしてください。",
    errorLoadingExports: "エクスポート履歴の読み込みに失敗しました",
    exportId: "エクスポート",
    createdAt: "作成日",
    statusProcessing: "処理中",
    statusCompleted: "完了",
    statusFailed: "失敗",
    download: "ダウンロード",
    expiresAt: "有効期限",
    exportFailed:
      "エクスポートが失敗しました。新しいエクスポートをリクエストしてください。",
  },
};
