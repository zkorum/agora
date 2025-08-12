// English translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  navigation: {
    sideDrawer: {
      home: "Home",
      explore: "Explore",
      dings: "Dings",
      profile: "Profile",
      settings: "Settings",
    },
  },
  settings: {
    language: {
      title: "Language",
      displayLanguage: {
        title: "Display Language",
      },
      spokenLanguages: {
        title: "Spoken Languages",
        selectedLanguages: "Selected Languages",
        addMoreLanguages: "Add More Languages",
        selectLanguages: "Select Languages",
        searchLanguages: "Search languages...",
        noLanguagesFound: "No languages found",
        allLanguagesSelected: "All languages selected",
        cannotRemoveLastLanguage:
          "You must have at least one language selected",
        failedToSaveLanguages: "Failed to save language preferences",
        failedToLoadLanguages: "Failed to load language preferences",
      },
    },
  },
};

export default translations;
