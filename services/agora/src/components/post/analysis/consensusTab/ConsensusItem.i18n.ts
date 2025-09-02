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
    pass: "Pass",
    disagree: "Disagree",
    noVote: "No Vote",
  },
  ar: {
    agree: "أوافق",
    pass: "تخطي",
    disagree: "لا أوافق",
    noVote: "لم أصوّت",
  },
  es: {
    agree: "De acuerdo",
    pass: "Pasar",
    disagree: "En desacuerdo",
    noVote: "Sin voto",
  },
  fr: {
    agree: "D'accord",
    pass: "Passer",
    disagree: "Pas d'accord",
    noVote: "Pas de vote",
  },
  "zh-Hans": {
    agree: "同意",
    pass: "通过",
    disagree: "不同意",
    noVote: "不投票",
  },
  "zh-Hant": {
    agree: "同意",
    pass: "通過",
    disagree: "不同意",
    noVote: "不投票",
  },
  ja: {
    agree: "同意",
    pass: "通過",
    disagree: "不同意",
    noVote: "不投票",
  },
};
