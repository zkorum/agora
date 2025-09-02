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
  ar: {
    following: "المتابَعة",
    popular: "الشائع",
    new: "جديد",
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
  "zh-Hans": {
    following: "关注",
    popular: "热门",
    new: "最新",
  },
  "zh-Hant": {
    following: "關注",
    popular: "熱門",
    new: "最新",
  },
  ja: {
    following: "フォロー中",
    popular: "人気",
    new: "新着",
  },
};
