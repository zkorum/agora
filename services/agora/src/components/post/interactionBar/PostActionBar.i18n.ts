import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostActionBarTranslations {
  share: string;
  copiedToClipboard: string;
}

export const postActionBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostActionBarTranslations
> = {
  en: {
    share: "Share",
    copiedToClipboard: "Link copied to clipboard",
  },
  ar: {
    share: "مشاركة",
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
  },
  es: {
    share: "Compartir",
    copiedToClipboard: "Enlace copiado al portapapeles",
  },
  fr: {
    share: "Partager",
    copiedToClipboard: "Lien copié dans le presse-papiers",
  },
  "zh-Hans": {
    share: "分享",
    copiedToClipboard: "链接已复制到剪贴板",
  },
  "zh-Hant": {
    share: "分享",
    copiedToClipboard: "連結已複製到剪貼簿",
  },
  ja: {
    share: "共有",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
  },
};
