// Central type definition for all translation files
// This ensures all language files maintain the same structure

export interface TranslationSchema {
  navigation: {
    sideDrawer: {
      home: string;
      explore: string;
      dings: string;
      profile: string;
      settings: string;
    };
  };
  settings: {
    language: {
      title: string;
      displayLanguage: {
        title: string;
      };
      spokenLanguages: {
        title: string;
        selectedLanguages: string;
        addMoreLanguages: string;
        selectLanguages: string;
        searchLanguages: string;
        noLanguagesFound: string;
        allLanguagesSelected: string;
        cannotRemoveLastLanguage: string;
        failedToSaveLanguages: string;
        failedToLoadLanguages: string;
      };
    };
  };
  // Index signature to satisfy vue-i18n's LocaleMessage requirements
  [key: string]: string | Record<string, unknown>;
}
