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
};
