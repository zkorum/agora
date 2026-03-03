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
  fr: {
    statement: "Proposition",
    overall: "Global",
    noItems:
      "Aucun élément statistiquement significatif trouvé pour cette section.",
  },
  "zh-Hans": {
    statement: "陈述",
    overall: "总计",
    noItems: "本节未找到具有统计意义的项目。",
  },
  "zh-Hant": {
    statement: "陳述",
    overall: "總計",
    noItems: "本節未找到具有統計意義的項目。",
  },
  ja: {
    statement: "意見",
    overall: "全体",
    noItems:
      "このセクションで統計的に有意な項目は見つかりませんでした。",
  },
};
