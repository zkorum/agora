import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationLanguageSettingDialogTranslations {
  languagesTitle: string;
  languagesDescription: string;
  primaryLanguageTitle: string;
  primaryLanguageDescription: string;
  autoDetectTitle: string;
  autoDetectDescription: string;
  autoDetectDetectedDescription: string;
  autoDetectUnknownDescription: string;
  autoDetectUnsupportedDescription: string;
  manualTitle: string;
  manualOptionDescription: string;
  manualLanguageDialogTitle: string;
  manualLanguageDescription: string;
  additionalLanguagesTitle: string;
  additionalLanguagesNone: string;
  additionalLanguagesEmptyDescription: string;
  additionalLanguagesDescription: string;
  dynamicTranslationTitle: string;
  dynamicTranslationDescription: string;
  languageSearchPlaceholder: string;
}

const englishTranslations: ConversationLanguageSettingDialogTranslations = {
  languagesTitle: "Languages",
  languagesDescription: "Choose the languages Agora should support for this conversation.",
  primaryLanguageTitle: "Primary language",
  primaryLanguageDescription:
    "Choose the main target language for generated descriptions.",
  autoDetectTitle: "Auto-detect",
  autoDetectDescription: "Detect from the title and body.",
  autoDetectDetectedDescription: "Detected: {language}",
  autoDetectUnknownDescription:
    "Could not detect language. Saving with auto-detect will try again.",
  autoDetectUnsupportedDescription:
    "Detected: {language}. Not supported for translations.",
  manualTitle: "Manual language",
  manualOptionDescription: "Choose a fixed language instead.",
  manualLanguageDialogTitle: "Manual language",
  manualLanguageDescription: "Choose the main target language.",
  additionalLanguagesTitle: "Additional languages",
  additionalLanguagesNone: "None",
  additionalLanguagesEmptyDescription: "Add up to 2 more target languages.",
  additionalLanguagesDescription: "Choose up to 2 more target languages.",
  dynamicTranslationTitle: "Dynamic Translation",
  dynamicTranslationDescription:
    "Translate content, statements, and surveys into the selected languages.",
  languageSearchPlaceholder: "Search languages",
};

