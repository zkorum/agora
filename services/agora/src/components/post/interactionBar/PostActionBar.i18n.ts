export interface PostActionBarTranslations {
  share: string;
  [key: string]: string;
}

export const postActionBarTranslations: Record<
  string,
  PostActionBarTranslations
> = {
  en: {
    share: "Share",
  },
  ar: {
    share: "مشاركة",
  },
  es: {
    share: "Compartir",
  },
  fr: {
    share: "Partager",
  },
  "zh-Hans": {
    share: "分享",
  },
  "zh-Hant": {
    share: "分享",
  },
  ja: {
    share: "共有",
  },
};
