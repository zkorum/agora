import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SpokenLanguagesSettingsTranslations {
  pageTitle: string;
}

export const spokenLanguagesSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
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
