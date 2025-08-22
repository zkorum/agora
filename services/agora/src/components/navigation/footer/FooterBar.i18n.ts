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
};
