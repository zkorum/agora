import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface HomeTranslations {
  following: string;
  popular: string;
  new: string;
}

export const homeTranslations: Record<
  SupportedDisplayLanguageCodes,
  HomeTranslations
> = {
  en: {
    following: "Following",
    popular: "Popular",
    new: "New",
  },
  es: {
    following: "Siguiendo",
    popular: "Popular",
    new: "Novedades",
  },
  fr: {
    following: "Abonnements",
    popular: "Populaire",
    new: "Nouveau",
  },
};
