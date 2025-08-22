export interface ModeChangeConfirmationDialogTranslations {
  switchToImportMode: string;
  switchingWillClear: string;
  title: string;
  bodyText: string;
  pollOptions: string;
  settingsPreserved: string;
  cancel: string;
  continue: string;
  [key: string]: string;
}

export const modeChangeConfirmationDialogTranslations: Record<
  string,
  ModeChangeConfirmationDialogTranslations
> = {
  en: {
    switchToImportMode: "Switch to Import Mode?",
    switchingWillClear:
      "Switching to import mode will clear the following fields from the conversation draft:",
    title: "Title",
    bodyText: "Body text",
    pollOptions: "Poll options",
    settingsPreserved:
      "Your privacy settings and organization selection will be preserved.",
    cancel: "Cancel",
    continue: "Continue",
  },
  es: {
    switchToImportMode: "¿Cambiar al Modo de Importación?",
    switchingWillClear:
      "Cambiar al modo de importación borrará los siguientes campos del borrador de conversación:",
    title: "Título",
    bodyText: "Texto del cuerpo",
    pollOptions: "Opciones de encuesta",
    settingsPreserved:
      "Tu configuración de privacidad y selección de organización se preservará.",
    cancel: "Cancelar",
    continue: "Continuar",
  },
  fr: {
    switchToImportMode: "Passer en Mode d'Importation ?",
    switchingWillClear:
      "Passer en mode d'importation effacera les champs suivants du brouillon de conversation :",
    title: "Titre",
    bodyText: "Texte du corps",
    pollOptions: "Options de sondage",
    settingsPreserved:
      "Vos paramètres de confidentialité et sélection d'organisation seront préservés.",
    cancel: "Annuler",
    continue: "Continuer",
  },
};
