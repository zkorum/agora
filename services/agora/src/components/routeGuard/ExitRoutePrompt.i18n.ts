export interface ExitRoutePromptTranslations {
  saveAsDraft: string;
  discard: string;
  [key: string]: string;
}

export const exitRoutePromptTranslations: Record<
  string,
  ExitRoutePromptTranslations
> = {
  en: {
    saveAsDraft: "Save as draft",
    discard: "Discard",
  },
  es: {
    saveAsDraft: "Guardar como borrador",
    discard: "Descartar",
  },
  fr: {
    saveAsDraft: "Enregistrer comme brouillon",
    discard: "Rejeter",
  },
};
