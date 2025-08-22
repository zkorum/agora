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
};
