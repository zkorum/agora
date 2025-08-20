export interface SpokenLanguagesSettingsTranslations {
  pageTitle: string;
  [key: string]: string; // Index signature to satisfy Record<string, string> constraint
}

export const spokenLanguagesSettingsTranslations: Record<
  string,
  SpokenLanguagesSettingsTranslations
> = {
  en: {
    pageTitle: "Spoken Languages",
  },
  es: {
    pageTitle: "Idiomas hablados",
  },
  fr: {
    pageTitle: "Langues parlées",
  },
};
