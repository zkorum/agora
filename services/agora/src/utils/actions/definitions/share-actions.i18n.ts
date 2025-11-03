/**
 * Internationalization translations for share actions
 * Supports all languages configured in the application
 */

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ShareActionsTranslations {
  copyLink: string;
  showQrCode: string;
  shareVia: string;
}

export const shareActionsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ShareActionsTranslations
> = {
  en: {
    copyLink: "Copy link",
    showQrCode: "Show QR Code",
    shareVia: "Share via...",
  },
  ar: {
    copyLink: "نسخ الرابط",
    showQrCode: "عرض رمز الاستجابة السريعة",
    shareVia: "مشاركة عبر...",
  },
  es: {
    copyLink: "Copiar enlace",
    showQrCode: "Mostrar código QR",
    shareVia: "Compartir mediante...",
  },
  fr: {
    copyLink: "Copier le lien",
    showQrCode: "Afficher le QR code",
    shareVia: "Partager via...",
  },
  "zh-Hans": {
    copyLink: "复制链接",
    showQrCode: "显示二维码",
    shareVia: "分享至...",
  },
  "zh-Hant": {
    copyLink: "複製連結",
    showQrCode: "顯示二維碼",
    shareVia: "分享至...",
  },
  ja: {
    copyLink: "リンクをコピー",
    showQrCode: "QRコードを表示",
    shareVia: "共有する...",
  },
};
