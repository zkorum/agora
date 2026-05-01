import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostActionBarTranslations {
  share: string;
  copiedToClipboard: string;
  totalVotes: string;
  totalParticipants: string;
  usedForAnalysis: string;
  moderatedVotesExplanation: string;
  moderatedParticipantsExplanation: string;
  surveyVotesExplanation: string;
  surveyParticipantsExplanation: string;
  maxdiffVotesExplanation: string;
  maxdiffParticipantsExplanation: string;
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
    surveyVotesExplanation:
      "Votes from participants who have not completed the survey are excluded from analysis.",
    surveyParticipantsExplanation:
      "Participants who have not completed the survey are excluded from analysis.",
    maxdiffVotesExplanation:
      "Votes on completed and canceled items are excluded from ranking.",
    maxdiffParticipantsExplanation:
      "Participants who only voted on completed and canceled items are excluded from ranking.",
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
    surveyVotesExplanation:
      "يتم استبعاد أصوات المشاركين الذين لم يكملوا الاستبيان من التحليل.",
    surveyParticipantsExplanation:
      "يتم استبعاد المشاركين الذين لم يكملوا الاستبيان من التحليل.",
    maxdiffVotesExplanation:
      "يتم استبعاد الأصوات على العناصر المكتملة والملغاة من الترتيب.",
    maxdiffParticipantsExplanation:
      "يتم استبعاد المشاركين الذين صوتوا فقط على العناصر المكتملة والملغاة من الترتيب.",
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
    surveyVotesExplanation:
      "Los votos de participantes que no completaron la encuesta se excluyen del análisis.",
    surveyParticipantsExplanation:
      "Los participantes que no completaron la encuesta se excluyen del análisis.",
    maxdiffVotesExplanation:
      "Los votos sobre elementos completados y cancelados se excluyen del ranking.",
    maxdiffParticipantsExplanation:
      "Los participantes que solo votaron sobre elementos completados y cancelados se excluyen del ranking.",
  },
  fa: {
    share: "اشتراک‌گذاری",
    copiedToClipboard: "لینک در کلیپ‌بورد کپی شد",
    totalVotes: "مجموع رأی‌ها",
    totalParticipants: "مجموع شرکت‌کنندگان",
    usedForAnalysis: "استفاده شده برای تحلیل",
    moderatedVotesExplanation: "رأی‌های مربوط به گزاره‌های مدیریت‌شده از تحلیل حذف شده‌اند.",
    moderatedParticipantsExplanation: "شرکت‌کنندگانی که فقط به گزاره‌های مدیریت‌شده رأی داده‌اند از تحلیل حذف شده‌اند.",
    surveyVotesExplanation: "رأی‌های شرکت‌کنندگانی که نظرسنجی را کامل نکرده‌اند از تحلیل حذف شده‌اند.",
    surveyParticipantsExplanation: "شرکت‌کنندگانی که نظرسنجی را کامل نکرده‌اند از تحلیل حذف شده‌اند.",
    maxdiffVotesExplanation: "رأی‌های مربوط به موارد تکمیل‌شده و لغوشده از رتبه‌بندی حذف شده‌اند.",
    maxdiffParticipantsExplanation: "شرکت‌کنندگانی که فقط به موارد تکمیل‌شده و لغوشده رأی داده‌اند از رتبه‌بندی حذف شده‌اند.",
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
    surveyVotesExplanation:
      "Les votes des participants n'ayant pas terminé le questionnaire sont exclus de l'analyse.",
    surveyParticipantsExplanation:
      "Les participants n'ayant pas terminé le questionnaire sont exclus de l'analyse.",
    maxdiffVotesExplanation:
      "Les votes sur les éléments terminés et annulés sont exclus du classement.",
    maxdiffParticipantsExplanation:
      "Les participants n'ayant voté que sur des éléments terminés et annulés sont exclus du classement.",
  },
  "zh-Hans": {
    share: "分享",
    copiedToClipboard: "链接已复制到剪贴板",
    totalVotes: "总投票数",
    totalParticipants: "总参与人数",
    usedForAnalysis: "用于分析",
    moderatedVotesExplanation: "对已审核观点的投票不计入分析。",
    moderatedParticipantsExplanation:
      "仅对已审核观点投票的参与者不计入分析。",
    surveyVotesExplanation: "未完成问卷的参与者所投的票不计入分析。",
    surveyParticipantsExplanation: "未完成问卷的参与者不计入分析。",
    maxdiffVotesExplanation: "对已完成和已取消项目的投票不计入排名。",
    maxdiffParticipantsExplanation:
      "仅对已完成和已取消项目投票的参与者不计入排名。",
  },
  "zh-Hant": {
    share: "分享",
    copiedToClipboard: "連結已複製到剪貼簿",
    totalVotes: "總投票數",
    totalParticipants: "總參與人數",
    usedForAnalysis: "用於分析",
    moderatedVotesExplanation: "對已審核觀點的投票不計入分析。",
    moderatedParticipantsExplanation:
      "僅對已審核觀點投票的參與者不計入分析。",
    surveyVotesExplanation: "未完成問卷的參與者所投的票不計入分析。",
    surveyParticipantsExplanation: "未完成問卷的參與者不計入分析。",
    maxdiffVotesExplanation: "對已完成和已取消項目的投票不計入排名。",
    maxdiffParticipantsExplanation:
      "僅對已完成和已取消項目投票的參與者不計入排名。",
  },
  he: {
    share: "שיתוף",
    copiedToClipboard: "הקישור הועתק ללוח",
    totalVotes: "סך הצבעות",
    totalParticipants: "סך משתתפים",
    usedForAnalysis: "בשימוש לניתוח",
    moderatedVotesExplanation: "הצבעות על הצהרות שעברו מודרציה מוחרגות מהניתוח.",
    moderatedParticipantsExplanation: "משתתפים שהצביעו רק על הצהרות שעברו מודרציה מוחרגים מהניתוח.",
    surveyVotesExplanation: "הצבעות של משתתפים שלא השלימו את הסקר מוחרגות מהניתוח.",
    surveyParticipantsExplanation: "משתתפים שלא השלימו את הסקר מוחרגים מהניתוח.",
    maxdiffVotesExplanation: "הצבעות על פריטים שהושלמו או בוטלו מוחרגות מהדירוג.",
    maxdiffParticipantsExplanation: "משתתפים שהצביעו רק על פריטים שהושלמו או בוטלו מוחרגים מהדירוג.",
  },
  ja: {
    share: "共有",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
    totalVotes: "総投票数",
    totalParticipants: "総参加者数",
    usedForAnalysis: "分析に使用",
    moderatedVotesExplanation:
      "モデレートされた意見への投票は分析から除外されます。",
    moderatedParticipantsExplanation:
      "モデレートされた意見にのみ投票した参加者は分析から除外されます。",
    surveyVotesExplanation:
      "アンケートを完了していない参加者の投票は分析から除外されます。",
    surveyParticipantsExplanation:
      "アンケートを完了していない参加者は分析から除外されます。",
    maxdiffVotesExplanation:
      "完了およびキャンセルされた項目への投票はランキングから除外されます。",
    maxdiffParticipantsExplanation:
      "完了およびキャンセルされた項目にのみ投票した参加者はランキングから除外されます。",
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
    surveyVotesExplanation:
      "Сурамжылоону бүтүрө элек катышуучулардын добуштары анализден чыгарылат.",
    surveyParticipantsExplanation:
      "Сурамжылоону бүтүрө элек катышуучулар анализден чыгарылат.",
    maxdiffVotesExplanation:
      "Аяктаган жана жокко чыгарылган элементтерге берилген добуштар рейтингден чыгарылат.",
    maxdiffParticipantsExplanation:
      "Аяктаган жана жокко чыгарылган элементтерге гана добуш берген катышуучулар рейтингден чыгарылат.",
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
    surveyVotesExplanation:
      "Голоса участников, не завершивших опрос, исключены из анализа.",
    surveyParticipantsExplanation:
      "Участники, не завершившие опрос, исключены из анализа.",
    maxdiffVotesExplanation:
      "Голоса за завершённые и отменённые элементы исключены из рейтинга.",
    maxdiffParticipantsExplanation:
      "Участники, голосовавшие только за завершённые и отменённые элементы, исключены из рейтинга.",
  },
};
