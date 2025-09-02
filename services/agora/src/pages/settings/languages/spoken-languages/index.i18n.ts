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
  ar: {
    pageTitle: "اللغات المنطوقة",
  },
  es: {
    pageTitle: "Idiomas hablados",
  },
  fr: {
    pageTitle: "Langues parlées",
  },
  "zh-Hans": {
    pageTitle: "口语语言",
  },
  "zh-Hant": {
    pageTitle: "口語語言",
  },
  ja: {
    pageTitle: "口語言語",
  },
};
