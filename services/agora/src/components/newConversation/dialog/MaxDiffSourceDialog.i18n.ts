import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface MaxDiffSourceDialogTranslations {
  manualTitle: string;
  manualDescription: string;
  githubTitle: string;
  githubDescription: string;
}

export const maxDiffSourceDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  MaxDiffSourceDialogTranslations
> = {
  en: {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
  ar: {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
  es: {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
  fa: {
    manualTitle: "دستی",
    manualDescription: "گزاره‌ها را برای رتبه‌بندی به صورت دستی اضافه کنید",
    githubTitle: "GitHub",
    githubDescription: "موارد را از ایشوهای GitHub با برچسب مشخص وارد کنید",
  },
  he: {
    manualTitle: "ידני",
    manualDescription: "הוסיפו הצהרות לדירוג באופן ידני",
    githubTitle: "GitHub",
    githubDescription: "ייבאו פריטים מ-issues ב-GitHub עם תווית מסוימת",
  },
  fr: {
    manualTitle: "Manuel",
    manualDescription: "Ajouter des propositions à classer manuellement",
    githubTitle: "GitHub",
    githubDescription: "Importer des éléments depuis les issues GitHub avec un label spécifique",
  },
  "zh-Hans": {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
  "zh-Hant": {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
  ja: {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
  ky: {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
  ru: {
    manualTitle: "Manual",
    manualDescription: "Add statements to rank manually",
    githubTitle: "GitHub",
    githubDescription: "Import items from GitHub issues with a specific label",
  },
};
