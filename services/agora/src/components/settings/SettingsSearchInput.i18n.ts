import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SettingsSearchInputTranslations {
  searchPlaceholder: string;
}

export const settingsSearchInputTranslations: Record<
  SupportedDisplayLanguageCodes,
  SettingsSearchInputTranslations
> = {
  en: {
    searchPlaceholder: "Search...",
  },
  de: {
    searchPlaceholder: "Suchen...",
  },
  hi: {
    searchPlaceholder: "खोजें...",
  },
  ar: {
    searchPlaceholder: "بحث...",
  },
  es: {
    searchPlaceholder: "Buscar...",
  },
  fa: { searchPlaceholder: "جستجو..." },
  fr: {
    searchPlaceholder: "Rechercher...",
  },
  "zh-Hans": {
    searchPlaceholder: "搜索...",
  },
  "zh-Hant": {
    searchPlaceholder: "搜尋...",
  },
  he: { searchPlaceholder: "...חיפוש" },
  ja: {
    searchPlaceholder: "検索...",
  },
  ky: {
    searchPlaceholder: "Издөө...",
  },
  ru: {
    searchPlaceholder: "Поиск...",
  },
};
