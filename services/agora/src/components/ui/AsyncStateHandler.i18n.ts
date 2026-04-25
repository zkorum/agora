import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AsyncStateHandlerTranslations {
  loading: string;
  retrying: string;
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
    retrying: "Retrying...",
    errorTitle: "Something went wrong",
    defaultErrorMessage: "An unexpected error occurred. Please try again.",
    emptyMessage: "No data available",
    retry: "Retry",
  },
  ar: {
    loading: "جاري التحميل...",
    retrying: "جاري إعادة المحاولة...",
    errorTitle: "حدث خطأ ما",
    defaultErrorMessage: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    emptyMessage: "لا توجد بيانات متاحة",
    retry: "إعادة المحاولة",
  },
  es: {
    loading: "Cargando...",
    retrying: "Reintentando...",
    errorTitle: "Algo salió mal",
    defaultErrorMessage: "Ocurrió un error inesperado. Inténtalo de nuevo.",
    emptyMessage: "No hay datos disponibles",
    retry: "Reintentar",
  },
  fa: { loading: "در حال بارگذاری...", retrying: "تلاش مجدد...", errorTitle: "مشکلی پیش آمد", defaultErrorMessage: "خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.", emptyMessage: "داده‌ای موجود نیست", retry: "تلاش مجدد" },
  fr: {
    loading: "Chargement...",
    retrying: "Nouvelle tentative...",
    errorTitle: "Quelque chose s'est mal passé",
    defaultErrorMessage:
      "Une erreur inattendue s'est produite. Veuillez réessayer.",
    emptyMessage: "Aucune donnée disponible",
    retry: "Réessayer",
  },
  "zh-Hans": {
    loading: "正在加载...",
    retrying: "重试中...",
    errorTitle: "出现了问题",
    defaultErrorMessage: "发生了意外错误。请重试。",
    emptyMessage: "没有可用数据",
    retry: "重试",
  },
  "zh-Hant": {
    loading: "正在載入...",
    retrying: "重試中...",
    errorTitle: "出現了問題",
    defaultErrorMessage: "發生了意外錯誤。請重試。",
    emptyMessage: "沒有可用資料",
    retry: "重試",
  },
  he: { loading: "...טוען", retrying: "...מנסה שוב", errorTitle: "משהו השתבש", defaultErrorMessage: "אירעה שגיאה בלתי צפויה. אנא נסו שוב.", emptyMessage: "אין נתונים זמינים", retry: "נסה שוב" },
  ja: {
    loading: "読み込み中...",
    retrying: "再試行中...",
    errorTitle: "何かが間違っていました",
    defaultErrorMessage:
      "予期しないエラーが発生しました。もう一度お試しください。",
    emptyMessage: "利用可能なデータがありません",
    retry: "再試行",
  },
  ky: {
    loading: "Жүктөлүүдө...",
    retrying: "Кайра аракет кылынууда...",
    errorTitle: "Бир нерсе туура эмес болду",
    defaultErrorMessage: "Күтүлбөгөн ката кетти. Кайра аракет кылыңыз.",
    emptyMessage: "Маалыматтар жеткиликтүү эмес",
    retry: "Кайра аракет",
  },
  ru: {
    loading: "Загрузка...",
    retrying: "Повторная попытка...",
    errorTitle: "Что-то пошло не так",
    defaultErrorMessage:
      "Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.",
    emptyMessage: "Данные недоступны",
    retry: "Повторить",
  },
};
