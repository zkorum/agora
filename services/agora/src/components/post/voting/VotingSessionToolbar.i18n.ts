import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VotingSessionToolbarTranslations {
  undo: string;
  votingProgress: string;
}

export const votingSessionToolbarTranslations: Record<
  SupportedDisplayLanguageCodes,
  VotingSessionToolbarTranslations
> = {
  en: { undo: "Undo", votingProgress: "Voting progress" },
  fr: { undo: "Annuler", votingProgress: "Progression du vote" },
  es: { undo: "Deshacer", votingProgress: "Progreso de la votación" },
  ar: { undo: "تراجع", votingProgress: "تقدم التصويت" },
  fa: { undo: "بازگردانی", votingProgress: "پیشرفت رأی‌دهی" },
  he: { undo: "ביטול", votingProgress: "התקדמות ההצבעה" },
  ja: { undo: "元に戻す", votingProgress: "投票の進捗" },
  ky: { undo: "Артка кайтаруу", votingProgress: "Добуш берүүнүн жүрүшү" },
  ru: { undo: "Отменить", votingProgress: "Ход голосования" },
  "zh-Hans": { undo: "撤销", votingProgress: "投票进度" },
  "zh-Hant": { undo: "復原", votingProgress: "投票進度" },
};
