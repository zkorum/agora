export interface ComponentTestingTranslations {
  componentTesting: string;
  preferencesDialog: string;
  preferencesDialogDescription: string;
  openPreferencesDialogButton: string;
}

export const componentTestingTranslations: Record<
  string,
  ComponentTestingTranslations
> = {
  en: {
    componentTesting: "Component Testing",
    preferencesDialog: "Preferences Dialog",
    preferencesDialogDescription:
      "Test the post-signup preferences dialog that allows users to select their language and topic preferences after creating an account.",
    openPreferencesDialogButton: "Open Preferences Dialog",
  },
  es: {
    componentTesting: "Prueba de componentes",
    preferencesDialog: "Diálogo de preferencias",
    preferencesDialogDescription:
      "Pruebe el diálogo de preferencias posterior al registro que permite a los usuarios seleccionar sus preferencias de idioma y tema después de crear una cuenta.",
    openPreferencesDialogButton: "Abrir diálogo de preferencias",
  },
  fr: {
    componentTesting: "Test de Composants",
    preferencesDialog: "Dialogue des Préférences",
    preferencesDialogDescription:
      "Testez le dialogue des préférences post-inscription qui permet aux utilisateurs de sélectionner leurs préférences de langue et de sujet après avoir créé un compte.",
    openPreferencesDialogButton: "Ouvrir le Dialogue des Préférences",
  },
};
