export interface TopicPageTranslations {
  loadPostsHere: string;
  [key: string]: string;
}

export const topicPageTranslations: Record<string, TopicPageTranslations> = {
  en: {
    loadPostsHere: "Load posts here",
  },
  es: {
    loadPostsHere: "Cargar publicaciones aquí",
  },
  fr: {
    loadPostsHere: "Charger les publications ici",
  },
};
