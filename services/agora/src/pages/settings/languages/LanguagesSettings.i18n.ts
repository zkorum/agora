import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LanguagesSettingsTranslations {
  pageTitle: string;
  displayLanguageLabel: string;
  spokenLanguagesLabel: string;
}

export const languagesSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
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
