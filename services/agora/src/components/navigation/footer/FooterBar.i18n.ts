import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface FooterBarTranslations {
  home: string;
  explore: string;
  dings: string;
}

export const footerBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  FooterBarTranslations
> = {
  en: {
    home: "Home",
    explore: "Explore",
    dings: "Dings",
  },
  ar: {
    home: "الرئيسية",
    explore: "استكشاف",
    dings: "التنبيهات",
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    dings: "Dings",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    dings: "Dings",
  },
  "zh-Hans": {
    home: "首页",
    explore: "探索",
    dings: "Dings",
  },
  "zh-Hant": {
    home: "首頁",
    explore: "探索",
    dings: "Dings",
  },
  ja: {
    home: "ホーム",
    explore: "探索",
    dings: "Dings",
  },
  fa: {
    home: "Home",
    explore: "Explore",
    dings: "Dings",
  },
};
