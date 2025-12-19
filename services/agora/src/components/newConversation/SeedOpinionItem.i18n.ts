import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SeedOpinionItemTranslations {
  inputTextPlaceholder: string;
}

export const seedOpinionItemTranslations: Record<
  SupportedDisplayLanguageCodes,
  SeedOpinionItemTranslations
> = {
  en: {
    inputTextPlaceholder: "Input text",
  },
  ar: {
    inputTextPlaceholder: "أدخل النص",
  },
  es: {
    inputTextPlaceholder: "Ingrese texto",
  },
  fr: {
    inputTextPlaceholder: "Saisir le texte",
  },
  "zh-Hans": {
    inputTextPlaceholder: "输入文本",
  },
  "zh-Hant": {
    inputTextPlaceholder: "輸入文本",
  },
  ja: {
    inputTextPlaceholder: "テキストを入力",
  },
};
