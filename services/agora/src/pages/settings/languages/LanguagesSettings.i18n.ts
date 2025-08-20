export interface LanguagesSettingsTranslations {
  pageTitle: string;
  displayLanguageLabel: string;
  spokenLanguagesLabel: string;
  [key: string]: string; // Index signature to satisfy Record<string, string> constraint
}

export const languagesSettingsTranslations: Record<
  string,
  LanguagesSettingsTranslations
> = {
  en: {
    pageTitle: "Language",
    displayLanguageLabel: "Display Language",
    spokenLanguagesLabel: "Spoken Languages",
  },
  es: {
    pageTitle: "Idioma",
    displayLanguageLabel: "Idioma de visualización",
    spokenLanguagesLabel: "Idiomas hablados",
  },
  fr: {
    pageTitle: "Langue",
    displayLanguageLabel: "Langue d'affichage",
    spokenLanguagesLabel: "Langues parlées",
  },
};
