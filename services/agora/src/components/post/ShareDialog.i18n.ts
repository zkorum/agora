/**
 * Internationalization translations for ShareDialog component
 * Supports all languages configured in the application
 */

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ShareDialogTranslations {
  copyLink: string;
  copiedToClipboard: string;
  couldNotCopy: string;
  qrCodeAlt: string;
}

export const shareDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  ShareDialogTranslations
> = {
  en: {
    copyLink: "Copy link",
    copiedToClipboard: "Copied link to clipboard",
    couldNotCopy: "Could not copy to clipboard",
    qrCodeAlt: "QR code",
  },
  ar: {
    copyLink: "نسخ الرابط",
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
    couldNotCopy: "تعذر النسخ إلى الحافظة",
    qrCodeAlt: "رمز الاستجابة السريعة",
  },
  es: {
    copyLink: "Copiar enlace",
    copiedToClipboard: "Enlace copiado al portapapeles",
    couldNotCopy: "No se pudo copiar al portapapeles",
    qrCodeAlt: "Código QR",
  },
  fa: {
    copyLink: "کپی لینک",
    copiedToClipboard: "لینک در کلیپ‌بورد کپی شد",
    couldNotCopy: "کپی در کلیپ‌بورد امکان‌پذیر نبود",
    qrCodeAlt: "کد QR",
  },
  fr: {
    copyLink: "Copier le lien",
    copiedToClipboard: "Lien copié dans le presse-papiers",
    couldNotCopy: "Impossible de copier dans le presse-papiers",
    qrCodeAlt: "Code QR",
  },
  "zh-Hans": {
    copyLink: "复制链接",
    copiedToClipboard: "已复制链接到剪贴板",
    couldNotCopy: "无法复制到剪贴板",
    qrCodeAlt: "二维码",
  },
  "zh-Hant": {
    copyLink: "複製連結",
    copiedToClipboard: "已複製連結到剪貼簿",
    couldNotCopy: "無法複製到剪貼簿",
    qrCodeAlt: "QR 碼",
  },
  he: {
    copyLink: "העתקת קישור",
    copiedToClipboard: "הקישור הועתק ללוח",
    couldNotCopy: "לא ניתן להעתיק ללוח",
    qrCodeAlt: "קוד QR",
  },
  ja: {
    copyLink: "リンクをコピー",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
    couldNotCopy: "クリップボードにコピーできませんでした",
    qrCodeAlt: "QR コード",
  },
  ky: {
    copyLink: "Шилтемени көчүрүү",
    copiedToClipboard: "Шилтеме алмашуу буферине көчүрүлдү",
    couldNotCopy: "Алмашуу буферине көчүрүү мүмкүн болбоду",
    qrCodeAlt: "QR код",
  },
  ru: {
    copyLink: "Копировать ссылку",
    copiedToClipboard: "Ссылка скопирована в буфер обмена",
    couldNotCopy: "Не удалось скопировать в буфер обмена",
    qrCodeAlt: "QR-код",
  },
};
