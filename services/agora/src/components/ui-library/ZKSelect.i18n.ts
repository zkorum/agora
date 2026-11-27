import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ZKSelectTranslations {
  done: string;
  noResults: string;
}

export const zkSelectTranslations: Record<
  SupportedDisplayLanguageCodes,
  ZKSelectTranslations
> = {
  en: { done: "Done", noResults: "No results" },
  de: { done: "Fertig", noResults: "Keine Ergebnisse" },
  hi: { done: "हो गया", noResults: "कोई परिणाम नहीं" },
  ar: { done: "تم", noResults: "لا توجد نتائج" },
  es: { done: "Listo", noResults: "Sin resultados" },
  fa: { done: "انجام شد", noResults: "نتیجه‌ای یافت نشد" },
  fr: { done: "Terminé", noResults: "Aucun résultat" },
  he: { done: "סיום", noResults: "אין תוצאות" },
  ja: { done: "完了", noResults: "結果がありません" },
  ky: { done: "Даяр", noResults: "Натыйжа жок" },
  ru: { done: "Готово", noResults: "Нет результатов" },
  "zh-Hans": { done: "完成", noResults: "无结果" },
  "zh-Hant": { done: "完成", noResults: "無結果" },
};
