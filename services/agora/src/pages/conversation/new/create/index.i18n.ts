export interface CreateConversationTranslations {
  importButton: string;
  nextButton: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  [key: string]: string;
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
    titlePlaceholder: "¿Qué quieres preguntar?",
    bodyPlaceholder:
      "Texto del cuerpo. Proporciona contexto o recursos relevantes. ¡Asegúrate de que esté alineado con la pregunta principal!",
  },
  fr: {
    importButton: "Importer",
    nextButton: "Suivant",
    titlePlaceholder: "Que voulez-vous demander ?",
    bodyPlaceholder:
      "Texte du corps. Fournissez du contexte ou des ressources pertinentes. Assurez-vous qu'il soit aligné avec la question principale !",
  },
};
