import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseVoteQueriesTranslations {
  failedToCastVote: string;
}

export const useVoteQueriesTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseVoteQueriesTranslations
> = {
  en: { failedToCastVote: "Failed to cast vote. Please try again." },
  es: { failedToCastVote: "No se pudo registrar el voto. Inténtelo de nuevo." },
  fr: { failedToCastVote: "Échec de l’enregistrement du vote. Veuillez réessayer." },
  "zh-Hant": { failedToCastVote: "投票失敗。請重試。" },
  "zh-Hans": { failedToCastVote: "投票失败。请重试。" },
  ja: { failedToCastVote: "投票に失敗しました。もう一度お試しください。" },
  ar: { failedToCastVote: "فشل تسجيل التصويت. يرجى المحاولة مرة أخرى." },
  fa: { failedToCastVote: "ثبت رأی ناموفق بود. لطفاً دوباره تلاش کنید." },
  he: { failedToCastVote: "שליחת ההצבעה נכשלה. נסו שוב." },
  ky: { failedToCastVote: "Добуш берүү ишке ашкан жок. Кайра аракет кылыңыз." },
  ru: { failedToCastVote: "Не удалось отправить голос. Попробуйте ещё раз." },
};
