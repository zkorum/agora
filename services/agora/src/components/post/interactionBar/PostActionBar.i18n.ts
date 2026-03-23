import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostActionBarTranslations {
  share: string;
  copiedToClipboard: string;
  totalVotes: string;
  totalParticipants: string;
  usedForAnalysis: string;
  moderatedVotesExplanation: string;
  moderatedParticipantsExplanation: string;
}

export const postActionBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostActionBarTranslations
> = {
  en: {
    share: "Share",
    copiedToClipboard: "Link copied to clipboard",
    totalVotes: "Total votes",
    totalParticipants: "Total participants",
    usedForAnalysis: "Used for analysis",
    moderatedVotesExplanation:
      "Votes on moderated statements are excluded from analysis.",
    moderatedParticipantsExplanation:
      "Participants who only voted on moderated statements are excluded from analysis.",
  },
  ar: {
    share: "مشاركة",
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
    totalVotes: "إجمالي الأصوات",
    totalParticipants: "إجمالي المشاركين",
    usedForAnalysis: "المستخدمة في التحليل",
    moderatedVotesExplanation:
      "يتم استبعاد الأصوات على العبارات المعتدلة من التحليل.",
    moderatedParticipantsExplanation:
      "يتم استبعاد المشاركين الذين صوتوا فقط على عبارات معتدلة من التحليل.",
  },
  es: {
    share: "Compartir",
    copiedToClipboard: "Enlace copiado al portapapeles",
    totalVotes: "Votos totales",
    totalParticipants: "Participantes totales",
    usedForAnalysis: "Usados para el análisis",
    moderatedVotesExplanation:
      "Los votos sobre proposiciones moderadas se excluyen del análisis.",
    moderatedParticipantsExplanation:
      "Los participantes que solo votaron sobre proposiciones moderadas se excluyen del análisis.",
  },
  fa: {
    share: "اشتراک‌گذاری",
    copiedToClipboard: "لینک در کلیپ‌بورد کپی شد",
    totalVotes: "مجموع رأی‌ها",
    totalParticipants: "مجموع شرکت‌کنندگان",
    usedForAnalysis: "استفاده شده برای تحلیل",
    moderatedVotesExplanation: "رأی‌های مربوط به گزاره‌های مدیریت‌شده از تحلیل حذف شده‌اند.",
    moderatedParticipantsExplanation: "شرکت‌کنندگانی که فقط به گزاره‌های مدیریت‌شده رأی داده‌اند از تحلیل حذف شده‌اند.",
  },
  fr: {
    share: "Partager",
    copiedToClipboard: "Lien copié dans le presse-papiers",
    totalVotes: "Votes totaux",
    totalParticipants: "Participants totaux",
    usedForAnalysis: "Utilisés pour l'analyse",
    moderatedVotesExplanation:
      "Les votes sur les propositions modérées sont exclus de l'analyse.",
    moderatedParticipantsExplanation:
      "Les participants n'ayant voté que sur des propositions modérées sont exclus de l'analyse.",
  },
  "zh-Hans": {
    share: "分享",
    copiedToClipboard: "链接已复制到剪贴板",
    totalVotes: "总投票数",
    totalParticipants: "总参与人数",
    usedForAnalysis: "用于分析",
    moderatedVotesExplanation: "对已审核声明的投票不计入分析。",
    moderatedParticipantsExplanation:
      "仅对已审核声明投票的参与者不计入分析。",
  },
  "zh-Hant": {
    share: "分享",
    copiedToClipboard: "連結已複製到剪貼簿",
    totalVotes: "總投票數",
    totalParticipants: "總參與人數",
    usedForAnalysis: "用於分析",
    moderatedVotesExplanation: "對已審核聲明的投票不計入分析。",
    moderatedParticipantsExplanation:
      "僅對已審核聲明投票的參與者不計入分析。",
  },
  he: {
    share: "שיתוף",
    copiedToClipboard: "הקישור הועתק ללוח",
    totalVotes: "סך הצבעות",
    totalParticipants: "סך משתתפים",
    usedForAnalysis: "בשימוש לניתוח",
    moderatedVotesExplanation: "הצבעות על הצהרות שעברו מודרציה מוחרגות מהניתוח.",
    moderatedParticipantsExplanation: "משתתפים שהצביעו רק על הצהרות שעברו מודרציה מוחרגים מהניתוח.",
  },
  ja: {
    share: "共有",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
    totalVotes: "総投票数",
    totalParticipants: "総参加者数",
    usedForAnalysis: "分析に使用",
    moderatedVotesExplanation:
      "モデレートされた声明への投票は分析から除外されます。",
    moderatedParticipantsExplanation:
      "モデレートされた声明にのみ投票した参加者は分析から除外されます。",
  },
  ky: {
    share: "Бөлүшүү",
    copiedToClipboard: "Шилтеме алмашуу буферине көчүрүлдү",
    totalVotes: "Жалпы добуштар",
    totalParticipants: "Жалпы катышуучулар",
    usedForAnalysis: "Анализ үчүн колдонулат",
    moderatedVotesExplanation:
      "Модерацияланган пикирлерге берилген добуштар анализден чыгарылат.",
    moderatedParticipantsExplanation:
      "Модерацияланган пикирлерге гана добуш берген катышуучулар анализден чыгарылат.",
  },
  ru: {
    share: "Поделиться",
    copiedToClipboard: "Ссылка скопирована в буфер обмена",
    totalVotes: "Всего голосов",
    totalParticipants: "Всего участников",
    usedForAnalysis: "Используются для анализа",
    moderatedVotesExplanation:
      "Голоса за модерированные высказывания исключены из анализа.",
    moderatedParticipantsExplanation:
      "Участники, голосовавшие только за модерированные высказывания, исключены из анализа.",
  },
};
