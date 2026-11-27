import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseVoteQueriesTranslations {
  failedToCastVote: string;
  voteSavedSessionRefreshFailed: string;
}

export const useVoteQueriesTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseVoteQueriesTranslations
> = {
  en: {
    failedToCastVote: "Failed to cast vote. Please try again.",
    voteSavedSessionRefreshFailed:
      "Your vote was saved, but your session could not be refreshed.",
  },
  de: {
    failedToCastVote:
      "Stimme konnte nicht abgegeben werden. Bitte versuchen Sie es erneut.",
    voteSavedSessionRefreshFailed:
      "Ihre Stimme wurde gespeichert, aber Ihre Sitzung konnte nicht aktualisiert werden.",
  },
  hi: {
    failedToCastVote: "मतदान करने में विफल। कृपया पुनः प्रयास करें।",
    voteSavedSessionRefreshFailed:
      "आपका मत सहेजा गया, लेकिन आपका सत्र ताज़ा नहीं किया जा सका।",
  },
  es: {
    failedToCastVote: "No se pudo registrar el voto. Inténtelo de nuevo.",
    voteSavedSessionRefreshFailed:
      "Tu voto se ha guardado, pero no se ha podido actualizar tu sesión.",
  },
  fr: {
    failedToCastVote: "Échec de l’enregistrement du vote. Veuillez réessayer.",
    voteSavedSessionRefreshFailed:
      "Votre vote a été enregistré, mais votre session n’a pas pu être actualisée.",
  },
  "zh-Hant": {
    failedToCastVote: "投票失敗。請重試。",
    voteSavedSessionRefreshFailed: "您的投票已儲存，但無法更新您的工作階段。",
  },
  "zh-Hans": {
    failedToCastVote: "投票失败。请重试。",
    voteSavedSessionRefreshFailed: "您的投票已保存，但无法更新您的会话。",
  },
  ja: {
    failedToCastVote: "投票に失敗しました。もう一度お試しください。",
    voteSavedSessionRefreshFailed:
      "投票は保存されましたが、セッションを更新できませんでした。",
  },
  ar: {
    failedToCastVote: "فشل تسجيل التصويت. يرجى المحاولة مرة أخرى.",
    voteSavedSessionRefreshFailed: "تم حفظ تصويتك، لكن تعذّر تحديث جلستك.",
  },
  fa: {
    failedToCastVote: "ثبت رأی ناموفق بود. لطفاً دوباره تلاش کنید.",
    voteSavedSessionRefreshFailed:
      "رأی شما ذخیره شد، اما نشست شما به‌روزرسانی نشد.",
  },
  he: {
    failedToCastVote: "שליחת ההצבעה נכשלה. נסו שוב.",
    voteSavedSessionRefreshFailed:
      "ההצבעה שלך נשמרה, אך לא ניתן היה לרענן את ההפעלה שלך.",
  },
  ky: {
    failedToCastVote: "Добуш берүү ишке ашкан жок. Кайра аракет кылыңыз.",
    voteSavedSessionRefreshFailed:
      "Добушуңуз сакталды, бирок сеансыңыз жаңыртылган жок.",
  },
  ru: {
    failedToCastVote: "Не удалось отправить голос. Попробуйте ещё раз.",
    voteSavedSessionRefreshFailed:
      "Ваш голос сохранён, но не удалось обновить сеанс.",
  },
};
