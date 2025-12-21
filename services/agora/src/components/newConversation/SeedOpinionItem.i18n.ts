import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SeedOpinionItemTranslations {
  inputTextPlaceholder: string;
  deleteOpinion: string;
}

export const seedOpinionItemTranslations: Record<
  SupportedDisplayLanguageCodes,
  SeedOpinionItemTranslations
> = {
  en: {
    inputTextPlaceholder: "Input text",
    deleteOpinion: "Delete Opinion",
  },
  ar: {
    inputTextPlaceholder: "أدخل النص",
    deleteOpinion: "حذف الرأي",
  },
  es: {
    inputTextPlaceholder: "Ingrese texto",
    deleteOpinion: "Eliminar Opinión",
  },
  fr: {
    inputTextPlaceholder: "Saisir le texte",
    deleteOpinion: "Supprimer l'Opinion",
  },
  "zh-Hans": {
    inputTextPlaceholder: "输入文本",
    deleteOpinion: "删除观点",
  },
  "zh-Hant": {
    inputTextPlaceholder: "輸入文本",
    deleteOpinion: "刪除觀點",
  },
  ja: {
    inputTextPlaceholder: "テキストを入力",
    deleteOpinion: "意見を削除",
  },
};
