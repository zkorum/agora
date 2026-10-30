import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ZKSelectTranslations {
  noResults: string;
}

export const zkSelectTranslations: Record<
  SupportedDisplayLanguageCodes,
  ZKSelectTranslations
> = {
  en: { noResults: "No results" },
  ar: { noResults: "لا توجد نتائج" },
  es: { noResults: "Sin resultados" },
  fa: { noResults: "نتیجه‌ای یافت نشد" },
  fr: { noResults: "Aucun résultat" },
  he: { noResults: "אין תוצאות" },
  ja: { noResults: "結果がありません" },
  ky: { noResults: "Натыйжа жок" },
  ru: { noResults: "Нет результатов" },
  "zh-Hans": { noResults: "无结果" },
  "zh-Hant": { noResults: "無結果" },
};
