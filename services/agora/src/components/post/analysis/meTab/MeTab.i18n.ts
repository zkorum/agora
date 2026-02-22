export interface MeTabTranslations {
  whereDoIStandTitle: string;
  notAssignedToGroup: string;
  youAgreeWith: string;
  // Vote banner
  voteToUnlock: string;
  keepVotingToRefineAnalysis: string;
  voteMore: string;
}

export const meTabTranslations: Record<string, MeTabTranslations> = {
  en: {
    whereDoIStandTitle: "Where do I stand",
    notAssignedToGroup: "You are not assigned to any group",
    youAgreeWith: "You agree with",
    voteToUnlock: "Vote on more statements to unlock",
    keepVotingToRefineAnalysis: "Keep voting to refine the analysis",
    voteMore: "Vote more",
  },
  es: {
    whereDoIStandTitle: "¿Dónde me sitúo?",
    notAssignedToGroup: "No estás asignado a ningún grupo",
    youAgreeWith: "Estás de acuerdo con",
    voteToUnlock: "Vota más proposiciones para desbloquear",
    keepVotingToRefineAnalysis: "Sigue votando para refinar el análisis",
    voteMore: "Vota más",
  },
  fr: {
    whereDoIStandTitle: "Où je me situe",
    notAssignedToGroup: "Vous n'êtes assigné à aucun groupe",
    youAgreeWith: "Vous êtes d'accord avec",
    voteToUnlock: "Votez sur plus de propositions pour débloquer",
    keepVotingToRefineAnalysis: "Continuez à voter pour affiner l'analyse",
    voteMore: "Votez plus",
  },
  "zh-Hans": {
    whereDoIStandTitle: "我的立场",
    notAssignedToGroup: "您未被分配到任何群组",
    youAgreeWith: "您同意",
    voteToUnlock: "对更多观点投票以解锁",
    keepVotingToRefineAnalysis: "继续投票以完善分析",
    voteMore: "投票更多",
  },
  "zh-Hant": {
    whereDoIStandTitle: "我的立場",
    notAssignedToGroup: "您未被分配到任何群組",
    youAgreeWith: "您同意",
    voteToUnlock: "對更多觀點投票以解鎖",
    keepVotingToRefineAnalysis: "繼續投票以完善分析",
    voteMore: "投票更多",
  },
  ja: {
    whereDoIStandTitle: "私の立場",
    notAssignedToGroup: "グループに割り当てられていません",
    youAgreeWith: "あなたは同意します",
    voteToUnlock: "もっと主張に投票して解除する",
    keepVotingToRefineAnalysis: "投票を続けて分析を改善する",
    voteMore: "もっと投票する",
  },
};
