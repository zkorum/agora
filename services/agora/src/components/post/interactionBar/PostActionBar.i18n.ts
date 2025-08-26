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
  es: {
    share: "Compartir",
  },
  fr: {
    share: "Partager",
  },
  "zh-CN": {
    share: "分享",
  },
  "zh-TW": {
    share: "分享",
  },
  ja: {
    share: "共有",
  },
};
