import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentGroupTranslations {
  noOpinionsMessage: string;
  loadingOpinions: string;
  retrying: string;
  opinionsLoadFailed: string;
  unexpectedErrorRetry: string;
  retryLoadOpinions: string;
}

export const commentGroupTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentGroupTranslations
> = {
  en: {
    noOpinionsMessage: "There are no opinions in this conversation filter.",
    loadingOpinions: "Loading opinions...",
    retrying: "Retrying...",
    opinionsLoadFailed: "Opinions could not be loaded",
    unexpectedErrorRetry: "Something went wrong. Please try again.",
    retryLoadOpinions: "Retry loading opinions",
  },
  ar: {
    noOpinionsMessage: "لا توجد آراء في هذا مرشح المحادثة.",
    loadingOpinions: "جاري تحميل الآراء...",
    retrying: "جاري إعادة المحاولة...",
    opinionsLoadFailed: "لا يمكن تحميل الآراء",
    unexpectedErrorRetry: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    retryLoadOpinions: "إعادة تحميل الآراء",
  },
  es: {
    noOpinionsMessage: "No hay opiniones en este filtro de conversación.",
    loadingOpinions: "Cargando opiniones...",
    retrying: "Reintentando...",
    opinionsLoadFailed: "No se pudieron cargar las opiniones",
    unexpectedErrorRetry: "Algo salió mal. Inténtalo de nuevo.",
    retryLoadOpinions: "Reintentar carga de opiniones",
  },
  fr: {
    noOpinionsMessage:
      "Il n'y a pas d'opinions dans ce filtre de conversation.",
    loadingOpinions: "Chargement des opinions...",
    retrying: "Nouvelle tentative...",
    opinionsLoadFailed: "Les opinions n'ont pas pu être chargées",
    unexpectedErrorRetry: "Quelque chose s'est mal passé. Veuillez réessayer.",
    retryLoadOpinions: "Réessayer le chargement des opinions",
  },
  "zh-Hans": {
    noOpinionsMessage: "此对话筛选器中没有意见。",
    loadingOpinions: "正在加载意见...",
    retrying: "正在重试...",
    opinionsLoadFailed: "无法加载意见",
    unexpectedErrorRetry: "出现了一些问题。请重试。",
    retryLoadOpinions: "重试加载意见",
  },
  "zh-Hant": {
    noOpinionsMessage: "此對話篩選器中沒有意見。",
    loadingOpinions: "正在載入意見...",
    retrying: "正在重試...",
    opinionsLoadFailed: "無法載入意見",
    unexpectedErrorRetry: "發生了一些問題。請重試。",
    retryLoadOpinions: "重試載入意見",
  },
  ja: {
    noOpinionsMessage: "この会話フィルターには意見がありません。",
    loadingOpinions: "意見を読み込み中...",
    retrying: "再試行中...",
    opinionsLoadFailed: "意見を読み込めませんでした",
    unexpectedErrorRetry:
      "何らかの問題が発生しました。もう一度お試しください。",
    retryLoadOpinions: "意見の読み込みを再試行",
  },
};
