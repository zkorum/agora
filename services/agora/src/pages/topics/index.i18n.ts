export interface TopicsTranslations {
  exploreTopics: string;
  following: string;
  follow: string;
  [key: string]: string;
}

export const topicsTranslations: Record<string, TopicsTranslations> = {
  en: {
    exploreTopics: "Explore Topics",
    following: "Following",
    follow: "Follow",
  },
  es: {
    exploreTopics: "Explorar Temas",
    following: "Siguiendo",
    follow: "Seguir",
  },
  fr: {
    exploreTopics: "Explorer les Sujets",
    following: "Suivi",
    follow: "Suivre",
  },
};
