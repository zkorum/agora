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
    loadingOpinions: "Loading statements...",
    retrying: "Retrying...",
    failedToLoadOpinions: "Failed to load statements",
    noOpinionsAvailable: "No statements available",
    retryLoadingOpinions: "Retry loading statements",
    voteUnlockSingular: "1 more vote to unlock your group analysis",
    voteUnlockPlural: "{count} more votes to unlock your group analysis",
    notEnoughOpinions: "Create more statements to vote on to allow opinion group mapping",
    clusteredBanner: "You have been assigned a group!",
    viewAnalysis: "View analysis",
  },
  ar: {
    loadingOpinions: "جاري تحميل المقترحات...",
    retrying: "إعادة المحاولة...",
    failedToLoadOpinions: "فشل في تحميل المقترحات",
    noOpinionsAvailable: "لا توجد مقترحات متاحة",
    retryLoadingOpinions: "إعادة محاولة تحميل المقترحات",
    voteUnlockSingular: "صوت واحد آخر لفتح تحليل المجموعة الخاصة بك",
    voteUnlockPlural: "{count} أصوات أخرى لفتح تحليل المجموعة الخاصة بك",
    notEnoughOpinions: "أنشئ المزيد من المقترحات للتصويت عليها للسماح بالتجميع",
    clusteredBanner: "تم تعيينك لمجموعة!",
    viewAnalysis: "عرض التحليل",
  },
  es: {
    loadingOpinions: "Cargando proposiciones...",
    retrying: "Reintentando...",
    failedToLoadOpinions: "Error al cargar proposiciones",
    noOpinionsAvailable: "No hay proposiciones disponibles",
    retryLoadingOpinions: "Reintentar cargar proposiciones",
    voteUnlockSingular: "1 voto más para desbloquear tu análisis de cluster",
    voteUnlockPlural: "{count} votos más para desbloquear tu análisis de cluster",
    notEnoughOpinions: "Crea más proposiciones para votar y permitir el clustering",
    clusteredBanner: "¡Te han asignado un cluster!",
    viewAnalysis: "Ver análisis",
  },
  fr: {
    loadingOpinions: "Chargement des propositions...",
    retrying: "Nouvelle tentative...",
    failedToLoadOpinions: "Échec du chargement des propositions",
    noOpinionsAvailable: "Aucune proposition disponible",
    retryLoadingOpinions: "Réessayer de charger les propositions",
    voteUnlockSingular: "1 vote de plus pour débloquer votre analyse de cluster",
    voteUnlockPlural: "{count} votes de plus pour débloquer votre analyse de cluster",
    notEnoughOpinions: "Créez plus de propositions pour voter et permettre le clustering",
    clusteredBanner: "Vous avez été assigné à un cluster!",
    viewAnalysis: "Voir l'analyse",
  },
  "zh-Hans": {
    loadingOpinions: "正在加载观点...",
    retrying: "重试中...",
    failedToLoadOpinions: "加载观点失败",
    noOpinionsAvailable: "暂无观点",
    retryLoadingOpinions: "重新加载观点",
    voteUnlockSingular: "再投 1 票即可解锁您的群组分析",
    voteUnlockPlural: "再投 {count} 票即可解锁您的群组分析",
    notEnoughOpinions: "创建更多观点以投票并允许聚类",
    clusteredBanner: "您已被分配到一个群组!",
    viewAnalysis: "查看分析",
  },
  "zh-Hant": {
    loadingOpinions: "正在載入觀點...",
    retrying: "重試中...",
    failedToLoadOpinions: "載入觀點失敗",
    noOpinionsAvailable: "暫無觀點",
    retryLoadingOpinions: "重新載入觀點",
    voteUnlockSingular: "再投 1 票即可解鎖您的群組分析",
    voteUnlockPlural: "再投 {count} 票即可解鎖您的群組分析",
    notEnoughOpinions: "創建更多觀點以投票並允許聚類",
    clusteredBanner: "您已被分配到一個群組!",
    viewAnalysis: "查看分析",
  },
  ja: {
    loadingOpinions: "主張を読み込み中...",
    retrying: "再試行中...",
    failedToLoadOpinions: "主張の読み込みに失敗しました",
    noOpinionsAvailable: "主張はありません",
    retryLoadingOpinions: "主張の読み込みを再試行",
    voteUnlockSingular: "あと 1 票でクラスター分析をアンロック",
    voteUnlockPlural: "あと {count} 票でクラスター分析をアンロック",
    notEnoughOpinions: "クラスタリングを許可するために、投票するための主張をもっと作成してください",
    clusteredBanner: "クラスターに割り当てられました！",
    viewAnalysis: "分析を見る",
  },
};
