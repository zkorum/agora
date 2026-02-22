import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoadMoreWarningDialogTranslations {
  title: string;
  description: string;
  cancelButton: string;
  loadMoreButton: string;
}

export const loadMoreWarningDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoadMoreWarningDialogTranslations
> = {
  en: {
    title: "Load all statements",
    description:
      "You will load all statements in order of priority.",
    cancelButton: "Cancel",
    loadMoreButton: "Load more",
  },
  ar: {
    title: "تحميل جميع المقترحات",
    description:
      "سيتم تحميل جميع المقترحات حسب ترتيب الأولوية.",
    cancelButton: "إلغاء",
    loadMoreButton: "تحميل المزيد",
  },
  es: {
    title: "Cargar todas las afirmaciones",
    description:
      "Se cargarán todas las afirmaciones en orden de prioridad.",
    cancelButton: "Cancelar",
    loadMoreButton: "Cargar más",
  },
  fr: {
    title: "Charger toutes les propositions",
    description:
      "Vous allez charger toutes les propositions par ordre de priorité.",
    cancelButton: "Annuler",
    loadMoreButton: "Charger plus",
  },
  "zh-Hans": {
    title: "加载所有观点",
    description: "将按优先级顺序加载所有观点。",
    cancelButton: "取消",
    loadMoreButton: "加载更多",
  },
  "zh-Hant": {
    title: "載入所有觀點",
    description: "將按優先級順序載入所有觀點。",
    cancelButton: "取消",
    loadMoreButton: "載入更多",
  },
  ja: {
    title: "すべての意見を読み込む",
    description:
      "すべての意見を優先順位に従って読み込みます。",
    cancelButton: "キャンセル",
    loadMoreButton: "もっと読み込む",
  },
};
