import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationPageTranslations {
  errorTitle: string;
  retryButton: string;
}

export const conversationPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationPageTranslations
> = {
  en: {
    errorTitle: "Something went wrong",
    retryButton: "Retry",
  },
  ar: {
    errorTitle: "حدث خطأ ما",
    retryButton: "إعادة المحاولة",
  },
  es: {
    errorTitle: "Algo salió mal",
    retryButton: "Reintentar",
  },
  fa: {
    errorTitle: "مشکلی پیش آمد",
    retryButton: "تلاش مجدد",
  },
  he: {
    errorTitle: "משהו השתבש",
    retryButton: "נסה שוב",
  },
  fr: {
    errorTitle: "Une erreur est survenue",
    retryButton: "Réessayer",
  },
  "zh-Hans": {
    errorTitle: "出了点问题",
    retryButton: "重试",
  },
  "zh-Hant": {
    errorTitle: "出了點問題",
    retryButton: "重試",
  },
  ja: {
    errorTitle: "問題が発生しました",
    retryButton: "再試行",
  },
  ky: {
    errorTitle: "Бир нерсе туура эмес болду",
    retryButton: "Кайра аракет",
  },
  ru: {
    errorTitle: "Что-то пошло не так",
    retryButton: "Повторить",
  },
};
