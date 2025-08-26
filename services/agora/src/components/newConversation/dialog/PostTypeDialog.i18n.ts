export interface PostTypeDialogTranslations {
  newConversation: string;
  newConversationDescription: string;
  importFromPolis: string;
  importFromPolisDescription: string;
  [key: string]: string;
}

export const postTypeDialogTranslations: Record<
  string,
  PostTypeDialogTranslations
> = {
  en: {
    newConversation: "New Conversation",
    newConversationDescription:
      "Create a new conversation topic for discussion.",
    importFromPolis: "Import from Polis",
    importFromPolisDescription:
      "Import and continue an existing Polis conversation.",
  },
  es: {
    newConversation: "Nueva Conversación",
    newConversationDescription:
      "Crear un nuevo tema de conversación para discusión.",
    importFromPolis: "Importar desde Polis",
    importFromPolisDescription:
      "Importar y continuar una conversación de Polis existente.",
  },
  fr: {
    newConversation: "Nouvelle Conversation",
    newConversationDescription:
      "Créer un nouveau sujet de conversation pour discussion.",
    importFromPolis: "Importer depuis Polis",
    importFromPolisDescription:
      "Importer et continuer une conversation Polis existante.",
  },
  "zh-CN": {
    newConversation: "新对话",
    newConversationDescription: "创建一个新的话题进行讨论。",
    importFromPolis: "从 Polis 导入",
    importFromPolisDescription: "导入并继续一个现有的 Polis 对话。",
  },
  "zh-TW": {
    newConversation: "新對話",
    newConversationDescription: "創建一個新的话题進行討論。",
    importFromPolis: "從 Polis 導入",
    importFromPolisDescription: "導入並繼續一個現有的 Polis 對話。",
  },
  ja: {
    newConversation: "新しい会話",
    newConversationDescription: "新しいトピックを作成して議論します。",
    importFromPolis: "Polis からインポート",
    importFromPolisDescription: "既存の Polis 会話をインポートして続けます。",
  },
};
