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
};
