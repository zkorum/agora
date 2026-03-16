import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NotifyTranslations {
  copiedToClipboard: string;
}

export const notifyTranslations: Record<
  SupportedDisplayLanguageCodes,
  NotifyTranslations
> = {
  en: {
    copiedToClipboard: "Link copied to clipboard",
  },
  ar: {
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
  },
  es: {
    copiedToClipboard: "Enlace copiado al portapapeles",
  },
  fr: {
    copiedToClipboard: "Lien copié dans le presse-papiers",
  },
  "zh-Hans": {
    copiedToClipboard: "已复制链接到剪贴板",
  },
  "zh-Hant": {
    copiedToClipboard: "已複製連結到剪貼簿",
  },
  ja: {
    copiedToClipboard: "リンクをクリップボードにコピーしました",
  },
  ky: {
    copiedToClipboard: "Шилтеме алмашуу буферине көчүрүлдү",
  },
  ru: {
    copiedToClipboard: "Ссылка скопирована в буфер обмена",
  },
};
