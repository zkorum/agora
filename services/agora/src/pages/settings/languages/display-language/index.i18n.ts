import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DisplayLanguageSettingsTranslations {
  pageTitle: string;
}

export const displayLanguageSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
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
  "zh-Hans": {
    pageTitle: "显示语言",
  },
  "zh-Hant": {
    pageTitle: "顯示語言",
  },
  ja: {
    pageTitle: "表示言語",
  },
};
