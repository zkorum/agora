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
  "zh-CN": {
    pageTitle: "口语语言",
  },
  "zh-TW": {
    pageTitle: "口語語言",
  },
  ja: {
    pageTitle: "口語言語",
  },
};
