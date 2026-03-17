import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportPageTranslations {
  pageTitle: string;
  downloadImages: string;
  downloadPdf: string;
  generating: string;
  loadingError: string;
  narrowScreenTitle: string;
  narrowScreenMessage: string;
  goBack: string;
}

export const reportPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportPageTranslations
> = {
  en: {
    pageTitle: "Analysis Report",
    downloadImages: "Download images (ZIP)",
    downloadPdf: "Download PDF",
    generating: "Generating...",
    loadingError: "Failed to load conversation data",
    narrowScreenTitle: "Larger screen required",
    narrowScreenMessage:
      "This report is designed for larger screens. Please open it on a desktop or tablet.",
    goBack: "Go back",
  },
  ar: {
    pageTitle: "تقرير التحليل",
    downloadImages: "تحميل الصور (ZIP)",
    downloadPdf: "تحميل PDF",
    generating: "جاري الإنشاء...",
    loadingError: "فشل في تحميل بيانات المحادثة",
    narrowScreenTitle: "يلزم شاشة أكبر",
    narrowScreenMessage:
      "هذا التقرير مصمم للشاشات الكبيرة. يرجى فتحه على جهاز مكتبي أو جهاز لوحي.",
    goBack: "العودة",
  },
  es: {
    pageTitle: "Informe de análisis",
    downloadImages: "Descargar imágenes (ZIP)",
    downloadPdf: "Descargar PDF",
    generating: "Generando...",
    loadingError: "Error al cargar los datos de la conversación",
    narrowScreenTitle: "Se requiere una pantalla más grande",
    narrowScreenMessage:
      "Este informe está diseñado para pantallas más grandes. Ábrelo en un ordenador o tableta.",
    goBack: "Volver",
  },
  fr: {
    pageTitle: "Rapport d'analyse",
    downloadImages: "Télécharger les images (ZIP)",
    downloadPdf: "Télécharger le PDF",
    generating: "Génération en cours...",
    loadingError: "Échec du chargement des données de la conversation",
    narrowScreenTitle: "Écran plus grand requis",
    narrowScreenMessage:
      "Ce rapport est conçu pour les grands écrans. Veuillez l'ouvrir sur un ordinateur ou une tablette.",
    goBack: "Retour",
  },
  "zh-Hans": {
    pageTitle: "分析报告",
    downloadImages: "下载图片 (ZIP)",
    downloadPdf: "下载 PDF",
    generating: "正在生成...",
    loadingError: "加载对话数据失败",
    narrowScreenTitle: "需要更大的屏幕",
    narrowScreenMessage: "此报告适用于大屏幕。请在桌面设备或平板电脑上打开。",
    goBack: "返回",
  },
  "zh-Hant": {
    pageTitle: "分析報告",
    downloadImages: "下載圖片 (ZIP)",
    downloadPdf: "下載 PDF",
    generating: "正在生成...",
    loadingError: "載入對話資料失敗",
    narrowScreenTitle: "需要更大的螢幕",
    narrowScreenMessage: "此報告適用於大螢幕。請在桌面裝置或平板電腦上開啟。",
    goBack: "返回",
  },
  ja: {
    pageTitle: "分析レポート",
    downloadImages: "画像をダウンロード (ZIP)",
    downloadPdf: "PDFをダウンロード",
    generating: "生成中...",
    loadingError: "会話データの読み込みに失敗しました",
    narrowScreenTitle: "大きな画面が必要です",
    narrowScreenMessage:
      "このレポートは大きな画面用に設計されています。デスクトップまたはタブレットで開いてください。",
    goBack: "戻る",
  },
  ky: {
    pageTitle: "Анализ отчету",
    downloadImages: "Сүрөттөрдү жүктөп алуу (ZIP)",
    downloadPdf: "PDF жүктөп алуу",
    generating: "Түзүлүүдө...",
    loadingError: "Талкуу маалыматтарын жүктөө ишке ашкан жок",
    narrowScreenTitle: "Чоңураак экран талап кылынат",
    narrowScreenMessage:
      "Бул отчет чоң экрандар үчүн иштелип чыккан. Компьютерде же планшетте ачыңыз.",
    goBack: "Артка",
  },
  ru: {
    pageTitle: "Аналитический отчёт",
    downloadImages: "Скачать изображения (ZIP)",
    downloadPdf: "Скачать PDF",
    generating: "Генерация...",
    loadingError: "Не удалось загрузить данные обсуждения",
    narrowScreenTitle: "Требуется экран большего размера",
    narrowScreenMessage:
      "Этот отчёт предназначен для больших экранов. Пожалуйста, откройте его на компьютере или планшете.",
    goBack: "Назад",
  },
};