export const conversationLanguageSettingDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationLanguageSettingDialogTranslations
> = {
  en: englishTranslations,
  es: {
    ...englishTranslations,
    languagesTitle: "Idiomas",
    primaryLanguageTitle: "Idioma principal",
    autoDetectTitle: "Detectar automáticamente",
    autoDetectDescription: "Detectar a partir del título y el cuerpo.",
    autoDetectDetectedDescription: "Detectado: {language}",
    autoDetectUnknownDescription:
      "No se pudo detectar el idioma. Guardar con detección automática lo intentará de nuevo.",
    autoDetectUnsupportedDescription:
      "Detectado: {language}. No es compatible con las traducciones.",
    manualTitle: "Idioma manual",
    manualLanguageDialogTitle: "Idioma manual",
    additionalLanguagesTitle: "Idiomas adicionales",
    additionalLanguagesNone: "Ninguno",
    dynamicTranslationTitle: "Traducción dinámica",
    languageSearchPlaceholder: "Buscar idiomas",
  },
  fr: {
    ...englishTranslations,
    languagesTitle: "Langues",
    primaryLanguageTitle: "Langue principale",
    autoDetectTitle: "Détection automatique",
    autoDetectDescription: "Détecter à partir du titre et du corps.",
    autoDetectDetectedDescription: "Détecté : {language}",
    autoDetectUnknownDescription:
      "Impossible de détecter la langue. Enregistrer avec la détection automatique réessaiera.",
    autoDetectUnsupportedDescription:
      "Détecté : {language}. Non pris en charge pour les traductions.",
    manualTitle: "Langue manuelle",
    manualOptionDescription: "Choisir une langue fixe à la place.",
    manualLanguageDialogTitle: "Langue manuelle",
    additionalLanguagesTitle: "Langues supplémentaires",
    additionalLanguagesNone: "Aucune",
    dynamicTranslationTitle: "Traduction dynamique",
    languageSearchPlaceholder: "Rechercher une langue",
  },
  "zh-Hant": {
    ...englishTranslations,
    languagesTitle: "語言",
    primaryLanguageTitle: "主要語言",
    autoDetectTitle: "自動偵測",
    autoDetectDescription: "從標題和內文偵測。",
    autoDetectDetectedDescription: "已偵測：{language}",
    autoDetectUnknownDescription:
      "無法偵測語言。使用自動偵測儲存時會再試一次。",
    autoDetectUnsupportedDescription: "已偵測：{language}。不支援翻譯。",
    manualTitle: "手動語言",
    manualLanguageDialogTitle: "手動語言",
    additionalLanguagesTitle: "其他語言",
    additionalLanguagesNone: "無",
    dynamicTranslationTitle: "動態翻譯",
    languageSearchPlaceholder: "搜尋語言",
  },
  "zh-Hans": {
    ...englishTranslations,
    languagesTitle: "语言",
    primaryLanguageTitle: "主要语言",
    autoDetectTitle: "自动检测",
    autoDetectDescription: "根据标题和正文检测。",
    autoDetectDetectedDescription: "已检测：{language}",
    autoDetectUnknownDescription:
      "无法检测语言。使用自动检测保存时会再试一次。",
    autoDetectUnsupportedDescription: "已检测：{language}。不支持翻译。",
    manualTitle: "手动语言",
    manualLanguageDialogTitle: "手动语言",
    additionalLanguagesTitle: "其他语言",
    additionalLanguagesNone: "无",
    dynamicTranslationTitle: "动态翻译",
    languageSearchPlaceholder: "搜索语言",
  },
  ja: {
    ...englishTranslations,
    languagesTitle: "言語",
    primaryLanguageTitle: "主な言語",
    autoDetectTitle: "自動検出",
    autoDetectDescription: "タイトルと本文から検出します。",
    autoDetectDetectedDescription: "検出：{language}",
    autoDetectUnknownDescription:
      "言語を検出できませんでした。自動検出で保存すると再試行します。",
    autoDetectUnsupportedDescription:
      "検出：{language}。翻訳には対応していません。",
    manualTitle: "手動の言語",
    manualLanguageDialogTitle: "手動の言語",
    additionalLanguagesTitle: "追加の言語",
    additionalLanguagesNone: "なし",
    dynamicTranslationTitle: "動的翻訳",
    languageSearchPlaceholder: "言語を検索",
  },
  ar: {
    ...englishTranslations,
    languagesTitle: "اللغات",
    primaryLanguageTitle: "اللغة الأساسية",
    autoDetectTitle: "اكتشاف تلقائي",
    autoDetectDescription: "اكتشاف من العنوان والنص.",
    autoDetectDetectedDescription: "تم الاكتشاف: {language}",
    autoDetectUnknownDescription:
      "تعذر اكتشاف اللغة. سيؤدي الحفظ مع الاكتشاف التلقائي إلى المحاولة مرة أخرى.",
    autoDetectUnsupportedDescription:
      "تم الاكتشاف: {language}. غير مدعوم للترجمات.",
    manualTitle: "لغة يدوية",
    manualLanguageDialogTitle: "لغة يدوية",
    additionalLanguagesTitle: "لغات إضافية",
    additionalLanguagesNone: "لا شيء",
    dynamicTranslationTitle: "الترجمة الديناميكية",
    languageSearchPlaceholder: "ابحث عن اللغات",
  },
  fa: {
    ...englishTranslations,
    languagesTitle: "زبان‌ها",
    primaryLanguageTitle: "زبان اصلی",
    autoDetectTitle: "تشخیص خودکار",
    autoDetectDescription: "تشخیص از عنوان و متن.",
    autoDetectDetectedDescription: "تشخیص داده شد: {language}",
    autoDetectUnknownDescription:
      "زبان تشخیص داده نشد. ذخیره با تشخیص خودکار دوباره تلاش می‌کند.",
    autoDetectUnsupportedDescription:
      "تشخیص داده شد: {language}. برای ترجمه‌ها پشتیبانی نمی‌شود.",
    manualTitle: "زبان دستی",
    manualLanguageDialogTitle: "زبان دستی",
    additionalLanguagesTitle: "زبان‌های اضافی",
    additionalLanguagesNone: "هیچ‌کدام",
    dynamicTranslationTitle: "ترجمه پویا",
    languageSearchPlaceholder: "جستجوی زبان‌ها",
  },
  he: {
    ...englishTranslations,
    languagesTitle: "שפות",
    primaryLanguageTitle: "שפה ראשית",
    autoDetectTitle: "זיהוי אוטומטי",
    autoDetectDescription: "זיהוי מתוך הכותרת והגוף.",
    autoDetectDetectedDescription: "זוהה: {language}",
    autoDetectUnknownDescription:
      "לא ניתן היה לזהות את השפה. שמירה עם זיהוי אוטומטי תנסה שוב.",
    autoDetectUnsupportedDescription: "זוהה: {language}. לא נתמך לתרגומים.",
    manualTitle: "שפה ידנית",
    manualLanguageDialogTitle: "שפה ידנית",
    additionalLanguagesTitle: "שפות נוספות",
    additionalLanguagesNone: "אין",
    dynamicTranslationTitle: "תרגום דינמי",
    languageSearchPlaceholder: "חיפוש שפות",
  },
  ky: {
    ...englishTranslations,
    languagesTitle: "Тилдер",
    primaryLanguageTitle: "Негизги тил",
    autoDetectTitle: "Автоматтык аныктоо",
    autoDetectDescription: "Аталыштан жана тексттен аныктоо.",
    autoDetectDetectedDescription: "Аныкталды: {language}",
    autoDetectUnknownDescription:
      "Тилди аныктоо мүмкүн болгон жок. Автоматтык аныктоо менен сактаганда кайра аракет кылат.",
    autoDetectUnsupportedDescription:
      "Аныкталды: {language}. Которуулар үчүн колдоого алынбайт.",
    manualTitle: "Кол менен тил",
    manualLanguageDialogTitle: "Кол менен тил",
    additionalLanguagesTitle: "Кошумча тилдер",
    additionalLanguagesNone: "Жок",
    dynamicTranslationTitle: "Динамикалык котормо",
    languageSearchPlaceholder: "Тилдерди издөө",
  },
  ru: {
    ...englishTranslations,
    languagesTitle: "Языки",
    primaryLanguageTitle: "Основной язык",
    autoDetectTitle: "Автоопределение",
    autoDetectDescription: "Определять по заголовку и тексту.",
    autoDetectDetectedDescription: "Определено: {language}",
    autoDetectUnknownDescription:
      "Не удалось определить язык. При сохранении с автоопределением будет выполнена повторная попытка.",
    autoDetectUnsupportedDescription:
      "Определено: {language}. Не поддерживается для переводов.",
    manualTitle: "Ручной язык",
    manualLanguageDialogTitle: "Ручной язык",
    additionalLanguagesTitle: "Дополнительные языки",
    additionalLanguagesNone: "Нет",
    dynamicTranslationTitle: "Динамический перевод",
    languageSearchPlaceholder: "Поиск языков",
  },
};
