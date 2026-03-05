import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentSortingSelectorTranslations {
  filterTitle: string;
  discover: string;
  discoverDescription: string;
  new: string;
  newDescription: string;
  moderationHistory: string;
  moderationHistoryDescription: string;
  hidden: string;
  hiddenDescription: string;
  myVotes: string;
  myVotesDescription: string;
}

export const commentSortingSelectorTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentSortingSelectorTranslations
> = {
  en: {
    filterTitle: "Filter statements by:",
    discover: "Discover",
    discoverDescription: "Diverse and emerging statements to place you in a group and keep the analysis evolving",
    new: "New",
    newDescription: "Most recent statements",
    moderationHistory: "Moderation History",
    moderationHistoryDescription: "Moderated statements, kept for transparency but excluded from analysis",
    hidden: "Hidden",
    hiddenDescription: "Statements removed by moderators",
    myVotes: "My Votes",
    myVotesDescription: "Statements you've voted on",
  },
  ar: {
    filterTitle: "تصفية المقترحات حسب:",
    discover: "استكشف",
    discoverDescription: "مقترحات متنوعة وناشئة لوضعك في مجموعة وإبقاء التحليل متطورًا",
    new: "جديد",
    newDescription: "أحدث المقترحات",
    moderationHistory: "تاريخ الإشراف",
    moderationHistoryDescription: "مقترحات خاضعة للإشراف، محفوظة من باب الشفافية لكنها مستبعدة من التحليل",
    hidden: "مخفي",
    hiddenDescription: "مقترحات أزالها المشرفون",
    myVotes: "أصواتي",
    myVotesDescription: "مقترحات صوّتَ عليها",
  },
  es: {
    filterTitle: "Filtrar proposiciones por:",
    discover: "Descubrir",
    discoverDescription: "Proposiciones variadas y emergentes para asignarte a un grupo y mantener el análisis en evolución",
    new: "Nuevo",
    newDescription: "Proposiciones más recientes",
    moderationHistory: "Historial de moderación",
    moderationHistoryDescription: "Proposiciones moderadas, conservadas por transparencia pero excluidas del análisis",
    hidden: "Oculto",
    hiddenDescription: "Proposiciones eliminadas por moderadores",
    myVotes: "Mis Votos",
    myVotesDescription: "Proposiciones en las que has votado",
  },
  fr: {
    filterTitle: "Filtrer les propositions par :",
    discover: "Découvrir",
    discoverDescription: "Propositions variées et émergentes pour vous assigner un groupe et faire évoluer l'analyse",
    new: "Nouveau",
    newDescription: "Propositions les plus récentes",
    moderationHistory: "Historique de modération",
    moderationHistoryDescription: "Propositions modérées, conservées par transparence mais exclues de l'analyse",
    hidden: "Masqué",
    hiddenDescription: "Propositions supprimées par les modérateurs",
    myVotes: "Mes Votes",
    myVotesDescription: "Propositions pour lesquelles vous avez voté",
  },
  "zh-Hans": {
    filterTitle: "按以下方式筛选观点：",
    discover: "发现",
    discoverDescription: "多元与新兴观点，帮助将您分配到群组并推动分析持续演进",
    new: "最新",
    newDescription: "最新的观点",
    moderationHistory: "审核历史",
    moderationHistoryDescription: "已审核的观点，为透明保留但不参与分析",
    hidden: "已隐藏",
    hiddenDescription: "被管理员移除的观点",
    myVotes: "我的投票",
    myVotesDescription: "你已投票的观点",
  },
  "zh-Hant": {
    filterTitle: "按以下方式篩選觀點：",
    discover: "發現",
    discoverDescription: "多元與新興觀點，幫助將您分配到群組並推動分析持續演進",
    new: "最新",
    newDescription: "最新的觀點",
    moderationHistory: "審核歷史",
    moderationHistoryDescription: "已審核的觀點，為透明保留但不參與分析",
    hidden: "已隱藏",
    hiddenDescription: "被管理員移除的觀點",
    myVotes: "我的投票",
    myVotesDescription: "你已投票的觀點",
  },
  ja: {
    filterTitle: "主張を以下でフィルター：",
    discover: "発見",
    discoverDescription: "多様な主張や新たな主張で、グループへの割り当てと分析の進化を促します",
    new: "新着",
    newDescription: "最新の主張",
    moderationHistory: "モデレーション履歴",
    moderationHistoryDescription: "モデレート済みの主張、透明性のため保持するが分析からは除外",
    hidden: "非表示",
    hiddenDescription: "モデレーターが削除した主張",
    myVotes: "自分の投票",
    myVotesDescription: "投票した主張",
  },
};
