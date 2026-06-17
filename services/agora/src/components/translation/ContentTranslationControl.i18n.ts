import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ContentTranslationControlTranslations {
  translatedFrom: string;
  translatedFromUndeterminedLanguage: string;
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
    translatedFromUndeterminedLanguage: "Translated from undetermined language",
    translating: "Translating...",
    showOriginal: "Show original",
    showTranslation: "Show translation",
  },
  ar: {
    translatedFrom: "مترجم من {language}",
    translatedFromUndeterminedLanguage: "مترجم من لغة غير محددة",
    translating: "جارٍ الترجمة...",
    showOriginal: "عرض الأصل",
    showTranslation: "عرض الترجمة",
  },
  es: {
    translatedFrom: "Traducido del {language}",
    translatedFromUndeterminedLanguage: "Traducido de un idioma indeterminado",
    translating: "Traduciendo...",
    showOriginal: "Mostrar original",
    showTranslation: "Mostrar traducción",
  },
  fa: {
    translatedFrom: "ترجمه‌شده از {language}",
    translatedFromUndeterminedLanguage: "ترجمه‌شده از زبان نامشخص",
    translating: "در حال ترجمه...",
    showOriginal: "نمایش متن اصلی",
    showTranslation: "نمایش ترجمه",
  },
  fr: {
    translatedFrom: "Traduit depuis {language}",
    translatedFromUndeterminedLanguage: "Traduit depuis une langue indéterminée",
    translating: "Traduction en cours...",
    showOriginal: "Afficher l'original",
    showTranslation: "Afficher la traduction",
  },
  he: {
    translatedFrom: "תורגם מ-{language}",
    translatedFromUndeterminedLanguage: "תורגם משפה לא מזוהה",
    translating: "מתרגם...",
    showOriginal: "הציגו מקור",
    showTranslation: "הציגו תרגום",
  },
  ja: {
    translatedFrom: "{language}から翻訳",
    translatedFromUndeterminedLanguage: "判定できない言語から翻訳",
    translating: "翻訳中...",
    showOriginal: "原文を表示",
    showTranslation: "翻訳を表示",
  },
  ky: {
    translatedFrom: "{language} тилинен которулган",
    translatedFromUndeterminedLanguage: "Аныкталбаган тилден которулган",
    translating: "Которулууда...",
    showOriginal: "Түп нусканы көрсөтүү",
    showTranslation: "Котормону көрсөтүү",
  },
  ru: {
    translatedFrom: "Переведено с {language}",
    translatedFromUndeterminedLanguage: "Переведено с неопределенного языка",
    translating: "Переводится...",
    showOriginal: "Показать оригинал",
    showTranslation: "Показать перевод",
  },
  "zh-Hans": {
    translatedFrom: "翻译自{language}",
    translatedFromUndeterminedLanguage: "翻译自未确定的语言",
    translating: "正在翻译...",
    showOriginal: "显示原文",
    showTranslation: "显示翻译",
  },
  "zh-Hant": {
    translatedFrom: "翻譯自{language}",
    translatedFromUndeterminedLanguage: "翻譯自未確定的語言",
    translating: "正在翻譯...",
    showOriginal: "顯示原文",
    showTranslation: "顯示翻譯",
  },
};
