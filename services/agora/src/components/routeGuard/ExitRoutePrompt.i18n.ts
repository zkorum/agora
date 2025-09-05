export interface ExitRoutePromptTranslations {
  saveAsDraft: string;
  discard: string;
  [key: string]: string;
}

export const exitRoutePromptTranslations: Record<
  string,
  ExitRoutePromptTranslations
> = {
  en: {
    saveAsDraft: "Save as draft",
    discard: "Discard",
  },
  ar: {
    saveAsDraft: "حفظ كمسودة",
    discard: "إلغاء",
  },
  es: {
    saveAsDraft: "Guardar como borrador",
    discard: "Descartar",
  },
  fr: {
    saveAsDraft: "Enregistrer comme brouillon",
    discard: "Rejeter",
  },
  "zh-Hans": {
    saveAsDraft: "保存为草稿",
    discard: "丢弃",
  },
  "zh-Hant": {
    saveAsDraft: "保存為草稿",
    discard: "丟棄",
  },
  ja: {
    saveAsDraft: "下書きとして保存",
    discard: "破棄",
  },
};
