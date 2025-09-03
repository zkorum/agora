export interface ConsensusItemTranslations {
  agree: string;
  pass: string;
  disagree: string;
  noVote: string;
}

export const consensusItemTranslations: Record<
  string,
  ConsensusItemTranslations
> = {
  en: {
    agree: "Agree",
    pass: "Unsure",
    disagree: "Disagree",
    noVote: "No Vote",
  },
  ar: {
    agree: "أوافق",
    pass: "غير متأكد",
    disagree: "لا أوافق",
    noVote: "لم أصوّت",
  },
  es: {
    agree: "De acuerdo",
    pass: "No seguro",
    disagree: "En desacuerdo",
    noVote: "Sin voto",
  },
  fr: {
    agree: "D'accord",
    pass: "Incertain",
    disagree: "Pas d'accord",
    noVote: "Pas de vote",
  },
  "zh-Hans": {
    agree: "同意",
    pass: "不确定",
    disagree: "不同意",
    noVote: "不投票",
  },
  "zh-Hant": {
    agree: "同意",
    pass: "不確定",
    disagree: "不同意",
    noVote: "不投票",
  },
  ja: {
    agree: "同意",
    pass: "わからない",
    disagree: "不同意",
    noVote: "不投票",
  },
};
