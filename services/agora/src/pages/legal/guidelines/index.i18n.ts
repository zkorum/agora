import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface GuidelinesTranslations {
  guidelines: string;
}

export const guidelinesTranslations: Record<
  SupportedDisplayLanguageCodes,
  GuidelinesTranslations
> = {
  en: {
    guidelines: "Community Guidelines",
  },
  ar: {
    guidelines: "إرشادات المجتمع",
  },
  es: {
    guidelines: "Directrices de la comunidad",
  },
  fr: {
    guidelines: "Règles de la communauté",
  },
  "zh-Hans": {
    guidelines: "社区准则",
  },
  "zh-Hant": {
    guidelines: "社群準則",
  },
  ja: {
    guidelines: "コミュニティガイドライン",
  },
};
