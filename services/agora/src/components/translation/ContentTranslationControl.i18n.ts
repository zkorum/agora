import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ContentTranslationControlTranslations {
  translatedFrom: string;
  translating: string;
  showOriginal: string;
  showTranslation: string;
}

export const contentTranslationControlTranslations: Record<
  SupportedDisplayLanguageCodes,
  ContentTranslationControlTranslations
> = {
  en: {
    translatedFrom: "Translated from {language}",
    translating: "Translating...",
    showOriginal: "Show original",
    showTranslation: "Show translation",
  },
  ar: {
    translatedFrom: "مترجم من {language}",
    translating: "جارٍ الترجمة...",
    showOriginal: "عرض الأصل",
    showTranslation: "عرض الترجمة",
  },
  es: {
    translatedFrom: "Traducido del {language}",
    translating: "Traduciendo...",
    showOriginal: "Mostrar original",
    showTranslation: "Mostrar traducción",
  },
  fa: {
    translatedFrom: "ترجمه‌شده از {language}",
    translating: "در حال ترجمه...",
    showOriginal: "نمایش متن اصلی",
    showTranslation: "نمایش ترجمه",
  },
  fr: {
    translatedFrom: "Traduit depuis {language}",
    translating: "Traduction en cours...",
    showOriginal: "Afficher l'original",
    showTranslation: "Afficher la traduction",
  },
  he: {
    translatedFrom: "תורגם מ-{language}",
    translating: "מתרגם...",
    showOriginal: "הציגו מקור",
    showTranslation: "הציגו תרגום",
  },
  ja: {
    translatedFrom: "{language}から翻訳",
    translating: "翻訳中...",
    showOriginal: "原文を表示",
    showTranslation: "翻訳を表示",
  },
  ky: {
    translatedFrom: "{language} тилинен которулган",
    translating: "Которулууда...",
    showOriginal: "Түп нусканы көрсөтүү",
    showTranslation: "Котормону көрсөтүү",
  },
  ru: {
    translatedFrom: "Переведено с {language}",
    translating: "Переводится...",
    showOriginal: "Показать оригинал",
    showTranslation: "Показать перевод",
  },
  "zh-Hans": {
    translatedFrom: "翻译自{language}",
    translating: "正在翻译...",
    showOriginal: "显示原文",
    showTranslation: "显示翻译",
  },
  "zh-Hant": {
    translatedFrom: "翻譯自{language}",
    translating: "正在翻譯...",
    showOriginal: "顯示原文",
    showTranslation: "顯示翻譯",
  },
};
