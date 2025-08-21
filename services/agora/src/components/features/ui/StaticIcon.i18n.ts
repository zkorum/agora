export interface StaticIconTranslations {
  stars: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const staticIconTranslations: Record<string, StaticIconTranslations> = {
  en: {
    stars: "Stars",
  },
  es: {
    stars: "Estrellas",
  },
  fr: {
    stars: "Étoiles",
  },
};
