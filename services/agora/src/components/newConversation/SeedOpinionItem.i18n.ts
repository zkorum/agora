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
    deleteOpinion: "Delete Statement",
  },
  ar: {
    inputTextPlaceholder: "أدخل النص",
    deleteOpinion: "حذف المقترح",
  },
  es: {
    inputTextPlaceholder: "Ingrese texto",
    deleteOpinion: "Eliminar Proposición",
  },
  fr: {
    inputTextPlaceholder: "Saisir le texte",
    deleteOpinion: "Supprimer la Proposition",
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
    deleteOpinion: "主張を削除",
  },
};
