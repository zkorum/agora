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
      "All statements will be shown in decreasing order of statistical significance, including some that may not really be significant.",
    cancelButton: "Cancel",
    loadMoreButton: "Load all",
  },
  ar: {
    title: "تحميل جميع المقترحات",
    description:
      "ستُعرض جميع المقترحات مرتبة حسب الدلالة الإحصائية تنازليًا، بما في ذلك بعض المقترحات التي قد لا تكون ذات دلالة حقًا.",
    cancelButton: "إلغاء",
    loadMoreButton: "تحميل الكل",
  },
  es: {
    title: "Cargar todas las proposiciones",
    description:
      "Se mostrarán todas las proposiciones en orden decreciente de significancia estadística, incluidas algunas que pueden no ser realmente significativas.",
    cancelButton: "Cancelar",
    loadMoreButton: "Cargar todo",
  },
  fr: {
    title: "Charger toutes les propositions",
    description:
      "Toutes les propositions seront affichées par ordre de significativité statistique décroissante, y compris certaines qui pourraient ne pas vraiment être significatives.",
    cancelButton: "Annuler",
    loadMoreButton: "Tout charger",
  },
  "zh-Hans": {
    title: "加载所有观点",
    description: "将显示所有观点，按统计显著性从高到低排序，包括一些可能并不真正具有显著性的观点。",
    cancelButton: "取消",
    loadMoreButton: "全部加载",
  },
  "zh-Hant": {
    title: "載入所有觀點",
    description: "將顯示所有觀點，按統計顯著性從高到低排序，包括一些可能並不真正具有顯著性的觀點。",
    cancelButton: "取消",
    loadMoreButton: "全部載入",
  },
  ja: {
    title: "すべての意見を読み込む",
    description:
      "すべての意見が統計的有意性の高い順に表示されます。本当に有意とは言えないものも含まれます。",
    cancelButton: "キャンセル",
    loadMoreButton: "すべて読み込む",
  },
};
