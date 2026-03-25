import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ImportedConversationIndicatorTranslations {
  importedLabel: string;
  dialogTitle: string;
  importMethodLabel: string;
  importMethodUrl: string;
  importMethodCsv: string;
  sourceUrlLabel: string;
  conversationUrlLabel: string;
  exportUrlLabel: string;
  originalAuthorLabel: string;
  originalDateLabel: string;
  analysisNote: string;
}

export const importedConversationIndicatorTranslations: Record<
  SupportedDisplayLanguageCodes,
  ImportedConversationIndicatorTranslations
> = {
  en: {
    importedLabel: "Imported from external data",
    dialogTitle: "Import details",
    importMethodLabel: "Import method",
    importMethodUrl: "URL",
    importMethodCsv: "CSV files",
    sourceUrlLabel: "Source URL",
    conversationUrlLabel: "Original conversation URL",
    exportUrlLabel: "Original report URL",
    originalAuthorLabel: "Original author",
    originalDateLabel: "Original creation date",
    analysisNote:
      "The data in the Analysis tab has been completely recalculated by Agora.",
  },
  ar: {
    importedLabel: "مستورد من بيانات خارجية",
    dialogTitle: "تفاصيل الاستيراد",
    importMethodLabel: "طريقة الاستيراد",
    importMethodUrl: "رابط",
    importMethodCsv: "ملفات CSV",
    sourceUrlLabel: "رابط المصدر",
    conversationUrlLabel: "رابط المحادثة الأصلي",
    exportUrlLabel: "رابط التقرير الأصلي",
    originalAuthorLabel: "المؤلف الأصلي",
    originalDateLabel: "تاريخ الإنشاء الأصلي",
    analysisNote: "تم إعادة حساب البيانات في علامة تبويب التحليل بالكامل بواسطة Agora.",
  },
  es: {
    importedLabel: "Importado de datos externos",
    dialogTitle: "Detalles de importación",
    importMethodLabel: "Método de importación",
    importMethodUrl: "URL",
    importMethodCsv: "Archivos CSV",
    sourceUrlLabel: "URL de origen",
    conversationUrlLabel: "URL de la conversación original",
    exportUrlLabel: "URL del informe original",
    originalAuthorLabel: "Autor original",
    originalDateLabel: "Fecha de creación original",
    analysisNote:
      "Los datos en la pestaña de Análisis han sido completamente recalculados por Agora.",
  },
  fa: {
    importedLabel: "وارد شده از داده‌های خارجی",
    dialogTitle: "جزئیات واردات",
    importMethodLabel: "روش واردات",
    importMethodUrl: "لینک",
    importMethodCsv: "فایل‌های CSV",
    sourceUrlLabel: "لینک منبع",
    conversationUrlLabel: "لینک گفتگوی اصلی",
    exportUrlLabel: "لینک گزارش اصلی",
    originalAuthorLabel: "نویسنده اصلی",
    originalDateLabel: "تاریخ ایجاد اصلی",
    analysisNote: "داده‌های تب تحلیل به طور کامل توسط Agora محاسبه مجدد شده است.",
  },
  fr: {
    importedLabel: "Importé depuis des données externes",
    dialogTitle: "Détails de l'importation",
    importMethodLabel: "Méthode d'importation",
    importMethodUrl: "URL",
    importMethodCsv: "Fichiers CSV",
    sourceUrlLabel: "URL source",
    conversationUrlLabel: "URL de la conversation originale",
    exportUrlLabel: "URL du rapport original",
    originalAuthorLabel: "Auteur original",
    originalDateLabel: "Date de création originale",
    analysisNote:
      "Les données de l'onglet Analyse ont été entièrement recalculées par Agora.",
  },
  "zh-Hans": {
    importedLabel: "从外部数据导入",
    dialogTitle: "导入详情",
    importMethodLabel: "导入方式",
    importMethodUrl: "URL",
    importMethodCsv: "CSV 文件",
    sourceUrlLabel: "来源 URL",
    conversationUrlLabel: "原始对话 URL",
    exportUrlLabel: "原始报告 URL",
    originalAuthorLabel: "原始作者",
    originalDateLabel: "原始创建日期",
    analysisNote: "分析选项卡中的数据已由 Agora 完全重新计算。",
  },
  "zh-Hant": {
    importedLabel: "從外部資料匯入",
    dialogTitle: "匯入詳情",
    importMethodLabel: "匯入方式",
    importMethodUrl: "URL",
    importMethodCsv: "CSV 檔案",
    sourceUrlLabel: "來源 URL",
    conversationUrlLabel: "原始對話 URL",
    exportUrlLabel: "原始報告 URL",
    originalAuthorLabel: "原始作者",
    originalDateLabel: "原始建立日期",
    analysisNote: "分析分頁中的資料已由 Agora 完全重新計算。",
  },
  he: {
    importedLabel: "יובא מנתונים חיצוניים",
    dialogTitle: "פרטי ייבוא",
    importMethodLabel: "שיטת ייבוא",
    importMethodUrl: "כתובת URL",
    importMethodCsv: "קבצי CSV",
    sourceUrlLabel: "כתובת URL מקורית",
    conversationUrlLabel: "כתובת URL של השיחה המקורית",
    exportUrlLabel: "כתובת URL של הדוח המקורי",
    originalAuthorLabel: "מחבר מקורי",
    originalDateLabel: "תאריך יצירה מקורי",
    analysisNote: "הנתונים בלשונית הניתוח חושבו מחדש לחלוטין על ידי Agora.",
  },
  ja: {
    importedLabel: "外部データからインポート",
    dialogTitle: "インポート詳細",
    importMethodLabel: "インポート方法",
    importMethodUrl: "URL",
    importMethodCsv: "CSVファイル",
    sourceUrlLabel: "ソースURL",
    conversationUrlLabel: "元の会話URL",
    exportUrlLabel: "元のレポートURL",
    originalAuthorLabel: "元の著者",
    originalDateLabel: "元の作成日",
    analysisNote: "分析タブのデータはAgoraによって完全に再計算されました。",
  },
  ky: {
    importedLabel: "Тышкы маалыматтардан импорттолгон",
    dialogTitle: "Импорт маалыматы",
    importMethodLabel: "Импорт ыкмасы",
    importMethodUrl: "URL",
    importMethodCsv: "CSV файлдары",
    sourceUrlLabel: "Булак URL",
    conversationUrlLabel: "Баштапкы сүйлөшүү URL",
    exportUrlLabel: "Баштапкы отчет URL",
    originalAuthorLabel: "Баштапкы автор",
    originalDateLabel: "Баштапкы түзүлгөн күнү",
    analysisNote: "Анализ өтмөгүндөгү маалыматтар Agora тарабынан толугу менен кайра эсептелди.",
  },
  ru: {
    importedLabel: "Импортировано из внешних данных",
    dialogTitle: "Детали импорта",
    importMethodLabel: "Метод импорта",
    importMethodUrl: "URL",
    importMethodCsv: "CSV файлы",
    sourceUrlLabel: "URL источника",
    conversationUrlLabel: "URL оригинальной беседы",
    exportUrlLabel: "URL оригинального отчёта",
    originalAuthorLabel: "Оригинальный автор",
    originalDateLabel: "Дата создания оригинала",
    analysisNote:
      "Данные на вкладке Анализ были полностью пересчитаны Agora.",
  },
};
