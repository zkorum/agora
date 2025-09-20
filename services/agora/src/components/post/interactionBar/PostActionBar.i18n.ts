import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostActionBarTranslations {
  share: string;
}

export const postActionBarTranslations: Record<
  SupportedDisplayLanguageCodes,
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
