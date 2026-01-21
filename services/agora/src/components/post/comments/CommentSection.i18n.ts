import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentSectionTranslations {
  loadingOpinions: string;
  retrying: string;
  failedToLoadOpinions: string;
  noOpinionsAvailable: string;
  retryLoadingOpinions: string;
  voteUnlockSingular: string;
  voteUnlockPlural: string;
  notEnoughOpinions: string;
  clusteredBanner: string;
  viewAnalysis: string;
}

export const commentSectionTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentSectionTranslations
> = {
  en: {
    loadingOpinions: "Loading opinions...",
    retrying: "Retrying...",
    failedToLoadOpinions: "Failed to load opinions",
    noOpinionsAvailable: "No opinions available",
    retryLoadingOpinions: "Retry loading opinions",
    voteUnlockSingular: "1 more vote to unlock your group analysis",
    voteUnlockPlural: "{count} more votes to unlock your group analysis",
    notEnoughOpinions: "Create more opinions to vote on to allow opinion group mapping",
    clusteredBanner: "You have been assigned a group!",
    viewAnalysis: "View analysis",
  },
  ar: {
    loadingOpinions: "جاري تحميل الآراء...",
    retrying: "إعادة المحاولة...",
    failedToLoadOpinions: "فشل في تحميل الآراء",
    noOpinionsAvailable: "لا توجد آراء متاحة",
    retryLoadingOpinions: "إعادة محاولة تحميل الآراء",
    voteUnlockSingular: "صوت واحد آخر لفتح تحليل المجموعة الخاصة بك",
    voteUnlockPlural: "{count} أصوات أخرى لفتح تحليل المجموعة الخاصة بك",
    notEnoughOpinions: "أنشئ المزيد من الآراء للتصويت عليها للسماح بالتجميع",
    clusteredBanner: "تم تعيينك لمجموعة!",
    viewAnalysis: "عرض التحليل",
  },
  es: {
    loadingOpinions: "Cargando opiniones...",
    retrying: "Reintentando...",
    failedToLoadOpinions: "Error al cargar opiniones",
    noOpinionsAvailable: "No hay opiniones disponibles",
    retryLoadingOpinions: "Reintentar cargar opiniones",
    voteUnlockSingular: "1 voto más para desbloquear tu análisis de cluster",
    voteUnlockPlural: "{count} votos más para desbloquear tu análisis de cluster",
    notEnoughOpinions: "Crea más opiniones para votar y permitir el clustering",
    clusteredBanner: "¡Te han asignado un cluster!",
    viewAnalysis: "Ver análisis",
  },
  fr: {
    loadingOpinions: "Chargement des opinions...",
    retrying: "Nouvelle tentative...",
    failedToLoadOpinions: "Échec du chargement des opinions",
    noOpinionsAvailable: "Aucune opinion disponible",
    retryLoadingOpinions: "Réessayer de charger les opinions",
    voteUnlockSingular: "1 vote de plus pour débloquer votre analyse de cluster",
    voteUnlockPlural: "{count} votes de plus pour débloquer votre analyse de cluster",
    notEnoughOpinions: "Créez plus d'opinions pour voter et permettre le clustering",
    clusteredBanner: "Vous avez été assigné à un cluster!",
    viewAnalysis: "Voir l'analyse",
  },
  "zh-Hans": {
    loadingOpinions: "正在加载意见...",
    retrying: "重试中...",
    failedToLoadOpinions: "加载意见失败",
    noOpinionsAvailable: "暂无意见",
    retryLoadingOpinions: "重新加载意见",
    voteUnlockSingular: "再投 1 票即可解锁您的群组分析",
    voteUnlockPlural: "再投 {count} 票即可解锁您的群组分析",
    notEnoughOpinions: "创建更多意见以投票并允许聚类",
    clusteredBanner: "您已被分配到一个群组!",
    viewAnalysis: "查看分析",
  },
  "zh-Hant": {
    loadingOpinions: "正在載入意見...",
    retrying: "重試中...",
    failedToLoadOpinions: "載入意見失敗",
    noOpinionsAvailable: "暫無意見",
    retryLoadingOpinions: "重新載入意見",
    voteUnlockSingular: "再投 1 票即可解鎖您的群組分析",
    voteUnlockPlural: "再投 {count} 票即可解鎖您的群組分析",
    notEnoughOpinions: "創建更多意見以投票並允許聚類",
    clusteredBanner: "您已被分配到一個群組!",
    viewAnalysis: "查看分析",
  },
  ja: {
    loadingOpinions: "意見を読み込み中...",
    retrying: "再試行中...",
    failedToLoadOpinions: "意見の読み込みに失敗しました",
    noOpinionsAvailable: "意見はありません",
    retryLoadingOpinions: "意見の読み込みを再試行",
    voteUnlockSingular: "あと 1 票でクラスター分析をアンロック",
    voteUnlockPlural: "あと {count} 票でクラスター分析をアンロック",
    notEnoughOpinions: "クラスタリングを許可するために、投票するための意見をもっと作成してください",
    clusteredBanner: "クラスターに割り当てられました！",
    viewAnalysis: "分析を見る",
  },
};
