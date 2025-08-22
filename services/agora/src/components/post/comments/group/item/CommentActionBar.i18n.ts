export interface CommentActionBarTranslations {
  disagree: string;
  pass: string;
  agree: string;
  voteChangeDisabled: string;
  disagreeAriaLabel: string;
  passAriaLabel: string;
  agreeAriaLabel: string;
}

export const commentActionBarTranslations: Record<
  string,
  CommentActionBarTranslations
> = {
  en: {
    disagree: "Disagree",
    pass: "Pass",
    agree: "Agree",
    voteChangeDisabled: "Vote change temporarily disabled",
    disagreeAriaLabel: "Disagree with comment. Current disagrees:",
    passAriaLabel: "Pass on comment. Current passes:",
    agreeAriaLabel: "Agree with comment. Current agrees:",
  },
  es: {
    disagree: "En desacuerdo",
    pass: "Pasar",
    agree: "De acuerdo",
    voteChangeDisabled: "Cambio de voto temporalmente deshabilitado",
    disagreeAriaLabel: "En desacuerdo con el comentario. Desacuerdos actuales:",
    passAriaLabel: "Pasar del comentario. Pases actuales:",
    agreeAriaLabel: "De acuerdo con el comentario. Acuerdos actuales:",
  },
  fr: {
    disagree: "Pas d'accord",
    pass: "Passer",
    agree: "D'accord",
    voteChangeDisabled: "Changement de vote temporairement désactivé",
    disagreeAriaLabel: "Pas d'accord avec le commentaire. Désaccords actuels:",
    passAriaLabel: "Passer le commentaire. Passes actuels:",
    agreeAriaLabel: "D'accord avec le commentaire. Accords actuels:",
  },
};
