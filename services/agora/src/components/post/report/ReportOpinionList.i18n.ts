import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportOpinionListTranslations {
  statement: string;
  overall: string;
  noItems: string;
}

export const reportOpinionListTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportOpinionListTranslations
> = {
  en: {
    statement: "Statement",
    overall: "Overall",
    noItems: "No statistically significant items found for this section.",
  },
  ar: {
    statement: "البيان",
    overall: "الإجمالي",
    noItems: "لم يتم العثور على عناصر ذات دلالة إحصائية لهذا القسم.",
  },
  es: {
    statement: "Proposición",
    overall: "General",
    noItems:
      "No se encontraron elementos estadísticamente significativos para esta sección.",
  },
  fa: { statement: "گزاره", overall: "کلی", noItems: "هیچ مورد مهم آماری برای این بخش یافت نشد." },
  fr: {
    statement: "Proposition",
    overall: "Global",
    noItems:
      "Aucun élément statistiquement significatif trouvé pour cette section.",
  },
  "zh-Hans": {
    statement: "观点",
    overall: "总计",
    noItems: "本节未找到具有统计意义的项目。",
  },
  "zh-Hant": {
    statement: "觀點",
    overall: "總計",
    noItems: "本節未找到具有統計意義的項目。",
  },
  he: { statement: "הצהרה", overall: "כולל", noItems: "לא נמצאו פריטים מובהקים סטטיסטית עבור חלק זה." },
  ja: {
    statement: "意見",
    overall: "全体",
    noItems:
      "このセクションで統計的に有意な項目は見つかりませんでした。",
  },
  ky: {
    statement: "Пикир",
    overall: "Жалпы",
    noItems: "Бул бөлүм үчүн статистикалык маанилүү элементтер табылган жок.",
  },
  ru: {
    statement: "Высказывание",
    overall: "Общий",
    noItems: "Статистически значимые элементы для этого раздела не найдены.",
  },
};
