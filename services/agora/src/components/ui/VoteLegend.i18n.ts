import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VoteLegendTranslations {
  agree: string;
  unsure: string;
  disagree: string;
  noVote: string;
}

export const voteLegendTranslations: Record<
  SupportedDisplayLanguageCodes,
  VoteLegendTranslations
> = {
  en: {
    agree: "Agree",
    unsure: "Unsure",
    disagree: "Disagree",
    noVote: "No Vote",
  },
  ar: {
    agree: "أوافق",
    unsure: "غير متأكد",
    disagree: "لا أوافق",
    noVote: "لم أصوّت",
  },
  es: {
    agree: "De acuerdo",
    unsure: "No seguro",
    disagree: "En desacuerdo",
    noVote: "Sin voto",
  },
  fr: {
    agree: "D'accord",
    unsure: "Incertain",
    disagree: "Pas d'accord",
    noVote: "Pas de vote",
  },
  "zh-Hans": {
    agree: "同意",
    unsure: "不确定",
    disagree: "不同意",
    noVote: "不投票",
  },
  "zh-Hant": {
    agree: "同意",
    unsure: "不確定",
    disagree: "不同意",
    noVote: "不投票",
  },
  ja: {
    agree: "同意",
    unsure: "わからない",
    disagree: "同意しない",
    noVote: "投票しない",
  },
};
