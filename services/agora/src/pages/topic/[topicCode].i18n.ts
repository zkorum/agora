import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface TopicPageTranslations {
  loadPostsHere: string;
}

export const topicPageTranslations: Record<SupportedDisplayLanguageCodes, TopicPageTranslations> = {
  en: {
    loadPostsHere: "Load posts here",
  },
  ar: {
    loadPostsHere: "تحميل المنشورات هنا",
  },
  es: {
    loadPostsHere: "Cargar publicaciones aquí",
  },
  fr: {
    loadPostsHere: "Charger les publications ici",
  },
  "zh-Hans": {
    loadPostsHere: "加载帖子",
  },
  "zh-Hant": {
    loadPostsHere: "載入帖子",
  },
  ja: {
    loadPostsHere: "投稿を読み込む",
  },
};
