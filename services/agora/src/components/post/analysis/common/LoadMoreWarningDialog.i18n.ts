import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoadMoreWarningDialogTranslations {
  title: string;
  description: string;
  descriptionEmphasis: string;
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
      "All statements will be shown in decreasing order of statistical significance, including some that may not be significant {emphasis}.",
    descriptionEmphasis: "at all",
    cancelButton: "Cancel",
    loadMoreButton: "Load all",
  },
  ar: {
    title: "تحميل جميع المقترحات",
    description:
      "ستُعرض جميع المقترحات مرتبة حسب الدلالة الإحصائية تنازليًا، بما في ذلك بعض المقترحات التي قد لا تكون ذات دلالة {emphasis}.",
    descriptionEmphasis: "على الإطلاق",
    cancelButton: "إلغاء",
    loadMoreButton: "تحميل الكل",
  },
  es: {
    title: "Cargar todas las proposiciones",
    description:
      "Se mostrarán todas las proposiciones en orden decreciente de significancia estadística, incluidas algunas que pueden no ser significativas {emphasis}.",
    descriptionEmphasis: "en absoluto",
    cancelButton: "Cancelar",
    loadMoreButton: "Cargar todo",
  },
  fr: {
    title: "Charger toutes les propositions",
    description:
      "Toutes les propositions seront affichées par ordre de significativité statistique décroissante, y compris certaines qui pourraient ne pas être significatives {emphasis}.",
    descriptionEmphasis: "du tout",
    cancelButton: "Annuler",
    loadMoreButton: "Tout charger",
  },
  "zh-Hans": {
    title: "加载所有观点",
    description:
      "将显示所有观点，按统计显著性从高到低排序，包括一些可能{emphasis}不具有显著性的观点。",
    descriptionEmphasis: "完全",
    cancelButton: "取消",
    loadMoreButton: "全部加载",
  },
  "zh-Hant": {
    title: "載入所有觀點",
    description:
      "將顯示所有觀點，按統計顯著性從高到低排序，包括一些可能{emphasis}不具有顯著性的觀點。",
    descriptionEmphasis: "完全",
    cancelButton: "取消",
    loadMoreButton: "全部載入",
  },
  ja: {
    title: "すべての意見を読み込む",
    description:
      "すべての意見が統計的有意性の高い順に表示されます。{emphasis}有意でないものも含まれます。",
    descriptionEmphasis: "全く",
    cancelButton: "キャンセル",
    loadMoreButton: "すべて読み込む",
  },
};
