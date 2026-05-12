import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionAnalysisDialogTranslations {
  title: string;
  agree: string;
  pass: string;
  disagree: string;
  total: string;
  noGroup: string;
  viewOriginal: string;
}

export const opinionAnalysisDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionAnalysisDialogTranslations
> = {
  en: {
    title: "Statement analysis",
    agree: "Agree",
    pass: "Unsure",
    disagree: "Disagree",
    total: "Total",
    noGroup: "No group",
    viewOriginal: "View original statement",
  },
  ar: {
    title: "تحليل المقترح",
    agree: "أوافق",
    pass: "غير متأكد",
    disagree: "أرفض",
    total: "المجموع",
    noGroup: "لا توجد مجموعة",
    viewOriginal: "عرض المقترح الأصلي",
  },
  es: {
    title: "Análisis de proposición",
    agree: "De acuerdo",
    pass: "No seguro",
    disagree: "En desacuerdo",
    total: "Total",
    noGroup: "Sin grupo",
    viewOriginal: "Ver proposición original",
  },
  fa: {
    title: "تحلیل گزاره",
    agree: "موافقم",
    pass: "مطمئن نیستم",
    disagree: "مخالفم",
    total: "مجموع",
    noGroup: "بدون گروه",
    viewOriginal: "مشاهده گزاره اصلی",
  },
  fr: {
    title: "Analyse de proposition",
    agree: "D'accord",
    pass: "Incertain",
    disagree: "Pas d'accord",
    total: "Total",
    noGroup: "Aucun groupe",
    viewOriginal: "Voir la proposition originale",
  },
  "zh-Hans": {
    title: "意见分析",
    agree: "同意",
    pass: "不确定",
    disagree: "不同意",
    total: "总票数",
    noGroup: "没有组",
    viewOriginal: "查看原始意见",
  },
  "zh-Hant": {
    title: "意見分析",
    agree: "同意",
    pass: "不確定",
    disagree: "不同意",
    total: "總票數",
    noGroup: "沒有組",
    viewOriginal: "查看原始意見",
  },
  he: {
    title: "ניתוח הצהרה",
    agree: "מסכים/ה",
    pass: "לא בטוח/ה",
    disagree: "לא מסכים/ה",
    total: "סה\"כ",
    noGroup: "ללא קבוצה",
    viewOriginal: "צפייה בהצהרה המקורית",
  },
  ja: {
    title: "意見の分析",
    agree: "同意",
    pass: "わからない",
    disagree: "同意しない",
    total: "合計",
    noGroup: "グループなし",
    viewOriginal: "元の意見を見る",
  },
  ky: {
    title: "Пикир анализи",
    agree: "Макулмун",
    pass: "Белгисиз",
    disagree: "Макул эмесмин",
    total: "Жалпы",
    noGroup: "Топ жок",
    viewOriginal: "Түпнуска пикирди көрүү",
  },
  ru: {
    title: "Анализ высказывания",
    agree: "Согласен",
    pass: "Не уверен",
    disagree: "Не согласен",
    total: "Всего",
    noGroup: "Без группы",
    viewOriginal: "Посмотреть исходное высказывание",
  },
};
