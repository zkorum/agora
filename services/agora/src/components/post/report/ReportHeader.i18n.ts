import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportHeaderTranslations {
  by: string;
  participants: string;
  statements: string;
  votes: string;
}

export const reportHeaderTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportHeaderTranslations
> = {
  en: {
    by: "By",
    participants: "Participants",
    statements: "Statements",
    votes: "Votes",
  },
  ar: {
    by: "بواسطة",
    participants: "المشاركون",
    statements: "البيانات",
    votes: "الأصوات",
  },
  es: {
    by: "Por",
    participants: "Participantes",
    statements: "Proposiciones",
    votes: "Votos",
  },
  fr: {
    by: "Par",
    participants: "Participants",
    statements: "Propositions",
    votes: "Votes",
  },
  "zh-Hans": {
    by: "作者",
    participants: "参与者",
    statements: "陈述",
    votes: "投票",
  },
  "zh-Hant": {
    by: "作者",
    participants: "參與者",
    statements: "陳述",
    votes: "投票",
  },
  ja: {
    by: "投稿者",
    participants: "参加者",
    statements: "意見",
    votes: "投票",
  },
};
