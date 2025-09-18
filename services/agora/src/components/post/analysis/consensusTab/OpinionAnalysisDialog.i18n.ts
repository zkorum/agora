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
    title: "Opinion analysis",
    agree: "Agree",
    pass: "Unsure",
    disagree: "Disagree",
    total: "Total",
    noGroup: "No group",
    viewOriginal: "View original opinion",
  },
  ar: {
    title: "تحليل الرأي",
    agree: "أوافق",
    pass: "غير متأكد",
    disagree: "أرفض",
    total: "المجموع",
    noGroup: "لا توجد مجموعة",
    viewOriginal: "عرض الرأي الأصلي",
  },
  es: {
    title: "Análisis de opinión",
    agree: "De acuerdo",
    pass: "No seguro",
    disagree: "En desacuerdo",
    total: "Total",
    noGroup: "Sin grupo",
    viewOriginal: "Ver opinión original",
  },
  fr: {
    title: "Analyse d'opinion",
    agree: "D'accord",
    pass: "Incertain",
    disagree: "Pas d'accord",
    total: "Total",
    noGroup: "Aucun groupe",
    viewOriginal: "Voir l'opinion originale",
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
  ja: {
    title: "意見の分析",
    agree: "同意",
    pass: "わからない",
    disagree: "同意しない",
    total: "合計",
    noGroup: "グループなし",
    viewOriginal: "元の意見を見る",
  },
};
