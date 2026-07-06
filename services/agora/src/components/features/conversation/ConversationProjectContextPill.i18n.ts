import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationProjectContextPillTranslations {
  partOfProject: string;
  openProjectView: string;
}

export const conversationProjectContextPillTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationProjectContextPillTranslations
> = {
  en: {
    partOfProject: "Part of",
    openProjectView: "Open project view",
  },
  ar: {
    partOfProject: "جزء من",
    openProjectView: "افتح عرض المشروع",
  },
  es: {
    partOfProject: "Parte de",
    openProjectView: "Abrir vista del proyecto",
  },
  fa: {
    partOfProject: "بخشی از",
    openProjectView: "باز کردن نمای پروژه",
  },
  he: {
    partOfProject: "חלק מתוך",
    openProjectView: "פתח תצוגת פרויקט",
  },
  fr: {
    partOfProject: "Fait partie de",
    openProjectView: "Ouvrir la vue projet",
  },
  "zh-Hans": {
    partOfProject: "属于",
    openProjectView: "打开项目视图",
  },
  "zh-Hant": {
    partOfProject: "屬於",
    openProjectView: "開啟專案視圖",
  },
  ja: {
    partOfProject: "所属プロジェクト",
    openProjectView: "プロジェクト表示を開く",
  },
  ky: {
    partOfProject: "Долбоордун бөлүгү",
    openProjectView: "Долбоор көрүнүшүн ачуу",
  },
  ru: {
    partOfProject: "Часть проекта",
    openProjectView: "Открыть вид проекта",
  },
};
