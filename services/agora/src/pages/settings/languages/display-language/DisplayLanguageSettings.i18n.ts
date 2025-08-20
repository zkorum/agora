export interface DisplayLanguageSettingsTranslations {
  pageTitle: string;
  [key: string]: string; // Index signature to satisfy Record<string, string> constraint
}

export const displayLanguageSettingsTranslations: Record<
  string,
  DisplayLanguageSettingsTranslations
> = {
  en: {
    pageTitle: "Display Language",
  },
  es: {
    pageTitle: "Idioma de visualización",
  },
  fr: {
    pageTitle: "Langue d'affichage",
  },
};
