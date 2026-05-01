import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportHeaderTranslations {
  by: string;
  of: string;
  participants: string;
  statements: string;
  votes: string;
  footnote: string;
}

export const reportHeaderTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportHeaderTranslations
> = {
  en: {
    by: "By",
    of: "of",
    participants: "Participants",
    statements: "Statements",
    votes: "Votes",
    footnote: "Votes on moderated statements are excluded from the analysis.",
  },
  ar: {
    by: "بواسطة",
    of: "من",
    participants: "المشاركون",
    statements: "البيانات",
    votes: "الأصوات",
    footnote: "الأصوات على البيانات الخاضعة للإشراف مستثناة من التحليل.",
  },
  es: {
    by: "Por",
    of: "de",
    participants: "Participantes",
    statements: "Proposiciones",
    votes: "Votos",
    footnote: "Los votos sobre las proposiciones moderadas están excluidos del análisis.",
  },
  fa: { by: "توسط", of: "از", participants: "شرکت‌کنندگان", statements: "گزاره‌ها", votes: "رأی‌ها", footnote: "رأی‌های مربوط به گزاره‌های مدیریت‌شده از تحلیل حذف شده‌اند." },
  fr: {
    by: "Par",
    of: "sur",
    participants: "Participants",
    statements: "Propositions",
    votes: "Votes",
    footnote: "Les votes sur les propositions modérées sont exclus de l'analyse.",
  },
  "zh-Hans": {
    by: "作者",
    of: "/",
    participants: "参与者",
    statements: "观点",
    votes: "投票",
    footnote: "已审核观点的投票不纳入分析。",
  },
  "zh-Hant": {
    by: "作者",
    of: "/",
    participants: "參與者",
    statements: "觀點",
    votes: "投票",
    footnote: "已審核觀點的投票不納入分析。",
  },
  he: { by: "מאת", of: "מתוך", participants: "משתתפים", statements: "הצהרות", votes: "הצבעות", footnote: "הצבעות על הצהרות שעברו מודרציה מוחרגות מהניתוח." },
  ja: {
    by: "投稿者",
    of: "/",
    participants: "参加者",
    statements: "意見",
    votes: "投票",
    footnote: "モデレート済み意見への投票は分析から除外されています。",
  },
  ky: {
    by: "Автор",
    of: "/",
    participants: "Катышуучулар",
    statements: "Пикирлер",
    votes: "Добуштар",
    footnote: "Модерацияланган пикирлерге берилген добуштар анализден чыгарылган.",
  },
  ru: {
    by: "Автор",
    of: "из",
    participants: "Участники",
    statements: "Высказывания",
    votes: "Голоса",
    footnote: "Голоса за модерированные высказывания исключены из анализа.",
  },
};
