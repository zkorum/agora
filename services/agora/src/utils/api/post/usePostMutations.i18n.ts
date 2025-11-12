import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UsePostMutationsTranslations {
  conversationImportedSuccessfully: string;
  failedToImportConversation: string;
}

export const usePostMutationsTranslations: Record<
  SupportedDisplayLanguageCodes,
  UsePostMutationsTranslations
> = {
  en: {
    conversationImportedSuccessfully:
      "Conversation imported successfully from CSV files",
    failedToImportConversation:
      "Failed to import conversation. Please try again.",
  },
  ar: {
    conversationImportedSuccessfully: "تم استيراد المحادثة بنجاح من ملفات CSV",
    failedToImportConversation: "فشل استيراد المحادثة. يرجى المحاولة مرة أخرى.",
  },
  es: {
    conversationImportedSuccessfully:
      "Conversación importada exitosamente desde archivos CSV",
    failedToImportConversation:
      "Error al importar la conversación. Por favor, inténtelo de nuevo.",
  },
  fr: {
    conversationImportedSuccessfully:
      "Conversation importée avec succès depuis les fichiers CSV",
    failedToImportConversation:
      "Échec de l'importation de la conversation. Veuillez réessayer.",
  },
  "zh-Hans": {
    conversationImportedSuccessfully: "已成功从 CSV 文件导入对话",
    failedToImportConversation: "导入对话失败。请重试。",
  },
  "zh-Hant": {
    conversationImportedSuccessfully: "已成功從 CSV 檔案匯入對話",
    failedToImportConversation: "匯入對話失敗。請重試。",
  },
  ja: {
    conversationImportedSuccessfully:
      "CSV ファイルから会話を正常にインポートしました",
    failedToImportConversation:
      "会話のインポートに失敗しました。もう一度お試しください。",
  },
};
