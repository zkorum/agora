/**
 * Internationalization translations for ShareDialog component
 * Supports all languages configured in the application
 */

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ShareDialogTranslations {
  copyLink: string;
  copiedToClipboard: string;
  couldNotCopy: string;
}

export const shareDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  ShareDialogTranslations
> = {
  en: {
    copyLink: "Copy link",
    copiedToClipboard: "Copied link to clipboard",
    couldNotCopy: "Could not copy to clipboard",
  },
  ar: {
    copyLink: "نسخ الرابط",
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
    couldNotCopy: "تعذر النسخ إلى الحافظة",
  },
  es: {
    copyLink: "Copiar enlace",
    copiedToClipboard: "Enlace copiado al portapapeles",
    couldNotCopy: "No se pudo copiar al portapapeles",
  },
  fr: {
    copyLink: "Copier le lien",
    copiedToClipboard: "Lien copié dans le presse-papiers",
    couldNotCopy: "Impossible de copier dans le presse-papiers",
  },
  "zh-Hans": {
    copyLink: "复制链接",
    copiedToClipboard: "已复制链接到剪贴板",
    couldNotCopy: "无法复制到剪贴板",
  },
  "zh-Hant": {
    copyLink: "複製連結",
    copiedToClipboard: "已複製連結到剪貼簿",
    couldNotCopy: "無法複製到剪貼簿",
  },
  ja: {
    copyLink: "リンクをコピー",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
    couldNotCopy: "クリップボードにコピーできませんでした",
  },
};
