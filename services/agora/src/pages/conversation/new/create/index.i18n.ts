export interface CreateConversationTranslations {
  importButton: string;
  nextButton: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
}

export const createConversationTranslations: Record<
  string,
  CreateConversationTranslations
> = {
  en: {
    importButton: "Import",
    nextButton: "Next",
    titlePlaceholder: "What do you want to ask?",
    bodyPlaceholder:
      "Body text. Provide context or relevant resources. Make sure it's aligned with the main question!",
  },
  es: {
    importButton: "Importar",
    nextButton: "Siguiente",
    titlePlaceholder: "¿Qué quiere preguntar?",
    bodyPlaceholder: "Agregue contexto o enlaces útiles",
  },
  fr: {
    importButton: "Importer",
    nextButton: "Suivant",
    titlePlaceholder: "Que voulez-vous demander ?",
    bodyPlaceholder: "Ajoutez du contexte ou des liens utiles",
  },
};
