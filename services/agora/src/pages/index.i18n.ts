import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface HomeTranslations {
  home: string;
  explore: string;
  following: string;
  popular: string;
  new: string;
}

export const homeTranslations: Record<
  SupportedDisplayLanguageCodes,
  HomeTranslations
> = {
  en: {
    home: "Home",
    explore: "Explore",
    following: "Following",
    popular: "Popular",
    new: "New",
  },
  ar: {
    home: "الرئيسية",
    explore: "استكشاف",
    following: "المتابَعة",
    popular: "الشائع",
    new: "جديد",
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    following: "Siguiendo",
    popular: "Popular",
    new: "Novedades",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    following: "Abonnements",
    popular: "Populaire",
    new: "Nouveau",
  },
  "zh-Hans": {
    home: "首页",
    explore: "探索",
    following: "关注",
    popular: "热门",
    new: "最新",
  },
  "zh-Hant": {
    home: "首頁",
    explore: "探索",
    following: "關注",
    popular: "熱門",
    new: "最新",
  },
  ja: {
    home: "ホーム",
    explore: "探索",
    following: "フォロー中",
    popular: "人気",
    new: "新着",
  },
  fa: {
    home: "خانه",
    explore: "کاوش",
    following: "دنبال‌شده",
    popular: "محبوب",
    new: "جدید",
  ky: {
    following: "Жазылуулар",
    popular: "Популярдуу",
    new: "Жаңы",
  },
  ru: {
    following: "Подписки",
    popular: "Популярное",
    new: "Новое",
  },
};
