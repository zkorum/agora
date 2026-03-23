import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentActionOptionsTranslations {
  agoraOpinion: string;
  copiedToClipboard: string;
}

export const commentActionOptionsTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentActionOptionsTranslations
> = {
  en: {
    agoraOpinion: "Agora Statement",
    copiedToClipboard: "Link copied to clipboard",
  },
  ar: {
    agoraOpinion: "مقترح أجورا",
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
  },
  es: {
    agoraOpinion: "Proposición de Agora",
    copiedToClipboard: "Enlace copiado al portapapeles",
  },
  fa: {
    agoraOpinion: "گزاره Agora",
    copiedToClipboard: "لینک در کلیپ‌بورد کپی شد",
  },
  fr: {
    agoraOpinion: "Proposition Agora",
    copiedToClipboard: "Lien copié dans le presse-papiers",
  },
  "zh-Hans": {
    agoraOpinion: "Agora 观点",
    copiedToClipboard: "链接已复制到剪贴板",
  },
  "zh-Hant": {
    agoraOpinion: "Agora 觀點",
    copiedToClipboard: "連結已複製到剪貼簿",
  },
  he: {
    agoraOpinion: "הצהרת Agora",
    copiedToClipboard: "הקישור הועתק ללוח",
  },
  ja: {
    agoraOpinion: "Agora 主張",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
  },
  ky: {
    agoraOpinion: "Agora пикири",
    copiedToClipboard: "Шилтеме алмашуу буферине көчүрүлдү",
  },
  ru: {
    agoraOpinion: "Высказывание Agora",
    copiedToClipboard: "Ссылка скопирована в буфер обмена",
  },
};
