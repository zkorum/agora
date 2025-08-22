export interface TopicSelectionStepTranslations {
  title: string;
  backButton: string;
  closeButton: string;
}

export const topicSelectionStepTranslations: Record<
  string,
  TopicSelectionStepTranslations
> = {
  en: {
    title: "Select topics you're interested in to get started",
    backButton: "Back",
    closeButton: "Close",
  },
  es: {
    title: "Selecciona los temas que te interesan para comenzar",
    backButton: "Atrás",
    closeButton: "Cerrar",
  },
  fr: {
    title: "Sélectionnez les sujets qui vous intéressent pour commencer",
    backButton: "Retour",
    closeButton: "Fermer",
  },
};
