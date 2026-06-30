import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ZKContentDisclosureTranslations {
  readMore: string;
  showLess: string;
}

export const zkContentDisclosureTranslations: Record<
  SupportedDisplayLanguageCodes,
  ZKContentDisclosureTranslations
> = {
  en: {
    readMore: "Read more",
    showLess: "Show less",
  },
  ar: {
    readMore: "اقرأ المزيد",
    showLess: "عرض أقل",
  },
  es: {
    readMore: "Leer más",
    showLess: "Mostrar menos",
  },
  fa: {
    readMore: "بیشتر بخوانید",
    showLess: "نمایش کمتر",
  },
  fr: {
    readMore: "Lire la suite",
    showLess: "Afficher moins",
  },
  "zh-Hans": {
    readMore: "阅读更多",
    showLess: "收起",
  },
  "zh-Hant": {
    readMore: "閱讀更多",
    showLess: "收起",
  },
  he: {
    readMore: "קראו עוד",
    showLess: "הציגו פחות",
  },
  ja: {
    readMore: "続きを読む",
    showLess: "表示を減らす",
  },
  ky: {
    readMore: "Кененирээк окуу",
    showLess: "Азыраак көрсөтүү",
  },
  ru: {
    readMore: "Читать дальше",
    showLess: "Скрыть",
  },
};
