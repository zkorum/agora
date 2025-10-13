import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportPageTranslations {
  pageTitle: string;
  pageDescription: string;
  previousExports: string;
  conversationLoadError: string;
  exportRequestError: string;
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
  },
  ar: {
    pageTitle: "تصدير المحادثة",
    pageDescription: "قم بتنزيل ملف CSV لجميع الآراء والأصوات لهذه المحادثة.",
    previousExports: "الصادرات السابقة",
    conversationLoadError: "فشل تحميل تفاصيل المحادثة. يرجى المحاولة مرة أخرى.",
    exportRequestError: "فشل إنشاء التصدير. يرجى المحاولة مرة أخرى.",
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
  },
  "zh-Hans": {
    pageTitle: "导出对话",
    pageDescription: "下载此对话的所有意见和投票的CSV导出。",
    previousExports: "以前的导出",
    conversationLoadError: "无法加载对话详情。请重试。",
    exportRequestError: "无法创建导出。请重试。",
  },
  "zh-Hant": {
    pageTitle: "匯出對話",
    pageDescription: "下載此對話的所有意見和投票的CSV匯出。",
    previousExports: "先前的匯出",
    conversationLoadError: "無法載入對話詳情。請重試。",
    exportRequestError: "無法建立匯出。請重試。",
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
  },
};
