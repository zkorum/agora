import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationProjectContextPillTranslations {
  partOfProject: string;
  openProject: string;
}

export const conversationProjectContextPillTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationProjectContextPillTranslations
> = {
  en: {
    partOfProject: "Part of",
    openProject: "Open",
  },
  ar: {
    partOfProject: "جزء من",
    openProject: "افتح",
  },
  es: {
    partOfProject: "Parte de",
    openProject: "Abrir",
  },
  fa: {
    partOfProject: "بخشی از",
    openProject: "باز کردن",
  },
  he: {
    partOfProject: "חלק מתוך",
    openProject: "פתח",
  },
  fr: {
    partOfProject: "Fait partie de",
    openProject: "Ouvrir",
  },
  "zh-Hans": {
    partOfProject: "属于",
    openProject: "打开",
  },
  "zh-Hant": {
    partOfProject: "屬於",
    openProject: "開啟",
  },
  ja: {
    partOfProject: "所属プロジェクト",
    openProject: "開く",
  },
  ky: {
    partOfProject: "Долбоордун бөлүгү",
    openProject: "Ачуу",
  },
  ru: {
    partOfProject: "Часть проекта",
    openProject: "Открыть",
  },
};
