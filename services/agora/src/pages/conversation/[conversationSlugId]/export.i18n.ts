import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportPageTranslations {
  pageTitle: string;
  pageDescription: string;
  previousExports: string;
  conversationLoadError: string;
  exportRequestError: string;
  exportCooldownMinutes: string; // Expects {minutes} parameter
  exportCooldownSeconds: string; // Expects {seconds} parameter
  viewConversation: string;
  requestExportAriaLabel: string;
  // Export request failure reasons (i18n for discriminated union reasons)
  errorActiveExportInProgress: string;
  errorConversationNotFound: string;
  errorNoOpinions: string;
  exportFeatureDisabled: string;
}

export const exportPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportPageTranslations
> = {
  en: {
    pageTitle: "Export Conversation",
    pageDescription:
      "Download a CSV export of all opinions and votes for this conversation.",
    previousExports: "Previous Exports",
    conversationLoadError:
      "Failed to load conversation details. Please try again.",
    exportRequestError: "Failed to create export. Please try again.",
    exportCooldownMinutes:
      "Export cooldown active. You can request another export in {minutes} minute(s).",
    exportCooldownSeconds:
      "Export cooldown active. You can request another export in {seconds} second(s).",
    viewConversation: "View conversation",
    requestExportAriaLabel: "Request export of conversation data",
    errorActiveExportInProgress:
      "An export is already in progress. Please wait for it to complete.",
    errorConversationNotFound: "Conversation not found.",
    errorNoOpinions:
      "This conversation has no opinions to export. Add some opinions first.",
    exportFeatureDisabled: "Export feature is disabled",
  },
  ar: {
    pageTitle: "تصدير المحادثة",
    pageDescription: "قم بتنزيل ملف CSV لجميع الآراء والأصوات لهذه المحادثة.",
    previousExports: "الصادرات السابقة",
    conversationLoadError: "فشل تحميل تفاصيل المحادثة. يرجى المحاولة مرة أخرى.",
    exportRequestError: "فشل إنشاء التصدير. يرجى المحاولة مرة أخرى.",
    exportCooldownMinutes:
      "فترة التهدئة للتصدير نشطة. يمكنك طلب تصدير آخر خلال {minutes} دقيقة.",
    exportCooldownSeconds:
      "فترة التهدئة للتصدير نشطة. يمكنك طلب تصدير آخر خلال {seconds} ثانية.",
    viewConversation: "عرض المحادثة",
    requestExportAriaLabel: "طلب تصدير بيانات المحادثة",
    errorActiveExportInProgress:
      "التصدير قيد التقدم بالفعل. يرجى الانتظار حتى يكتمل.",
    errorConversationNotFound: "المحادثة غير موجودة.",
    errorNoOpinions:
      "لا توجد آراء في هذه المحادثة للتصدير. أضف بعض الآراء أولاً.",
    exportFeatureDisabled: "ميزة التصدير معطلة",
  },
  es: {
    pageTitle: "Exportar Conversación",
    pageDescription:
      "Descarga una exportación CSV de todas las opiniones y votos de esta conversación.",
    previousExports: "Exportaciones Anteriores",
    conversationLoadError:
      "Error al cargar los detalles de la conversación. Por favor, inténtalo de nuevo.",
    exportRequestError:
      "Error al crear la exportación. Por favor, inténtalo de nuevo.",
    exportCooldownMinutes:
      "Período de espera activo. Puedes solicitar otra exportación en {minutes} minuto(s).",
    exportCooldownSeconds:
      "Período de espera activo. Puedes solicitar otra exportación en {seconds} segundo(s).",
    viewConversation: "Ver conversación",
    requestExportAriaLabel: "Solicitar exportación de datos de conversación",
    errorActiveExportInProgress:
      "Ya hay una exportación en progreso. Por favor, espera a que se complete.",
    errorConversationNotFound: "Conversación no encontrada.",
    errorNoOpinions:
      "Esta conversación no tiene opiniones para exportar. Añade algunas opiniones primero.",
    exportFeatureDisabled: "La función de exportación está deshabilitada",
  },
  fr: {
    pageTitle: "Exporter la Conversation",
    pageDescription:
      "Téléchargez une exportation CSV de toutes les opinions et votes pour cette conversation.",
    previousExports: "Exportations Précédentes",
    conversationLoadError:
      "Échec du chargement des détails de la conversation. Veuillez réessayer.",
    exportRequestError:
      "Échec de la création de l'exportation. Veuillez réessayer.",
    exportCooldownMinutes:
      "Période d'attente active. Vous pouvez demander une autre exportation dans {minutes} minute(s).",
    exportCooldownSeconds:
      "Période d'attente active. Vous pouvez demander une autre exportation dans {seconds} seconde(s).",
    viewConversation: "Voir la conversation",
    requestExportAriaLabel:
      "Demander l'exportation des données de conversation",
    errorActiveExportInProgress:
      "Une exportation est déjà en cours. Veuillez attendre qu'elle soit terminée.",
    errorConversationNotFound: "Conversation introuvable.",
    errorNoOpinions:
      "Cette conversation n'a pas d'opinions à exporter. Ajoutez d'abord quelques opinions.",
    exportFeatureDisabled: "La fonction d'exportation est désactivée",
  },
  "zh-Hans": {
    pageTitle: "导出对话",
    pageDescription: "下载此对话的所有意见和投票的CSV导出。",
    previousExports: "以前的导出",
    conversationLoadError: "无法加载对话详情。请重试。",
    exportRequestError: "无法创建导出。请重试。",
    exportCooldownMinutes:
      "导出冷却中。您可以在{minutes}分钟后请求另一个导出。",
    exportCooldownSeconds: "导出冷却中。您可以在{seconds}秒后请求另一个导出。",
    viewConversation: "查看对话",
    requestExportAriaLabel: "请求导出对话数据",
    errorActiveExportInProgress: "导出正在进行中。请等待完成。",
    errorConversationNotFound: "未找到对话。",
    errorNoOpinions: "此对话没有可导出的意见。请先添加一些意见。",
    exportFeatureDisabled: "导出功能已禁用",
  },
  "zh-Hant": {
    pageTitle: "匯出對話",
    pageDescription: "下載此對話的所有意見和投票的CSV匯出。",
    previousExports: "先前的匯出",
    conversationLoadError: "無法載入對話詳情。請重試。",
    exportRequestError: "無法建立匯出。請重試。",
    exportCooldownMinutes:
      "匯出冷卻中。您可以在{minutes}分鐘後請求另一個匯出。",
    exportCooldownSeconds: "匯出冷卻中。您可以在{seconds}秒後請求另一個匯出。",
    viewConversation: "檢視對話",
    requestExportAriaLabel: "請求匯出對話資料",
    errorActiveExportInProgress: "匯出正在進行中。請等待完成。",
    errorConversationNotFound: "未找到對話。",
    errorNoOpinions: "此對話沒有可匯出的意見。請先新增一些意見。",
    exportFeatureDisabled: "匯出功能已停用",
  },
  ja: {
    pageTitle: "会話をエクスポート",
    pageDescription:
      "この会話のすべての意見と投票のCSVエクスポートをダウンロードします。",
    previousExports: "以前のエクスポート",
    conversationLoadError:
      "会話の詳細を読み込めませんでした。もう一度お試しください。",
    exportRequestError:
      "エクスポートの作成に失敗しました。もう一度お試しください。",
    exportCooldownMinutes:
      "エクスポートのクールダウン中です。{minutes}分後に別のエクスポートをリクエストできます。",
    exportCooldownSeconds:
      "エクスポートのクールダウン中です。{seconds}秒後に別のエクスポートをリクエストできます。",
    viewConversation: "会話を表示",
    requestExportAriaLabel: "会話データのエクスポートをリクエスト",
    errorActiveExportInProgress:
      "エクスポートはすでに進行中です。完了するまでお待ちください。",
    errorConversationNotFound: "会話が見つかりません。",
    errorNoOpinions:
      "この会話にはエクスポートする意見がありません。まず意見を追加してください。",
    exportFeatureDisabled: "エクスポート機能は無効です",
  },
};
