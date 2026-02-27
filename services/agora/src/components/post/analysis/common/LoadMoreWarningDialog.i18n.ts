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
      "All statements will be shown, ranked by statistical significance. Those below the divider may not be statistically significant.",
    cancelButton: "Cancel",
    loadMoreButton: "Load all",
  },
  ar: {
    title: "تحميل جميع المقترحات",
    description:
      "ستُعرض جميع المقترحات مرتبة حسب الدلالة الإحصائية. تلك التي تظهر أسفل الفاصل قد لا تكون ذات دلالة إحصائية.",
    cancelButton: "إلغاء",
    loadMoreButton: "تحميل الكل",
  },
  es: {
    title: "Cargar todas las proposiciones",
    description:
      "Se mostrarán todas las proposiciones, ordenadas por significancia estadística. Las que aparezcan debajo del separador pueden no ser estadísticamente significativas.",
    cancelButton: "Cancelar",
    loadMoreButton: "Cargar todo",
  },
  fr: {
    title: "Charger toutes les propositions",
    description:
      "Toutes les propositions seront affichées, classées par significativité statistique. Celles situées sous le séparateur peuvent ne pas être statistiquement significatives.",
    cancelButton: "Annuler",
    loadMoreButton: "Tout charger",
  },
  "zh-Hans": {
    title: "加载所有观点",
    description: "将显示所有观点，按统计显著性排序。分隔线以下的观点可能不具有统计显著性。",
    cancelButton: "取消",
    loadMoreButton: "全部加载",
  },
  "zh-Hant": {
    title: "載入所有觀點",
    description: "將顯示所有觀點，按統計顯著性排序。分隔線以下的觀點可能不具有統計顯著性。",
    cancelButton: "取消",
    loadMoreButton: "全部載入",
  },
  ja: {
    title: "すべての意見を読み込む",
    description:
      "すべての意見が統計的有意性の順に表示されます。区切り線より下の意見は統計的に有意でない場合があります。",
    cancelButton: "キャンセル",
    loadMoreButton: "すべて読み込む",
  },
};
