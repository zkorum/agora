import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportHistoryListTranslations {
  loadingExports: string;
  noExportsYet: string;
  errorLoadingExports: string;
}

export const exportHistoryListTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportHistoryListTranslations
> = {
  en: {
    loadingExports: "Loading exports...",
    noExportsYet: "No exports yet. Request your first export above.",
    errorLoadingExports: "Failed to load export history",
  },
  ar: {
    loadingExports: "جارٍ تحميل الصادرات...",
    noExportsYet: "لا توجد صادرات بعد. اطلب أول تصدير أعلاه.",
    errorLoadingExports: "فشل تحميل سجل التصدير",
  },
  es: {
    loadingExports: "Cargando exportaciones...",
    noExportsYet:
      "Aún no hay exportaciones. Solicita tu primera exportación arriba.",
    errorLoadingExports: "Error al cargar el historial de exportaciones",
  },
  fr: {
    loadingExports: "Chargement des exportations...",
    noExportsYet:
      "Aucune exportation pour le moment. Demandez votre première exportation ci-dessus.",
    errorLoadingExports: "Échec du chargement de l'historique des exportations",
  },
  "zh-Hans": {
    loadingExports: "正在加载导出...",
    noExportsYet: "还没有导出。在上面请求您的第一个导出。",
    errorLoadingExports: "加载导出历史失败",
  },
  "zh-Hant": {
    loadingExports: "正在載入匯出...",
    noExportsYet: "還沒有匯出。在上面請求您的第一個匯出。",
    errorLoadingExports: "載入匯出歷史失敗",
  },
  ja: {
    loadingExports: "エクスポートを読み込んでいます...",
    noExportsYet:
      "まだエクスポートはありません。上で最初のエクスポートをリクエストしてください。",
    errorLoadingExports: "エクスポート履歴の読み込みに失敗しました",
  },
};
