import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AsyncStateHandlerTranslations {
  loading: string;
  errorTitle: string;
  defaultErrorMessage: string;
  emptyMessage: string;
  retry: string;
}

export const asyncStateHandlerTranslations: Record<
  SupportedDisplayLanguageCodes,
  AsyncStateHandlerTranslations
> = {
  en: {
    loading: "Loading...",
    errorTitle: "Something went wrong",
    defaultErrorMessage: "An unexpected error occurred. Please try again.",
    emptyMessage: "No data available",
    retry: "Retry",
  },
  ar: {
    loading: "جاري التحميل...",
    errorTitle: "حدث خطأ ما",
    defaultErrorMessage: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    emptyMessage: "لا توجد بيانات متاحة",
    retry: "إعادة المحاولة",
  },
  es: {
    loading: "Cargando...",
    errorTitle: "Algo salió mal",
    defaultErrorMessage: "Ocurrió un error inesperado. Inténtalo de nuevo.",
    emptyMessage: "No hay datos disponibles",
    retry: "Reintentar",
  },
  fr: {
    loading: "Chargement...",
    errorTitle: "Quelque chose s'est mal passé",
    defaultErrorMessage:
      "Une erreur inattendue s'est produite. Veuillez réessayer.",
    emptyMessage: "Aucune donnée disponible",
    retry: "Réessayer",
  },
  "zh-Hans": {
    loading: "正在加载...",
    errorTitle: "出现了问题",
    defaultErrorMessage: "发生了意外错误。请重试。",
    emptyMessage: "没有可用数据",
    retry: "重试",
  },
  "zh-Hant": {
    loading: "正在載入...",
    errorTitle: "出現了問題",
    defaultErrorMessage: "發生了意外錯誤。請重試。",
    emptyMessage: "沒有可用資料",
    retry: "重試",
  },
  ja: {
    loading: "読み込み中...",
    errorTitle: "何かが間違っていました",
    defaultErrorMessage:
      "予期しないエラーが発生しました。もう一度お試しください。",
    emptyMessage: "利用可能なデータがありません",
    retry: "再試行",
  },
};
