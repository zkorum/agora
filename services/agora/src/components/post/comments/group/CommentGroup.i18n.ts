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
    noOpinionsMessage: "There are no statements in this conversation filter.",
    loadingOpinions: "Loading statements...",
    retrying: "Retrying...",
    opinionsLoadFailed: "Statements could not be loaded",
    unexpectedErrorRetry: "Something went wrong. Please try again.",
    retryLoadOpinions: "Retry loading statements",
  },
  ar: {
    noOpinionsMessage: "لا توجد مقترحات في هذا مرشح المحادثة.",
    loadingOpinions: "جاري تحميل المقترحات...",
    retrying: "جاري إعادة المحاولة...",
    opinionsLoadFailed: "لا يمكن تحميل المقترحات",
    unexpectedErrorRetry: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    retryLoadOpinions: "إعادة تحميل المقترحات",
  },
  es: {
    noOpinionsMessage: "No hay proposiciones en este filtro de conversación.",
    loadingOpinions: "Cargando proposiciones...",
    retrying: "Reintentando...",
    opinionsLoadFailed: "No se pudieron cargar las proposiciones",
    unexpectedErrorRetry: "Algo salió mal. Inténtalo de nuevo.",
    retryLoadOpinions: "Reintentar carga de proposiciones",
  },
  fr: {
    noOpinionsMessage:
      "Il n'y a pas de propositions dans ce filtre de conversation.",
    loadingOpinions: "Chargement des propositions...",
    retrying: "Nouvelle tentative...",
    opinionsLoadFailed: "Les propositions n'ont pas pu être chargées",
    unexpectedErrorRetry: "Quelque chose s'est mal passé. Veuillez réessayer.",
    retryLoadOpinions: "Réessayer le chargement des propositions",
  },
  "zh-Hans": {
    noOpinionsMessage: "此对话筛选器中没有观点。",
    loadingOpinions: "正在加载观点...",
    retrying: "正在重试...",
    opinionsLoadFailed: "无法加载观点",
    unexpectedErrorRetry: "出现了一些问题。请重试。",
    retryLoadOpinions: "重试加载观点",
  },
  "zh-Hant": {
    noOpinionsMessage: "此對話篩選器中沒有觀點。",
    loadingOpinions: "正在載入觀點...",
    retrying: "正在重試...",
    opinionsLoadFailed: "無法載入觀點",
    unexpectedErrorRetry: "發生了一些問題。請重試。",
    retryLoadOpinions: "重試載入觀點",
  },
  ja: {
    noOpinionsMessage: "この会話フィルターには主張がありません。",
    loadingOpinions: "主張を読み込み中...",
    retrying: "再試行中...",
    opinionsLoadFailed: "主張を読み込めませんでした",
    unexpectedErrorRetry:
      "何らかの問題が発生しました。もう一度お試しください。",
    retryLoadOpinions: "主張の読み込みを再試行",
  },
};
