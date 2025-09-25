import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentSectionTranslations {
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
    loadingOpinions: "Loading opinions...",
    retrying: "Retrying...",
    failedToLoadOpinions: "Failed to load opinions",
    noOpinionsAvailable: "No opinions available",
    retryLoadingOpinions: "Retry loading opinions",
  },
  ar: {
    loadingOpinions: "جاري تحميل الآراء...",
    retrying: "إعادة المحاولة...",
    failedToLoadOpinions: "فشل في تحميل الآراء",
    noOpinionsAvailable: "لا توجد آراء متاحة",
    retryLoadingOpinions: "إعادة محاولة تحميل الآراء",
  },
  es: {
    loadingOpinions: "Cargando opiniones...",
    retrying: "Reintentando...",
    failedToLoadOpinions: "Error al cargar opiniones",
    noOpinionsAvailable: "No hay opiniones disponibles",
    retryLoadingOpinions: "Reintentar cargar opiniones",
  },
  fr: {
    loadingOpinions: "Chargement des opinions...",
    retrying: "Nouvelle tentative...",
    failedToLoadOpinions: "Échec du chargement des opinions",
    noOpinionsAvailable: "Aucune opinion disponible",
    retryLoadingOpinions: "Réessayer de charger les opinions",
  },
  "zh-Hans": {
    loadingOpinions: "正在加载意见...",
    retrying: "重试中...",
    failedToLoadOpinions: "加载意见失败",
    noOpinionsAvailable: "暂无意见",
    retryLoadingOpinions: "重新加载意见",
  },
  "zh-Hant": {
    loadingOpinions: "正在載入意見...",
    retrying: "重試中...",
    failedToLoadOpinions: "載入意見失敗",
    noOpinionsAvailable: "暫無意見",
    retryLoadingOpinions: "重新載入意見",
  },
  ja: {
    loadingOpinions: "意見を読み込み中...",
    retrying: "再試行中...",
    failedToLoadOpinions: "意見の読み込みに失敗しました",
    noOpinionsAvailable: "意見はありません",
    retryLoadingOpinions: "意見の読み込みを再試行",
  },
};
