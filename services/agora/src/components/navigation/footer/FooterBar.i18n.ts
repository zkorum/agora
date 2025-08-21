import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface FooterBarTranslations {
  home: string;
  explore: string;
  dings: string;
  [key: string]: string; // Required for Record<string, string> constraint
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
    dings: "Notif",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    dings: "Notif",
  },
};
