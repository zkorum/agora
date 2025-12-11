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
  },
};
