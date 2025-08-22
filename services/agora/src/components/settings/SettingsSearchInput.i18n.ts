export interface SettingsSearchInputTranslations {
  searchPlaceholder: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const settingsSearchInputTranslations: Record<
  string,
  SettingsSearchInputTranslations
> = {
  en: {
    searchPlaceholder: "Search...",
  },
  es: {
    searchPlaceholder: "Buscar...",
  },
  fr: {
    searchPlaceholder: "Rechercher...",
  },
};
