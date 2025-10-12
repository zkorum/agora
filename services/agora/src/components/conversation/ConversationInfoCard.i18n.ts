import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationInfoCardTranslations {
  opinions: string;
  participants: string;
  votes: string;
}

export const conversationInfoCardTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationInfoCardTranslations
> = {
  en: {
    opinions: "opinions",
    participants: "participants",
    votes: "votes",
  },
  ar: {
    opinions: "آراء",
    participants: "مشاركون",
    votes: "أصوات",
  },
  es: {
    opinions: "opiniones",
    participants: "participantes",
    votes: "votos",
  },
  fr: {
    opinions: "opinions",
    participants: "participants",
    votes: "votes",
  },
  "zh-Hans": {
    opinions: "意见",
    participants: "参与者",
    votes: "投票",
  },
  "zh-Hant": {
    opinions: "意見",
    participants: "參與者",
    votes: "投票",
  },
  ja: {
    opinions: "意見",
    participants: "参加者",
    votes: "投票",
  },
};
