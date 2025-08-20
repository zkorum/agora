export interface SpokenLanguageSelectorTranslations {
  selectedLanguages: string;
  addMoreLanguages: string;
  selectLanguages: string;
  searchLanguages: string;
  noLanguagesFound: string;
  allLanguagesSelected: string;
  cannotRemoveLastLanguage: string;
  failedToSaveLanguages: string;
  failedToLoadLanguages: string;
  [key: string]: string; // Index signature to satisfy Record<string, string> constraint
}

export const spokenLanguageSelectorTranslations: Record<
  string,
  SpokenLanguageSelectorTranslations
> = {
  en: {
    selectedLanguages: "Selected Languages",
    addMoreLanguages: "Add More Languages",
    selectLanguages: "Select Languages",
    searchLanguages: "Search languages...",
    noLanguagesFound: "No languages found",
    allLanguagesSelected: "All languages selected",
    cannotRemoveLastLanguage: "You must have at least one language selected",
    failedToSaveLanguages: "Failed to save language preferences",
    failedToLoadLanguages: "Failed to load language preferences",
  },
  es: {
    selectedLanguages: "Idiomas seleccionados",
    addMoreLanguages: "Agregar más idiomas",
    selectLanguages: "Seleccionar idiomas",
    searchLanguages: "Buscar idiomas...",
    noLanguagesFound: "No se encontraron idiomas",
    allLanguagesSelected: "Todos los idiomas seleccionados",
    cannotRemoveLastLanguage: "Debe tener al menos un idioma seleccionado",
    failedToSaveLanguages: "Error al guardar las preferencias de idioma",
    failedToLoadLanguages: "Error al cargar las preferencias de idioma",
  },
  fr: {
    selectedLanguages: "Langues sélectionnées",
    addMoreLanguages: "Ajouter plus de langues",
    selectLanguages: "Sélectionner des langues",
    searchLanguages: "Rechercher des langues...",
    noLanguagesFound: "Aucune langue trouvée",
    allLanguagesSelected: "Toutes les langues sélectionnées",
    cannotRemoveLastLanguage:
      "Vous devez avoir au moins une langue sélectionnée",
    failedToSaveLanguages:
      "Échec de la sauvegarde des préférences linguistiques",
    failedToLoadLanguages: "Échec du chargement des préférences linguistiques",
  },
};
