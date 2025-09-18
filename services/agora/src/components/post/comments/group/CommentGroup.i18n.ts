import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentGroupTranslations {
  noOpinionsMessage: string;
  loadingComments: string;
  retrying: string;
  commentsLoadFailed: string;
  unexpectedErrorRetry: string;
  retryLoadComments: string;
}

export const commentGroupTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentGroupTranslations
> = {
  en: {
    noOpinionsMessage: "There are no opinions in this conversation filter.",
    loadingComments: "Loading comments...",
    retrying: "Retrying...",
    commentsLoadFailed: "Comments could not be loaded",
    unexpectedErrorRetry: "Something went wrong. Please try again.",
    retryLoadComments: "Retry",
  },
  ar: {
    noOpinionsMessage: "لا توجد آراء في هذا مرشح المحادثة.",
    loadingComments: "جاري تحميل التعليقات...",
    retrying: "جاري إعادة المحاولة...",
    commentsLoadFailed: "لا يمكن تحميل التعليقات",
    unexpectedErrorRetry: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    retryLoadComments: "إعادة المحاولة",
  },
  es: {
    noOpinionsMessage: "No hay opiniones en este filtro de conversación.",
    loadingComments: "Cargando comentarios...",
    retrying: "Reintentando...",
    commentsLoadFailed: "No se pudieron cargar los comentarios",
    unexpectedErrorRetry: "Algo salió mal. Inténtalo de nuevo.",
    retryLoadComments: "Reintentar",
  },
  fr: {
    noOpinionsMessage:
      "Il n'y a pas d'opinions dans ce filtre de conversation.",
    loadingComments: "Chargement des commentaires...",
    retrying: "Nouvelle tentative...",
    commentsLoadFailed: "Les commentaires n'ont pas pu être chargés",
    unexpectedErrorRetry: "Quelque chose s'est mal passé. Veuillez réessayer.",
    retryLoadComments: "Réessayer",
  },
  "zh-Hans": {
    noOpinionsMessage: "此对话筛选器中没有意见。",
    loadingComments: "正在加载评论...",
    retrying: "正在重试...",
    commentsLoadFailed: "无法加载评论",
    unexpectedErrorRetry: "出现了一些问题。请重试。",
    retryLoadComments: "重试",
  },
  "zh-Hant": {
    noOpinionsMessage: "此對話篩選器中沒有意見。",
    loadingComments: "正在載入評論...",
    retrying: "正在重試...",
    commentsLoadFailed: "無法載入評論",
    unexpectedErrorRetry: "發生了一些問題。請重試。",
    retryLoadComments: "重試",
  },
  ja: {
    noOpinionsMessage: "この会話フィルターには意見がありません。",
    loadingComments: "コメントを読み込み中...",
    retrying: "再試行中...",
    commentsLoadFailed: "コメントを読み込めませんでした",
    unexpectedErrorRetry:
      "何らかの問題が発生しました。もう一度お試しください。",
    retryLoadComments: "再試行",
  },
};
