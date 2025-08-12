// French translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  navigation: {
    sideDrawer: {
      home: "Maison",
      explore: "Explorer",
      dings: "Notifications",
      profile: "Profil",
      settings: "Paramètres",
    },
  },
  settings: {
    language: {
      title: "Langue",
      displayLanguage: {
        title: "Langue d'affichage",
      },
      spokenLanguages: {
        title: "Langues parlées",
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
        failedToLoadLanguages:
          "Échec du chargement des préférences linguistiques",
      },
    },
  },
};

export default translations;
