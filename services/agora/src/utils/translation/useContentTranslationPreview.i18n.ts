import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ContentTranslationPreviewTranslations {
  translationFailed: string;
  translationRateLimited: string;
  translationTimedOut: string;
}

export const contentTranslationPreviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ContentTranslationPreviewTranslations
> = {
  en: {
    translationFailed: "Translation failed. Please try again later.",
    translationRateLimited:
      "You're requesting translations too quickly. Please wait a moment and try again.",
    translationTimedOut: "Translation is taking longer than expected.",
  },
  ar: {
    translationFailed: "فشلت الترجمة. يرجى المحاولة لاحقًا.",
    translationRateLimited:
      "أنت تطلب الترجمات بسرعة كبيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.",
    translationTimedOut: "تستغرق الترجمة وقتًا أطول من المتوقع.",
  },
  es: {
    translationFailed: "La traducción falló. Inténtalo de nuevo más tarde.",
    translationRateLimited:
      "Estás solicitando traducciones demasiado rápido. Espera un momento e inténtalo de nuevo.",
    translationTimedOut: "La traducción está tardando más de lo esperado.",
  },
  fa: {
    translationFailed: "ترجمه انجام نشد. لطفاً بعداً دوباره تلاش کنید.",
    translationRateLimited:
      "درخواست‌های ترجمه را بیش از حد سریع ارسال می‌کنید. لطفاً کمی صبر کنید و دوباره تلاش کنید.",
    translationTimedOut: "ترجمه بیشتر از حد انتظار طول می‌کشد.",
  },
  fr: {
    translationFailed: "La traduction a échoué. Veuillez réessayer plus tard.",
    translationRateLimited:
      "Vous demandez des traductions trop rapidement. Veuillez patienter un moment puis réessayer.",
    translationTimedOut: "La traduction prend plus de temps que prévu.",
  },
  he: {
    translationFailed: "התרגום נכשל. נסו שוב מאוחר יותר.",
    translationRateLimited:
      "אתם מבקשים תרגומים מהר מדי. המתינו רגע ונסו שוב.",
    translationTimedOut: "התרגום נמשך יותר מהצפוי.",
  },
  ja: {
    translationFailed: "翻訳に失敗しました。後でもう一度お試しください。",
    translationRateLimited:
      "翻訳リクエストが速すぎます。少し待ってからもう一度お試しください。",
    translationTimedOut: "翻訳に予想より時間がかかっています。",
  },
  ky: {
    translationFailed: "Которуу ишке ашкан жок. Кийинчерээк кайра аракет кылыңыз.",
    translationRateLimited:
      "Которуу өтүнүчтөрүн өтө тез жөнөтүп жатасыз. Бир аз күтө туруп кайра аракет кылыңыз.",
    translationTimedOut: "Которуу күтүлгөндөн узакка созулууда.",
  },
  ru: {
    translationFailed: "Не удалось перевести. Повторите попытку позже.",
    translationRateLimited:
      "Вы запрашиваете переводы слишком быстро. Подождите немного и повторите попытку.",
    translationTimedOut: "Перевод занимает больше времени, чем ожидалось.",
  },
  "zh-Hans": {
    translationFailed: "翻译失败。请稍后重试。",
    translationRateLimited: "你请求翻译的速度太快。请稍等片刻后重试。",
    translationTimedOut: "翻译耗时比预期更长。",
  },
  "zh-Hant": {
    translationFailed: "翻譯失敗。請稍後再試。",
    translationRateLimited: "你請求翻譯的速度太快。請稍等片刻後重試。",
    translationTimedOut: "翻譯耗時比預期更長。",
  },
};
