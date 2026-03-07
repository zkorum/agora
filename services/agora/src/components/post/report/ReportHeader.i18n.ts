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
    footnote: "Excludes votes on moderated statements and associated participants.",
  },
  ar: {
    by: "بواسطة",
    of: "من",
    participants: "المشاركون",
    statements: "البيانات",
    votes: "الأصوات",
    footnote: "يستثني الأصوات على البيانات الخاضعة للإشراف والمشاركين المرتبطين بها.",
  },
  es: {
    by: "Por",
    of: "de",
    participants: "Participantes",
    statements: "Proposiciones",
    votes: "Votos",
    footnote: "Excluye los votos sobre proposiciones moderadas y los participantes asociados.",
  },
  fr: {
    by: "Par",
    of: "sur",
    participants: "Participants",
    statements: "Propositions",
    votes: "Votes",
    footnote: "Exclut les votes sur les propositions modérées et les participants associés.",
  },
  "zh-Hans": {
    by: "作者",
    of: "/",
    participants: "参与者",
    statements: "陈述",
    votes: "投票",
    footnote: "不包括对已审核陈述的投票及相关参与者。",
  },
  "zh-Hant": {
    by: "作者",
    of: "/",
    participants: "參與者",
    statements: "陳述",
    votes: "投票",
    footnote: "不包括對已審核陳述的投票及相關參與者。",
  },
  ja: {
    by: "投稿者",
    of: "/",
    participants: "参加者",
    statements: "意見",
    votes: "投票",
    footnote: "モデレート済み意見への投票と関連する参加者を除く。",
  },
};
