/**
 * Internationalization translations for WebShare utility
 * Supports all languages configured in the application
 */

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface WebShareTranslations {
  copiedToClipboard: string;
  shareLink: string;
}

export const webShareTranslations: Record<
  SupportedDisplayLanguageCodes,
  WebShareTranslations
> = {
  en: {
    copiedToClipboard: "Copied link to clipboard",
    shareLink: "Share link",
  },
  ar: {
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
    shareLink: "مشاركة الرابط",
  },
  es: {
    copiedToClipboard: "Enlace copiado al portapapeles",
    shareLink: "Compartir enlace",
  },
  fa: {
    copiedToClipboard: "لینک در کلیپ‌بورد کپی شد",
    shareLink: "اشتراک‌گذاری لینک",
  },
  he: {
    copiedToClipboard: "הקישור הועתק ללוח",
    shareLink: "שיתוף קישור",
  },
  fr: {
    copiedToClipboard: "Lien copié dans le presse-papiers",
    shareLink: "Partager le lien",
  },
  "zh-Hans": {
    copiedToClipboard: "已复制链接到剪贴板",
    shareLink: "分享链接",
  },
  "zh-Hant": {
    copiedToClipboard: "已複製連結到剪貼簿",
    shareLink: "分享連結",
  },
  ja: {
    copiedToClipboard: "リンクをクリップボードにコピーしました",
    shareLink: "リンクを共有",
  },
  ky: {
    copiedToClipboard: "Шилтеме алмашуу буферине көчүрүлдү",
    shareLink: "Шилтемени бөлүшүү",
  },
  ru: {
    copiedToClipboard: "Ссылка скопирована в буфер обмена",
    shareLink: "Поделиться ссылкой",
  },
};
