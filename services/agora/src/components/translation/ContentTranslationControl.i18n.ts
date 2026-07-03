import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ContentTranslationControlTranslations {
  translatedAutomatically: string;
  translating: string;
  showOriginal: string;
  showOriginalLanguage: string;
  showTranslation: string;
}

export const contentTranslationControlTranslations: Record<
  SupportedDisplayLanguageCodes,
  ContentTranslationControlTranslations
> = {
  en: {
    translatedAutomatically: "Translated",
    translating: "Translating...",
    showOriginal: "Show original",
    showOriginalLanguage: "Show original ({language})",
    showTranslation: "Show translation",
  },
  ar: {
    translatedAutomatically: "مترجم",
    translating: "جارٍ الترجمة...",
    showOriginal: "عرض الأصل",
    showOriginalLanguage: "عرض الأصل ({language})",
    showTranslation: "عرض الترجمة",
  },
  es: {
    translatedAutomatically: "Traducido",
    translating: "Traduciendo...",
    showOriginal: "Mostrar original",
    showOriginalLanguage: "Mostrar original ({language})",
    showTranslation: "Mostrar traducción",
  },
  fa: {
    translatedAutomatically: "ترجمه‌شده",
    translating: "در حال ترجمه...",
    showOriginal: "نمایش متن اصلی",
    showOriginalLanguage: "نمایش متن اصلی ({language})",
    showTranslation: "نمایش ترجمه",
  },
  fr: {
    translatedAutomatically: "Traduit",
    translating: "Traduction en cours...",
    showOriginal: "Afficher l'original",
    showOriginalLanguage: "Afficher l'original ({language})",
    showTranslation: "Afficher la traduction",
  },
  he: {
    translatedAutomatically: "תורגם",
    translating: "מתרגם...",
    showOriginal: "הציגו מקור",
    showOriginalLanguage: "הציגו מקור ({language})",
    showTranslation: "הציגו תרגום",
  },
  ja: {
    translatedAutomatically: "翻訳済み",
    translating: "翻訳中...",
    showOriginal: "原文を表示",
    showOriginalLanguage: "原文を表示（{language}）",
    showTranslation: "翻訳を表示",
  },
  ky: {
    translatedAutomatically: "Которулган",
    translating: "Которулууда...",
    showOriginal: "Түп нусканы көрсөтүү",
    showOriginalLanguage: "Түп нусканы көрсөтүү ({language})",
    showTranslation: "Котормону көрсөтүү",
  },
  ru: {
    translatedAutomatically: "Переведено",
    translating: "Переводится...",
    showOriginal: "Показать оригинал",
    showOriginalLanguage: "Показать оригинал ({language})",
    showTranslation: "Показать перевод",
  },
  "zh-Hans": {
    translatedAutomatically: "已翻译",
    translating: "正在翻译...",
    showOriginal: "显示原文",
    showOriginalLanguage: "显示原文（{language}）",
    showTranslation: "显示翻译",
  },
  "zh-Hant": {
    translatedAutomatically: "已翻譯",
    translating: "正在翻譯...",
    showOriginal: "顯示原文",
    showOriginalLanguage: "顯示原文（{language}）",
    showTranslation: "顯示翻譯",
  },
};
