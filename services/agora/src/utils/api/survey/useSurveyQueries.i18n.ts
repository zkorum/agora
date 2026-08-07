import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseSurveyQueriesTranslations {
  originalContentNotFound: string;
}

export const useSurveyQueriesTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseSurveyQueriesTranslations
> = {
  en: { originalContentNotFound: "Original content not found" },
  ar: { originalContentNotFound: "لم يتم العثور على المحتوى الأصلي" },
  es: { originalContentNotFound: "No se encontró el contenido original" },
  fa: { originalContentNotFound: "محتوای اصلی یافت نشد" },
  he: { originalContentNotFound: "התוכן המקורי לא נמצא" },
  fr: { originalContentNotFound: "Contenu original introuvable" },
  "zh-Hans": { originalContentNotFound: "未找到原始内容" },
  "zh-Hant": { originalContentNotFound: "找不到原始內容" },
  ja: { originalContentNotFound: "元のコンテンツが見つかりません" },
  ky: { originalContentNotFound: "Баштапкы мазмун табылган жок" },
  ru: { originalContentNotFound: "Исходный контент не найден" },
};
