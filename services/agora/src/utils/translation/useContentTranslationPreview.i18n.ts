import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ContentTranslationPreviewTranslations {
  translationFailed: string;
  translationNotEnabled: string;
  translationRateLimited: string;
}

export const contentTranslationPreviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ContentTranslationPreviewTranslations
> = {
  en: {
    translationFailed: "Translation failed. Please try again later.",
    translationNotEnabled:
      "Translation is no longer enabled for this conversation.",
    translationRateLimited:
      "You're requesting translations too quickly. Please wait a moment and try again.",
  },
  ar: {
    translationFailed: "فشلت الترجمة. يرجى المحاولة لاحقًا.",
    translationNotEnabled: "لم تعد الترجمة مفعلة لهذه المحادثة.",
    translationRateLimited:
      "أنت تطلب الترجمات بسرعة كبيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.",
  },
  es: {
    translationFailed: "La traducción falló. Inténtelo de nuevo más tarde.",
    translationNotEnabled:
      "La traducción ya no está activada para esta conversación.",
    translationRateLimited:
      "Está solicitando traducciones demasiado rápido. Espere un momento e inténtelo de nuevo.",
  },
  fa: {
    translationFailed: "ترجمه انجام نشد. لطفاً بعداً دوباره تلاش کنید.",
    translationNotEnabled: "ترجمه دیگر برای این گفتگو فعال نیست.",
    translationRateLimited:
      "درخواست‌های ترجمه را بیش از حد سریع ارسال می‌کنید. لطفاً کمی صبر کنید و دوباره تلاش کنید.",
  },
  fr: {
    translationFailed: "La traduction a échoué. Veuillez réessayer plus tard.",
    translationNotEnabled:
      "La traduction n’est plus activée pour cette conversation.",
    translationRateLimited:
      "Vous demandez des traductions trop rapidement. Veuillez patienter un moment puis réessayer.",
  },
  he: {
    translationFailed: "התרגום נכשל. נסו שוב מאוחר יותר.",
    translationNotEnabled: "התרגום כבר אינו מופעל לשיחה הזו.",
    translationRateLimited: "אתם מבקשים תרגומים מהר מדי. המתינו רגע ונסו שוב.",
  },
  ja: {
    translationFailed: "翻訳に失敗しました。後でもう一度お試しください。",
    translationNotEnabled: "この会話では翻訳が有効ではなくなりました。",
    translationRateLimited:
      "翻訳リクエストが速すぎます。少し待ってからもう一度お試しください。",
  },
  ky: {
    translationFailed:
      "Которуу ишке ашкан жок. Кийинчерээк кайра аракет кылыңыз.",
    translationNotEnabled:
      "Бул сүйлөшүү үчүн которуу мындан ары иштетилген эмес.",
    translationRateLimited:
      "Которуу өтүнүчтөрүн өтө тез жөнөтүп жатасыз. Бир аз күтө туруп кайра аракет кылыңыз.",
  },
  ru: {
    translationFailed: "Не удалось перевести. Повторите попытку позже.",
    translationNotEnabled: "Перевод больше не включен для этого обсуждения.",
    translationRateLimited:
      "Вы запрашиваете переводы слишком быстро. Подождите немного и повторите попытку.",
  },
  "zh-Hans": {
    translationFailed: "翻译失败。请稍后重试。",
    translationNotEnabled: "此对话已不再启用翻译。",
    translationRateLimited: "你请求翻译的速度太快。请稍等片刻后重试。",
  },
  "zh-Hant": {
    translationFailed: "翻譯失敗。請稍後再試。",
    translationNotEnabled: "此對話已不再啟用翻譯。",
    translationRateLimited: "你請求翻譯的速度太快。請稍等片刻後重試。",
  },
};
