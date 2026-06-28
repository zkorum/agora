import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationLanguageSettingDialogTranslations {
  languagesTitle: string;
  languagesDescription: string;
  detectedLanguageTitle: string;
  detectedLanguageAfterPublishing: string;
  detectedLanguageUnknown: string;
  detectedLanguageDescription: string;
  detectedLanguageUnsupportedDescription: string;
  primaryLanguageTitle: string;
  primaryLanguageDescription: string;
  autoDetectTitle: string;
  autoDetectDescription: string;
  autoDetectDetectedDescription: string;
  autoDetectUnknownDescription: string;
  autoDetectRetryableUnknownDescription: string;
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
  detectedLanguageTitle: "Detected language",
  detectedLanguageAfterPublishing: "After publishing",
  detectedLanguageUnknown: "Not detected",
  detectedLanguageDescription: "Detected from the conversation content.",
  detectedLanguageUnsupportedDescription:
    "Detected from the conversation content. Not supported for translations.",
  primaryLanguageTitle: "Primary language",
  primaryLanguageDescription:
    "Choose the main target language for generated descriptions.",
  autoDetectTitle: "Auto-detect",
  autoDetectDescription: "Detect from the title and body.",
  autoDetectDetectedDescription: "Detected: {language}",
  autoDetectUnknownDescription: "Could not detect language.",
  autoDetectRetryableUnknownDescription:
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
    languagesDescription:
      "Elige los idiomas que Agora debe admitir en esta conversación.",
    primaryLanguageTitle: "Idioma principal",
    primaryLanguageDescription:
      "Elige el idioma principal para las descripciones generadas.",
    autoDetectTitle: "Detectar automáticamente",
    autoDetectDescription: "Detectar a partir del título y el cuerpo.",
    autoDetectDetectedDescription: "Detectado: {language}",
    autoDetectUnknownDescription: "No se pudo detectar el idioma.",
    autoDetectRetryableUnknownDescription:
      "No se pudo detectar el idioma. Guardar con detección automática lo intentará de nuevo.",
    autoDetectUnsupportedDescription:
      "Detectado: {language}. No es compatible con las traducciones.",
    manualTitle: "Idioma manual",
    manualOptionDescription: "Elige un idioma fijo en su lugar.",
    manualLanguageDialogTitle: "Idioma manual",
    manualLanguageDescription: "Elige el idioma principal.",
    additionalLanguagesTitle: "Idiomas adicionales",
    additionalLanguagesNone: "Ninguno",
    additionalLanguagesEmptyDescription:
      "Añade hasta 2 idiomas de destino más.",
    additionalLanguagesDescription:
      "Elige hasta 2 idiomas de destino más.",
    dynamicTranslationTitle: "Traducción dinámica",
    dynamicTranslationDescription:
      "Traduce contenido, proposiciones y encuestas a los idiomas seleccionados.",
    languageSearchPlaceholder: "Buscar idiomas",
  },
  fr: {
    ...englishTranslations,
    languagesTitle: "Langues",
    languagesDescription:
      "Choisissez les langues qu'Agora doit prendre en charge pour cette conversation.",
    primaryLanguageTitle: "Langue principale",
    primaryLanguageDescription:
      "Choisissez la langue principale pour les descriptions générées.",
    autoDetectTitle: "Détection automatique",
    autoDetectDescription: "Détecter à partir du titre et du corps.",
    autoDetectDetectedDescription: "Détecté : {language}",
    autoDetectUnknownDescription: "Impossible de détecter la langue.",
    autoDetectRetryableUnknownDescription:
      "Impossible de détecter la langue. Enregistrer avec la détection automatique réessaiera.",
    autoDetectUnsupportedDescription:
      "Détecté : {language}. Non pris en charge pour les traductions.",
    manualTitle: "Langue manuelle",
    manualOptionDescription: "Choisir une langue fixe à la place.",
    manualLanguageDialogTitle: "Langue manuelle",
    manualLanguageDescription: "Choisissez la langue principale.",
    additionalLanguagesTitle: "Langues supplémentaires",
    additionalLanguagesNone: "Aucune",
    additionalLanguagesEmptyDescription:
      "Ajoutez jusqu'à 2 langues cibles supplémentaires.",
    additionalLanguagesDescription:
      "Choisissez jusqu'à 2 langues cibles supplémentaires.",
    dynamicTranslationTitle: "Traduction dynamique",
    dynamicTranslationDescription:
      "Traduisez le contenu, les propositions et les sondages dans les langues sélectionnées.",
    languageSearchPlaceholder: "Rechercher une langue",
  },
  "zh-Hant": {
    ...englishTranslations,
    languagesTitle: "語言",
    languagesDescription: "選擇 Agora 應為此對話支援的語言。",
    primaryLanguageTitle: "主要語言",
    primaryLanguageDescription: "選擇生成描述的主要目標語言。",
    autoDetectTitle: "自動偵測",
    autoDetectDescription: "從標題和內文偵測。",
    autoDetectDetectedDescription: "已偵測：{language}",
    autoDetectUnknownDescription: "無法偵測語言。",
    autoDetectRetryableUnknownDescription:
      "無法偵測語言。使用自動偵測儲存時會再試一次。",
    autoDetectUnsupportedDescription: "已偵測：{language}。不支援翻譯。",
    manualTitle: "手動語言",
    manualOptionDescription: "改為選擇固定語言。",
    manualLanguageDialogTitle: "手動語言",
    manualLanguageDescription: "選擇主要目標語言。",
    additionalLanguagesTitle: "其他語言",
    additionalLanguagesNone: "無",
    additionalLanguagesEmptyDescription: "最多新增 2 種目標語言。",
    additionalLanguagesDescription: "最多選擇 2 種目標語言。",
    dynamicTranslationTitle: "動態翻譯",
    dynamicTranslationDescription:
      "將內容、提案和問卷翻譯成選定語言。",
    languageSearchPlaceholder: "搜尋語言",
  },
  "zh-Hans": {
    ...englishTranslations,
    languagesTitle: "语言",
    languagesDescription: "选择 Agora 应为此对话支持的语言。",
    primaryLanguageTitle: "主要语言",
    primaryLanguageDescription: "选择生成描述的主要目标语言。",
    autoDetectTitle: "自动检测",
    autoDetectDescription: "根据标题和正文检测。",
    autoDetectDetectedDescription: "已检测：{language}",
    autoDetectUnknownDescription: "无法检测语言。",
    autoDetectRetryableUnknownDescription:
      "无法检测语言。使用自动检测保存时会再试一次。",
    autoDetectUnsupportedDescription: "已检测：{language}。不支持翻译。",
    manualTitle: "手动语言",
    manualOptionDescription: "改为选择固定语言。",
    manualLanguageDialogTitle: "手动语言",
    manualLanguageDescription: "选择主要目标语言。",
    additionalLanguagesTitle: "其他语言",
    additionalLanguagesNone: "无",
    additionalLanguagesEmptyDescription: "最多添加 2 种目标语言。",
    additionalLanguagesDescription: "最多选择 2 种目标语言。",
    dynamicTranslationTitle: "动态翻译",
    dynamicTranslationDescription:
      "将内容、提案和问卷翻译成所选语言。",
    languageSearchPlaceholder: "搜索语言",
  },
  ja: {
    ...englishTranslations,
    languagesTitle: "言語",
    languagesDescription: "この会話で Agora が対応する言語を選択します。",
    primaryLanguageTitle: "主な言語",
    primaryLanguageDescription: "生成される説明の主な対象言語を選択します。",
    autoDetectTitle: "自動検出",
    autoDetectDescription: "タイトルと本文から検出します。",
    autoDetectDetectedDescription: "検出：{language}",
    autoDetectUnknownDescription: "言語を検出できませんでした。",
    autoDetectRetryableUnknownDescription:
      "言語を検出できませんでした。自動検出で保存すると再試行します。",
    autoDetectUnsupportedDescription:
      "検出：{language}。翻訳には対応していません。",
    manualTitle: "手動の言語",
    manualOptionDescription: "代わりに固定の言語を選択します。",
    manualLanguageDialogTitle: "手動の言語",
    manualLanguageDescription: "主な対象言語を選択します。",
    additionalLanguagesTitle: "追加の言語",
    additionalLanguagesNone: "なし",
    additionalLanguagesEmptyDescription: "対象言語を最大 2 つ追加します。",
    additionalLanguagesDescription: "対象言語を最大 2 つ選択します。",
    dynamicTranslationTitle: "動的翻訳",
    dynamicTranslationDescription:
      "コンテンツ、提案、アンケートを選択した言語に翻訳します。",
    languageSearchPlaceholder: "言語を検索",
  },
  ar: {
    ...englishTranslations,
    languagesTitle: "اللغات",
    languagesDescription:
      "اختر اللغات التي يجب أن يدعمها Agora لهذه المحادثة.",
    primaryLanguageTitle: "اللغة الأساسية",
    primaryLanguageDescription:
      "اختر اللغة الهدف الأساسية للأوصاف المُنشأة.",
    autoDetectTitle: "اكتشاف تلقائي",
    autoDetectDescription: "اكتشاف من العنوان والنص.",
    autoDetectDetectedDescription: "تم الاكتشاف: {language}",
    autoDetectUnknownDescription: "تعذر اكتشاف اللغة.",
    autoDetectRetryableUnknownDescription:
      "تعذر اكتشاف اللغة. سيؤدي الحفظ مع الاكتشاف التلقائي إلى المحاولة مرة أخرى.",
    autoDetectUnsupportedDescription:
      "تم الاكتشاف: {language}. غير مدعوم للترجمات.",
    manualTitle: "لغة يدوية",
    manualOptionDescription: "اختر لغة ثابتة بدلاً من ذلك.",
    manualLanguageDialogTitle: "لغة يدوية",
    manualLanguageDescription: "اختر اللغة الهدف الأساسية.",
    additionalLanguagesTitle: "لغات إضافية",
    additionalLanguagesNone: "لا شيء",
    additionalLanguagesEmptyDescription: "أضف ما يصل إلى لغتين هدف إضافيتين.",
    additionalLanguagesDescription: "اختر ما يصل إلى لغتين هدف إضافيتين.",
    dynamicTranslationTitle: "الترجمة الديناميكية",
    dynamicTranslationDescription:
      "ترجم المحتوى والمقترحات والاستبيانات إلى اللغات المحددة.",
    languageSearchPlaceholder: "ابحث عن اللغات",
  },
  fa: {
    ...englishTranslations,
    languagesTitle: "زبان‌ها",
    languagesDescription:
      "زبان‌هایی را که Agora باید برای این گفتگو پشتیبانی کند انتخاب کنید.",
    primaryLanguageTitle: "زبان اصلی",
    primaryLanguageDescription:
      "زبان هدف اصلی برای توضیحات تولیدشده را انتخاب کنید.",
    autoDetectTitle: "تشخیص خودکار",
    autoDetectDescription: "تشخیص از عنوان و متن.",
    autoDetectDetectedDescription: "تشخیص داده شد: {language}",
    autoDetectUnknownDescription: "زبان تشخیص داده نشد.",
    autoDetectRetryableUnknownDescription:
      "زبان تشخیص داده نشد. ذخیره با تشخیص خودکار دوباره تلاش می‌کند.",
    autoDetectUnsupportedDescription:
      "تشخیص داده شد: {language}. برای ترجمه‌ها پشتیبانی نمی‌شود.",
    manualTitle: "زبان دستی",
    manualOptionDescription: "به‌جای آن یک زبان ثابت انتخاب کنید.",
    manualLanguageDialogTitle: "زبان دستی",
    manualLanguageDescription: "زبان هدف اصلی را انتخاب کنید.",
    additionalLanguagesTitle: "زبان‌های اضافی",
    additionalLanguagesNone: "هیچ‌کدام",
    additionalLanguagesEmptyDescription: "تا ۲ زبان هدف دیگر اضافه کنید.",
    additionalLanguagesDescription: "تا ۲ زبان هدف دیگر انتخاب کنید.",
    dynamicTranslationTitle: "ترجمه پویا",
    dynamicTranslationDescription:
      "محتوا، پیشنهادها و نظرسنجی‌ها را به زبان‌های انتخاب‌شده ترجمه کنید.",
    languageSearchPlaceholder: "جستجوی زبان‌ها",
  },
  he: {
    ...englishTranslations,
    languagesTitle: "שפות",
    languagesDescription: "בחרו את השפות ש-Agora תתמוך בהן בשיחה זו.",
    primaryLanguageTitle: "שפה ראשית",
    primaryLanguageDescription: "בחרו את שפת היעד הראשית לתיאורים שנוצרים.",
    autoDetectTitle: "זיהוי אוטומטי",
    autoDetectDescription: "זיהוי מתוך הכותרת והגוף.",
    autoDetectDetectedDescription: "זוהה: {language}",
    autoDetectUnknownDescription: "לא ניתן היה לזהות את השפה.",
    autoDetectRetryableUnknownDescription:
      "לא ניתן היה לזהות את השפה. שמירה עם זיהוי אוטומטי תנסה שוב.",
    autoDetectUnsupportedDescription: "זוהה: {language}. לא נתמך לתרגומים.",
    manualTitle: "שפה ידנית",
    manualOptionDescription: "בחרו שפה קבועה במקום זאת.",
    manualLanguageDialogTitle: "שפה ידנית",
    manualLanguageDescription: "בחרו את שפת היעד הראשית.",
    additionalLanguagesTitle: "שפות נוספות",
    additionalLanguagesNone: "אין",
    additionalLanguagesEmptyDescription: "אפשר להוסיף עד 2 שפות יעד נוספות.",
    additionalLanguagesDescription: "בחרו עד 2 שפות יעד נוספות.",
    dynamicTranslationTitle: "תרגום דינמי",
    dynamicTranslationDescription:
      "תרגמו תוכן, הצעות וסקרים לשפות שנבחרו.",
    languageSearchPlaceholder: "חיפוש שפות",
  },
  ky: {
    ...englishTranslations,
    languagesTitle: "Тилдер",
    languagesDescription:
      "Бул талкуу үчүн Agora колдой турган тилдерди тандаңыз.",
    primaryLanguageTitle: "Негизги тил",
    primaryLanguageDescription:
      "Түзүлгөн сүрөттөмөлөр үчүн негизги максаттуу тилди тандаңыз.",
    autoDetectTitle: "Автоматтык аныктоо",
    autoDetectDescription: "Аталыштан жана тексттен аныктоо.",
    autoDetectDetectedDescription: "Аныкталды: {language}",
    autoDetectUnknownDescription: "Тилди аныктоо мүмкүн болгон жок.",
    autoDetectRetryableUnknownDescription:
      "Тилди аныктоо мүмкүн болгон жок. Автоматтык аныктоо менен сактаганда кайра аракет кылат.",
    autoDetectUnsupportedDescription:
      "Аныкталды: {language}. Которуулар үчүн колдоого алынбайт.",
    manualTitle: "Кол менен тил",
    manualOptionDescription: "Анын ордуна туруктуу тилди тандаңыз.",
    manualLanguageDialogTitle: "Кол менен тил",
    manualLanguageDescription: "Негизги максаттуу тилди тандаңыз.",
    additionalLanguagesTitle: "Кошумча тилдер",
    additionalLanguagesNone: "Жок",
    additionalLanguagesEmptyDescription: "Дагы 2ге чейин максаттуу тил кошуңуз.",
    additionalLanguagesDescription: "Дагы 2ге чейин максаттуу тил тандаңыз.",
    dynamicTranslationTitle: "Динамикалык котормо",
    dynamicTranslationDescription:
      "Мазмунду, сунуштарды жана сурамжылоолорду тандалган тилдерге которуңуз.",
    languageSearchPlaceholder: "Тилдерди издөө",
  },
  ru: {
    ...englishTranslations,
    languagesTitle: "Языки",
    languagesDescription:
      "Выберите языки, которые Agora должна поддерживать для этого обсуждения.",
    primaryLanguageTitle: "Основной язык",
    primaryLanguageDescription:
      "Выберите основной целевой язык для сгенерированных описаний.",
    autoDetectTitle: "Автоопределение",
    autoDetectDescription: "Определять по заголовку и тексту.",
    autoDetectDetectedDescription: "Определено: {language}",
    autoDetectUnknownDescription: "Не удалось определить язык.",
    autoDetectRetryableUnknownDescription:
      "Не удалось определить язык. При сохранении с автоопределением будет выполнена повторная попытка.",
    autoDetectUnsupportedDescription:
      "Определено: {language}. Не поддерживается для переводов.",
    manualTitle: "Ручной язык",
    manualOptionDescription: "Выберите фиксированный язык вместо этого.",
    manualLanguageDialogTitle: "Ручной язык",
    manualLanguageDescription: "Выберите основной целевой язык.",
    additionalLanguagesTitle: "Дополнительные языки",
    additionalLanguagesNone: "Нет",
    additionalLanguagesEmptyDescription:
      "Добавьте до 2 дополнительных целевых языков.",
    additionalLanguagesDescription:
      "Выберите до 2 дополнительных целевых языков.",
    dynamicTranslationTitle: "Динамический перевод",
    dynamicTranslationDescription:
      "Переводите контент, предложения и опросы на выбранные языки.",
    languageSearchPlaceholder: "Поиск языков",
  },
};
