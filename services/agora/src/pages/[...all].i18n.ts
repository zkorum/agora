import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NotFoundTranslations {
  pageNotFound: string;
}

export const notFoundTranslations: Record<
  SupportedDisplayLanguageCodes,
  NotFoundTranslations
> = {
  en: { pageNotFound: "Page not found." },
  ar: { pageNotFound: "الصفحة غير موجودة." },
  es: { pageNotFound: "Página no encontrada." },
  fr: { pageNotFound: "Page introuvable." },
  "zh-Hans": { pageNotFound: "页面未找到。" },
  "zh-Hant": { pageNotFound: "頁面未找到。" },
  ja: { pageNotFound: "ページが見つかりません。" },
};
