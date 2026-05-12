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
    manualTitle: "手动",
    manualDescription: "手动添加要排名的意见",
    githubTitle: "GitHub",
    githubDescription: "从带有特定标签的 GitHub issue 导入项目",
  },
  "zh-Hant": {
    manualTitle: "手動",
    manualDescription: "手動添加要排名的意見",
    githubTitle: "GitHub",
    githubDescription: "從帶有特定標籤的 GitHub issue 匯入項目",
  },
  ja: {
    manualTitle: "手動",
    manualDescription: "ランク付けする意見を手動で追加",
    githubTitle: "GitHub",
    githubDescription: "特定のラベルが付いた GitHub issue から項目をインポート",
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
