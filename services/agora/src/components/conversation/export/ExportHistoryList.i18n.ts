import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportHistoryListTranslations {
  loadingExports: string;
  noExportsYet: string;
  errorLoadingExports: string;
  statusProcessing: string;
  statusCompleted: string;
  statusFailed: string;
  statusCancelled: string;
}

export const exportHistoryListTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportHistoryListTranslations
> = {
  en: {
    loadingExports: "Loading exports...",
    noExportsYet: "No exports yet. Request your first export above!",
    errorLoadingExports: "Failed to load export history",
    statusProcessing: "Processing",
    statusCompleted: "Completed",
    statusFailed: "Failed",
    statusCancelled: "Cancelled",
  },
  ar: {
    loadingExports: "جارٍ تحميل الصادرات...",
    noExportsYet: "لا توجد صادرات بعد. اطلب أول تصدير أعلاه.",
    errorLoadingExports: "فشل تحميل سجل التصدير",
    statusProcessing: "قيد المعالجة",
    statusCompleted: "مكتمل",
    statusFailed: "فشل",
    statusCancelled: "ملغى",
  },
  es: {
    loadingExports: "Cargando exportaciones...",
    noExportsYet:
      "Aún no hay exportaciones. Solicita tu primera exportación arriba.",
    errorLoadingExports: "Error al cargar el historial de exportaciones",
    statusProcessing: "Procesando",
    statusCompleted: "Completado",
    statusFailed: "Fallido",
    statusCancelled: "Cancelado",
  },
  fa: {
    loadingExports: "در حال بارگذاری صادرات‌ها...",
    noExportsYet: "هنوز صادراتی وجود ندارد. اولین صادرات خود را در بالا درخواست دهید!",
    errorLoadingExports: "بارگذاری تاریخچه صادرات ناموفق بود",
    statusProcessing: "در حال پردازش",
    statusCompleted: "تکمیل شده",
    statusFailed: "ناموفق",
    statusCancelled: "لغو شده",
  },
  fr: {
    loadingExports: "Chargement des exports...",
    noExportsYet:
      "Aucun export pour le moment. Demandez votre premier export ci-dessus.",
    errorLoadingExports: "Échec du chargement de l'historique des exports",
    statusProcessing: "En cours",
    statusCompleted: "Terminé",
    statusFailed: "Échoué",
    statusCancelled: "Annulé",
  },
  "zh-Hans": {
    loadingExports: "正在加载导出...",
    noExportsYet: "还没有导出。在上面请求您的第一个导出。",
    errorLoadingExports: "加载导出历史失败",
    statusProcessing: "处理中",
    statusCompleted: "已完成",
    statusFailed: "失败",
    statusCancelled: "已取消",
  },
  "zh-Hant": {
    loadingExports: "正在載入匯出...",
    noExportsYet: "還沒有匯出。在上面請求您的第一個匯出。",
    errorLoadingExports: "載入匯出歷史失敗",
    statusProcessing: "處理中",
    statusCompleted: "已完成",
    statusFailed: "失敗",
    statusCancelled: "已取消",
  },
  he: {
    loadingExports: "...טוען ייצואים",
    noExportsYet: "אין עדיין ייצואים. בקש את הייצוא הראשון שלך למעלה!",
    errorLoadingExports: "טעינת היסטוריית הייצוא נכשלה",
    statusProcessing: "מעבד",
    statusCompleted: "הושלם",
    statusFailed: "נכשל",
    statusCancelled: "בוטל",
  },
  ja: {
    loadingExports: "エクスポートを読み込んでいます...",
    noExportsYet:
      "まだエクスポートはありません。上で最初のエクスポートをリクエストしてください。",
    errorLoadingExports: "エクスポート履歴の読み込みに失敗しました",
    statusProcessing: "処理中",
    statusCompleted: "完了",
    statusFailed: "失敗",
    statusCancelled: "キャンセル",
  },
  ky: {
    loadingExports: "Экспорттор жүктөлүүдө...",
    noExportsYet: "Азырынча экспорттор жок. Жогорудан биринчи экспортуңузду сураңыз!",
    errorLoadingExports: "Экспорт тарыхын жүктөө ишке ашкан жок",
    statusProcessing: "Иштетилүүдө",
    statusCompleted: "Аяктады",
    statusFailed: "Ишке ашкан жок",
    statusCancelled: "Жокко чыгарылды",
  },
  ru: {
    loadingExports: "Загрузка экспортов...",
    noExportsYet: "Экспортов пока нет. Запросите первый экспорт выше!",
    errorLoadingExports: "Не удалось загрузить историю экспортов",
    statusProcessing: "Обработка",
    statusCompleted: "Завершено",
    statusFailed: "Ошибка",
    statusCancelled: "Отменено",
  },
};
