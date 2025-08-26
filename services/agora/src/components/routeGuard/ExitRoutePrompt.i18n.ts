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
  es: {
    saveAsDraft: "Guardar como borrador",
    discard: "Descartar",
  },
  fr: {
    saveAsDraft: "Enregistrer comme brouillon",
    discard: "Rejeter",
  },
  "zh-CN": {
    saveAsDraft: "保存为草稿",
    discard: "丢弃",
  },
  "zh-TW": {
    saveAsDraft: "保存為草稿",
    discard: "丟棄",
  },
  ja: {
    saveAsDraft: "草稿として保存",
    discard: "破棄",
  },
};
