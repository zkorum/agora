import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentSectionTranslations {
  opinionNotFound: string;
  opinionRemovedByModerators: string;
  loadingOpinions: string;
  retrying: string;
  failedToLoadOpinions: string;
  noOpinionsAvailable: string;
  retryLoadingOpinions: string;
}

export const commentSectionTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentSectionTranslations
> = {
  en: {
    opinionNotFound: "Opinion not found:",
    opinionRemovedByModerators:
      "This opinion has been removed by the moderators",
    loadingOpinions: "Loading opinions...",
    retrying: "Retrying...",
    failedToLoadOpinions: "Failed to load opinions",
    noOpinionsAvailable: "No opinions available",
    retryLoadingOpinions: "Retry loading opinions",
  },
  ar: {
    opinionNotFound: "الرأي غير موجود",
    opinionRemovedByModerators: "تمت إزالة هذا الرأي من قبل المشرفين",
    loadingOpinions: "جاري تحميل الآراء...",
    retrying: "إعادة المحاولة...",
    failedToLoadOpinions: "فشل في تحميل الآراء",
    noOpinionsAvailable: "لا توجد آراء متاحة",
    retryLoadingOpinions: "إعادة محاولة تحميل الآراء",
  },
  es: {
    opinionNotFound: "Opinión no encontrada:",
    opinionRemovedByModerators:
      "Esta opinión ha sido eliminada por los moderadores",
    loadingOpinions: "Cargando opiniones...",
    retrying: "Reintentando...",
    failedToLoadOpinions: "Error al cargar opiniones",
    noOpinionsAvailable: "No hay opiniones disponibles",
    retryLoadingOpinions: "Reintentar cargar opiniones",
  },
  fr: {
    opinionNotFound: "Opinion introuvable:",
    opinionRemovedByModerators:
      "Cette opinion a été supprimée par les modérateurs",
    loadingOpinions: "Chargement des opinions...",
    retrying: "Nouvelle tentative...",
    failedToLoadOpinions: "Échec du chargement des opinions",
    noOpinionsAvailable: "Aucune opinion disponible",
    retryLoadingOpinions: "Réessayer de charger les opinions",
  },
  "zh-Hans": {
    opinionNotFound: "未找到意见：",
    opinionRemovedByModerators: "此意见已被版主移除",
    loadingOpinions: "正在加载意见...",
    retrying: "重试中...",
    failedToLoadOpinions: "加载意见失败",
    noOpinionsAvailable: "暂无意见",
    retryLoadingOpinions: "重新加载意见",
  },
  "zh-Hant": {
    opinionNotFound: "未找到意見：",
    opinionRemovedByModerators: "此意見已被版主移除",
    loadingOpinions: "正在載入意見...",
    retrying: "重試中...",
    failedToLoadOpinions: "載入意見失敗",
    noOpinionsAvailable: "暫無意見",
    retryLoadingOpinions: "重新載入意見",
  },
  ja: {
    opinionNotFound: "意見が見つかりません：",
    opinionRemovedByModerators: "この意見はモデレーターによって削除されました",
    loadingOpinions: "意見を読み込み中...",
    retrying: "再試行中...",
    failedToLoadOpinions: "意見の読み込みに失敗しました",
    noOpinionsAvailable: "意見はありません",
    retryLoadingOpinions: "意見の読み込みを再試行",
  },
};
