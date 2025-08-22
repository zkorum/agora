export interface MeTabTranslations {
  whereDoIStandTitle: string;
  voteMoreToUnlock: string;
  youAgreeWith: string;
}

export const meTabTranslations: Record<string, MeTabTranslations> = {
  en: {
    whereDoIStandTitle: "Where do I stand",
    voteMoreToUnlock: "Vote on more opinions to unlock",
    youAgreeWith: "You agree with",
  },
  es: {
    whereDoIStandTitle: "¿Dónde me sitúo?",
    voteMoreToUnlock: "Vota más opiniones para desbloquear",
    youAgreeWith: "Estás de acuerdo con",
  },
  fr: {
    whereDoIStandTitle: "Où je me situe",
    voteMoreToUnlock: "Votez sur plus d'opinions pour débloquer",
    youAgreeWith: "Vous êtes d'accord avec",
  },
};
