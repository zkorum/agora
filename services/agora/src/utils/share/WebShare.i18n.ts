/**
 * Internationalization translations for WebShare utility
 * Supports all languages configured in the application
 */

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface WebShareTranslations {
  copiedToClipboard: string;
}

export const webShareTranslations: Record<
  SupportedDisplayLanguageCodes,
  WebShareTranslations
> = {
  en: {
    copiedToClipboard: "Copied link to clipboard",
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
};
