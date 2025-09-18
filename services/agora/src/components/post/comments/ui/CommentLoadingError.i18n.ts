import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentLoadingErrorTranslations {
  defaultRetryLabel: string;
  defaultErrorMessage: string;
}

export const commentLoadingErrorTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentLoadingErrorTranslations
> = {
  en: {
    defaultRetryLabel: "Try again",
    defaultErrorMessage: "Something went wrong. Please try again.",
  },
  ar: {
    defaultRetryLabel: "حاول مرة أخرى",
    defaultErrorMessage: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  },
  es: {
    defaultRetryLabel: "Intentar de nuevo",
    defaultErrorMessage: "Algo salió mal. Inténtalo de nuevo.",
  },
  fr: {
    defaultRetryLabel: "Réessayer",
    defaultErrorMessage: "Quelque chose s'est mal passé. Veuillez réessayer.",
  },
  "zh-Hans": {
    defaultRetryLabel: "重试",
    defaultErrorMessage: "出现了一些问题。请重试。",
  },
  "zh-Hant": {
    defaultRetryLabel: "重試",
    defaultErrorMessage: "發生了一些問題。請重試。",
  },
  ja: {
    defaultRetryLabel: "再試行",
    defaultErrorMessage: "何らかの問題が発生しました。もう一度お試しください。",
  },
};
