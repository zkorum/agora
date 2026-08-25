import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProjectReportPageTranslations {
  downloadImages: string;
  downloadPdf: string;
  generating: string;
  loadingError: string;
  narrowScreenTitle: string;
  narrowScreenMessage: string;
  goBack: string;
  allStatementsOrderNewest: string;
  allStatementsOrderAgreement: string;
  allStatementsOrderDisagreement: string;
  allStatementsOrderDivisive: string;
  returnToLiveAnalysis: string;
}

export const projectReportPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ProjectReportPageTranslations
> = {
  en: {
    downloadImages: "Download images (ZIP)",
    downloadPdf: "Download PDF",
    generating: "Generating...",
    loadingError: "Failed to load conversation data",
    narrowScreenTitle: "Larger screen required",
    narrowScreenMessage:
      "This report is designed for larger screens. Please open it on a desktop or tablet.",
    goBack: "Go back",
    allStatementsOrderNewest: "Newest first",
    allStatementsOrderAgreement: "Most approved first",
    allStatementsOrderDisagreement: "Most rejected first",
    allStatementsOrderDivisive: "Most divisive first",
    returnToLiveAnalysis: "Return to live analysis",
  },
  ar: {
    downloadImages: "تحميل الصور (ZIP)",
    downloadPdf: "تحميل PDF",
    generating: "جاري الإنشاء...",
    loadingError: "فشل في تحميل بيانات المحادثة",
    narrowScreenTitle: "يلزم شاشة أكبر",
    narrowScreenMessage:
      "هذا التقرير مصمم للشاشات الكبيرة. يرجى فتحه على جهاز مكتبي أو جهاز لوحي.",
    goBack: "العودة",
    allStatementsOrderNewest: "الأحدث أولاً",
    allStatementsOrderAgreement: "الأكثر اعتماداً أولاً",
    allStatementsOrderDisagreement: "الأكثر رفضاً أولاً",
    allStatementsOrderDivisive: "الأكثر إثارة للجدل أولاً",
    returnToLiveAnalysis: "العودة إلى التحليل المباشر",
  },
  es: {
    downloadImages: "Descargar imágenes (ZIP)",
    downloadPdf: "Descargar PDF",
    generating: "Generando...",
    loadingError: "Error al cargar los datos de la conversación",
    narrowScreenTitle: "Se requiere una pantalla más grande",
    narrowScreenMessage:
      "Este informe está diseñado para pantallas más grandes. Ábralo en un ordenador o tableta.",
    goBack: "Volver",
    allStatementsOrderNewest: "Más recientes primero",
    allStatementsOrderAgreement: "Más aprobadas primero",
    allStatementsOrderDisagreement: "Más rechazadas primero",
    allStatementsOrderDivisive: "Más divisivas primero",
    returnToLiveAnalysis: "Volver al análisis en directo",
  },
  fa: {
    downloadImages: "دانلود تصاویر (ZIP)",
    downloadPdf: "دانلود PDF",
    generating: "در حال تولید...",
    loadingError: "بارگذاری داده‌های گفتگو ناموفق بود",
    narrowScreenTitle: "صفحه بزرگ‌تر لازم است",
    narrowScreenMessage:
      "این گزارش برای صفحه‌های بزرگ‌تر طراحی شده است. لطفاً آن را در رایانه رومیزی یا تبلت باز کنید.",
    goBack: "بازگشت",
    allStatementsOrderNewest: "جدیدترین‌ها اول",
    allStatementsOrderAgreement: "تأییدشده‌ترین‌ها اول",
    allStatementsOrderDisagreement: "ردشده‌ترین‌ها اول",
    allStatementsOrderDivisive: "اختلاف‌برانگیزترین‌ها اول",
    returnToLiveAnalysis: "بازگشت به تحلیل زنده",
  },
  fr: {
    downloadImages: "Télécharger les images (ZIP)",
    downloadPdf: "Télécharger le PDF",
    generating: "Génération en cours...",
    loadingError: "Échec du chargement des données de la conversation",
    narrowScreenTitle: "Écran plus grand requis",
    narrowScreenMessage:
      "Ce rapport est conçu pour les grands écrans. Veuillez l'ouvrir sur un ordinateur ou une tablette.",
    goBack: "Retour",
    allStatementsOrderNewest: "Plus récentes d'abord",
    allStatementsOrderAgreement: "Plus approuvées d'abord",
    allStatementsOrderDisagreement: "Plus rejetées d'abord",
    allStatementsOrderDivisive: "Plus controversées d'abord",
    returnToLiveAnalysis: "Retourner à l'analyse en direct",
  },
  he: {
    downloadImages: "הורדת תמונות (ZIP)",
    downloadPdf: "הורדת PDF",
    generating: "...מייצר",
    loadingError: "טעינת נתוני השיחה נכשלה",
    narrowScreenTitle: "נדרש מסך גדול יותר",
    narrowScreenMessage:
      "דוח זה מיועד למסכים גדולים יותר. אנא פתחו אותו במחשב שולחני או טאבלט.",
    goBack: "חזרה",
    allStatementsOrderNewest: "החדשות תחילה",
    allStatementsOrderAgreement: "המאושרות ביותר תחילה",
    allStatementsOrderDisagreement: "הנדחות ביותר תחילה",
    allStatementsOrderDivisive: "המפלגות ביותר תחילה",
    returnToLiveAnalysis: "חזרה לניתוח החי",
  },
  ja: {
    downloadImages: "画像をダウンロード (ZIP)",
    downloadPdf: "PDFをダウンロード",
    generating: "生成中...",
    loadingError: "会話データの読み込みに失敗しました",
    narrowScreenTitle: "大きな画面が必要です",
    narrowScreenMessage:
      "このレポートは大きな画面用に設計されています。デスクトップまたはタブレットで開いてください。",
    goBack: "戻る",
    allStatementsOrderNewest: "新しい順",
    allStatementsOrderAgreement: "承認度が高い順",
    allStatementsOrderDisagreement: "否決度が高い順",
    allStatementsOrderDivisive: "分断度が高い順",
    returnToLiveAnalysis: "ライブ分析に戻る",
  },
  ky: {
    downloadImages: "Сүрөттөрдү жүктөп алуу (ZIP)",
    downloadPdf: "PDF жүктөп алуу",
    generating: "Түзүлүүдө...",
    loadingError: "Талкуу маалыматтарын жүктөө ишке ашкан жок",
    narrowScreenTitle: "Чоңураак экран талап кылынат",
    narrowScreenMessage:
      "Бул отчет чоң экрандар үчүн иштелип чыккан. Компьютерде же планшетте ачыңыз.",
    goBack: "Артка",
    allStatementsOrderNewest: "Эң жаңылары биринчи",
    allStatementsOrderAgreement: "Эң жактырылгандары биринчи",
    allStatementsOrderDisagreement: "Эң четке кагылгандары биринчи",
    allStatementsOrderDivisive: "Эң талаштуулары биринчи",
    returnToLiveAnalysis: "Жандуу анализге кайтуу",
  },
  ru: {
    downloadImages: "Скачать изображения (ZIP)",
    downloadPdf: "Скачать PDF",
    generating: "Генерация...",
    loadingError: "Не удалось загрузить данные обсуждения",
    narrowScreenTitle: "Требуется экран большего размера",
    narrowScreenMessage:
      "Этот отчёт предназначен для больших экранов. Пожалуйста, откройте его на компьютере или планшете.",
    goBack: "Назад",
    allStatementsOrderNewest: "Сначала новые",
    allStatementsOrderAgreement: "Сначала самые одобренные",
    allStatementsOrderDisagreement: "Сначала самые отклонённые",
    allStatementsOrderDivisive: "Сначала самые спорные",
    returnToLiveAnalysis: "Вернуться к текущему анализу",
  },
  "zh-Hans": {
    downloadImages: "下载图片 (ZIP)",
    downloadPdf: "下载 PDF",
    generating: "正在生成...",
    loadingError: "加载对话数据失败",
    narrowScreenTitle: "需要更大的屏幕",
    narrowScreenMessage: "此报告适用于大屏幕。请在桌面设备或平板电脑上打开。",
    goBack: "返回",
    allStatementsOrderNewest: "最新优先",
    allStatementsOrderAgreement: "最受认可优先",
    allStatementsOrderDisagreement: "最受否决优先",
    allStatementsOrderDivisive: "最具分歧优先",
    returnToLiveAnalysis: "返回实时分析",
  },
  "zh-Hant": {
    downloadImages: "下載圖片 (ZIP)",
    downloadPdf: "下載 PDF",
    generating: "正在生成...",
    loadingError: "載入對話資料失敗",
    narrowScreenTitle: "需要更大的螢幕",
    narrowScreenMessage: "此報告適用於大螢幕。請在桌面裝置或平板電腦上開啟。",
    goBack: "返回",
    allStatementsOrderNewest: "最新優先",
    allStatementsOrderAgreement: "最受認可優先",
    allStatementsOrderDisagreement: "最受否決優先",
    allStatementsOrderDivisive: "最具分歧優先",
    returnToLiveAnalysis: "返回即時分析",
  },
};
