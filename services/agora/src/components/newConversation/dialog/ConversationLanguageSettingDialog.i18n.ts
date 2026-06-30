import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationLanguageSettingDialogTranslations {
  languagesTitle: string;
  languagesDescription: string;
  languageAutoLabel: string;
  detectedLanguageAfterPublishing: string;
  autoDetectDetectedDescription: string;
  autoDetectUnknownDescription: string;
  autoDetectRetryableUnknownDescription: string;
  autoDetectUnsupportedDescription: string;
  additionalLanguagesEmptyDescription: string;
  additionalLanguagesDescription: string;
  dynamicTranslationTitle: string;
  dynamicTranslationDescription: string;
  dynamicTranslationOn: string;
  dynamicTranslationOff: string;
  languageSearchPlaceholder: string;
}

const englishTranslations: ConversationLanguageSettingDialogTranslations = {
  languagesTitle: "Languages",
  languagesDescription: "Choose the languages Agora should support for this conversation.",
  languageAutoLabel: "Auto",
  detectedLanguageAfterPublishing: "Detect main language after publishing",
  autoDetectDetectedDescription: "Detected: {language}",
  autoDetectUnknownDescription: "Could not detect language.",
  autoDetectRetryableUnknownDescription:
    "Could not detect language. Saving with auto-detect will try again.",
  autoDetectUnsupportedDescription:
    "Detected: {language}. Not supported for translations.",
  additionalLanguagesEmptyDescription: "Add up to 2 additional target languages. If Auto detects one of them, it counts once.",
  additionalLanguagesDescription: "Choose up to 2 additional target languages. If Auto detects one of them, it counts once.",
  dynamicTranslationTitle: "Dynamic Translation",
  dynamicTranslationDescription:
    "Translate title, body, statements, and surveys into the selected languages.",
  dynamicTranslationOn: "On",
  dynamicTranslationOff: "Off",
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
    languageAutoLabel: "Auto",
    detectedLanguageAfterPublishing:
      "Detectar idioma principal después de publicar",
    autoDetectDetectedDescription: "Detectado: {language}",
    autoDetectUnknownDescription: "No se pudo detectar el idioma.",
    autoDetectRetryableUnknownDescription:
      "No se pudo detectar el idioma. Guardar con detección automática lo intentará de nuevo.",
    autoDetectUnsupportedDescription:
      "Detectado: {language}. No es compatible con las traducciones.",
    additionalLanguagesEmptyDescription:
      "Añade hasta 2 idiomas de destino adicionales. Si Auto detecta uno de ellos, cuenta una sola vez.",
    additionalLanguagesDescription:
      "Elige hasta 2 idiomas de destino adicionales. Si Auto detecta uno de ellos, cuenta una sola vez.",
    dynamicTranslationTitle: "Traducción dinámica",
    dynamicTranslationDescription:
      "Traduce el título, el cuerpo, las proposiciones y las encuestas a los idiomas seleccionados.",
    dynamicTranslationOn: "Activada",
    dynamicTranslationOff: "Desactivada",
    languageSearchPlaceholder: "Buscar idiomas",
  },
  fr: {
    ...englishTranslations,
    languagesTitle: "Langues",
    languagesDescription:
      "Choisissez les langues qu'Agora doit prendre en charge pour cette conversation.",
    languageAutoLabel: "Auto",
    detectedLanguageAfterPublishing:
      "Détecter la langue principale après publication",
    autoDetectDetectedDescription: "Détecté : {language}",
    autoDetectUnknownDescription: "Impossible de détecter la langue.",
    autoDetectRetryableUnknownDescription:
      "Impossible de détecter la langue. Enregistrer avec la détection automatique réessaiera.",
    autoDetectUnsupportedDescription:
      "Détecté : {language}. Non pris en charge pour les traductions.",
    additionalLanguagesEmptyDescription:
      "Ajoutez jusqu'à 2 langues cibles supplémentaires. Si Auto détecte l'une d'elles, elle ne compte qu'une seule fois.",
    additionalLanguagesDescription:
      "Choisissez jusqu'à 2 langues cibles supplémentaires. Si Auto détecte l'une d'elles, elle ne compte qu'une seule fois.",
    dynamicTranslationTitle: "Traduction dynamique",
    dynamicTranslationDescription:
      "Traduisez le titre, le corps, les propositions et les sondages dans les langues sélectionnées.",
    dynamicTranslationOn: "Activée",
    dynamicTranslationOff: "Désactivée",
    languageSearchPlaceholder: "Rechercher une langue",
  },
  "zh-Hant": {
    ...englishTranslations,
    languagesTitle: "語言",
    languagesDescription: "選擇 Agora 應為此對話支援的語言。",
    languageAutoLabel: "自動",
    detectedLanguageAfterPublishing: "發布後偵測主要語言",
    autoDetectDetectedDescription: "已偵測：{language}",
    autoDetectUnknownDescription: "無法偵測語言。",
    autoDetectRetryableUnknownDescription:
      "無法偵測語言。使用自動偵測儲存時會再試一次。",
    autoDetectUnsupportedDescription: "已偵測：{language}。不支援翻譯。",
    additionalLanguagesEmptyDescription:
      "最多新增 2 種額外目標語言。如果 Auto 偵測到其中一種，只會計算一次。",
    additionalLanguagesDescription:
      "最多選擇 2 種額外目標語言。如果 Auto 偵測到其中一種，只會計算一次。",
    dynamicTranslationTitle: "動態翻譯",
    dynamicTranslationDescription:
      "將標題、內文、提案和問卷翻譯成選定語言。",
    dynamicTranslationOn: "開啟",
    dynamicTranslationOff: "關閉",
    languageSearchPlaceholder: "搜尋語言",
  },
  "zh-Hans": {
    ...englishTranslations,
    languagesTitle: "语言",
    languagesDescription: "选择 Agora 应为此对话支持的语言。",
    languageAutoLabel: "自动",
    detectedLanguageAfterPublishing: "发布后检测主要语言",
    autoDetectDetectedDescription: "已检测：{language}",
    autoDetectUnknownDescription: "无法检测语言。",
    autoDetectRetryableUnknownDescription:
      "无法检测语言。使用自动检测保存时会再试一次。",
    autoDetectUnsupportedDescription: "已检测：{language}。不支持翻译。",
    additionalLanguagesEmptyDescription:
      "最多添加 2 种额外目标语言。如果 Auto 检测到其中一种，只会计算一次。",
    additionalLanguagesDescription:
      "最多选择 2 种额外目标语言。如果 Auto 检测到其中一种，只会计算一次。",
    dynamicTranslationTitle: "动态翻译",
    dynamicTranslationDescription:
      "将标题、正文、提案和问卷翻译成所选语言。",
    dynamicTranslationOn: "开启",
    dynamicTranslationOff: "关闭",
    languageSearchPlaceholder: "搜索语言",
  },
  ja: {
    ...englishTranslations,
    languagesTitle: "言語",
    languagesDescription: "この会話で Agora が対応する言語を選択します。",
    languageAutoLabel: "自動",
    detectedLanguageAfterPublishing: "公開後に主な言語を検出",
    autoDetectDetectedDescription: "検出：{language}",
    autoDetectUnknownDescription: "言語を検出できませんでした。",
    autoDetectRetryableUnknownDescription:
      "言語を検出できませんでした。自動検出で保存すると再試行します。",
    autoDetectUnsupportedDescription:
      "検出：{language}。翻訳には対応していません。",
    additionalLanguagesEmptyDescription:
      "追加の対象言語を最大2つ追加します。Auto がそのうちの1つを検出した場合、1つとして数えます。",
    additionalLanguagesDescription:
      "追加の対象言語を最大2つ選択します。Auto がそのうちの1つを検出した場合、1つとして数えます。",
    dynamicTranslationTitle: "動的翻訳",
    dynamicTranslationDescription:
      "タイトル、本文、提案、アンケートを選択した言語に翻訳します。",
    dynamicTranslationOn: "オン",
    dynamicTranslationOff: "オフ",
    languageSearchPlaceholder: "言語を検索",
  },
  ar: {
    ...englishTranslations,
    languagesTitle: "اللغات",
    languagesDescription:
      "اختر اللغات التي يجب أن يدعمها Agora لهذه المحادثة.",
    languageAutoLabel: "تلقائي",
    detectedLanguageAfterPublishing: "اكتشاف اللغة الرئيسية بعد النشر",
    autoDetectDetectedDescription: "تم الاكتشاف: {language}",
    autoDetectUnknownDescription: "تعذر اكتشاف اللغة.",
    autoDetectRetryableUnknownDescription:
      "تعذر اكتشاف اللغة. سيؤدي الحفظ مع الاكتشاف التلقائي إلى المحاولة مرة أخرى.",
    autoDetectUnsupportedDescription:
      "تم الاكتشاف: {language}. غير مدعوم للترجمات.",
    additionalLanguagesEmptyDescription:
      "أضف ما يصل إلى لغتين هدف إضافيتين. إذا اكتشف Auto إحداهما، فستُحتسب مرة واحدة.",
    additionalLanguagesDescription:
      "اختر ما يصل إلى لغتين هدف إضافيتين. إذا اكتشف Auto إحداهما، فستُحتسب مرة واحدة.",
    dynamicTranslationTitle: "الترجمة الديناميكية",
    dynamicTranslationDescription:
      "ترجم العنوان والمتن والمقترحات والاستبيانات إلى اللغات المحددة.",
    dynamicTranslationOn: "مفعلة",
    dynamicTranslationOff: "معطلة",
    languageSearchPlaceholder: "ابحث عن اللغات",
  },
  fa: {
    ...englishTranslations,
    languagesTitle: "زبان‌ها",
    languagesDescription:
      "زبان‌هایی را که Agora باید برای این گفتگو پشتیبانی کند انتخاب کنید.",
    languageAutoLabel: "خودکار",
    detectedLanguageAfterPublishing: "تشخیص زبان اصلی پس از انتشار",
    autoDetectDetectedDescription: "تشخیص داده شد: {language}",
    autoDetectUnknownDescription: "زبان تشخیص داده نشد.",
    autoDetectRetryableUnknownDescription:
      "زبان تشخیص داده نشد. ذخیره با تشخیص خودکار دوباره تلاش می‌کند.",
    autoDetectUnsupportedDescription:
      "تشخیص داده شد: {language}. برای ترجمه‌ها پشتیبانی نمی‌شود.",
    additionalLanguagesEmptyDescription:
      "تا ۲ زبان هدف اضافی اضافه کنید. اگر Auto یکی از آن‌ها را تشخیص دهد، یک‌بار شمرده می‌شود.",
    additionalLanguagesDescription:
      "تا ۲ زبان هدف اضافی انتخاب کنید. اگر Auto یکی از آن‌ها را تشخیص دهد، یک‌بار شمرده می‌شود.",
    dynamicTranslationTitle: "ترجمه پویا",
    dynamicTranslationDescription:
      "عنوان، متن، پیشنهادها و نظرسنجی‌ها را به زبان‌های انتخاب‌شده ترجمه کنید.",
    dynamicTranslationOn: "روشن",
    dynamicTranslationOff: "خاموش",
    languageSearchPlaceholder: "جستجوی زبان‌ها",
  },
  he: {
    ...englishTranslations,
    languagesTitle: "שפות",
    languagesDescription: "בחרו את השפות ש-Agora תתמוך בהן בשיחה זו.",
    languageAutoLabel: "אוטומטי",
    detectedLanguageAfterPublishing: "זיהוי השפה הראשית לאחר הפרסום",
    autoDetectDetectedDescription: "זוהה: {language}",
    autoDetectUnknownDescription: "לא ניתן היה לזהות את השפה.",
    autoDetectRetryableUnknownDescription:
      "לא ניתן היה לזהות את השפה. שמירה עם זיהוי אוטומטי תנסה שוב.",
    autoDetectUnsupportedDescription: "זוהה: {language}. לא נתמך לתרגומים.",
    additionalLanguagesEmptyDescription:
      "אפשר להוסיף עד 2 שפות יעד נוספות. אם Auto מזהה אחת מהן, היא נספרת פעם אחת.",
    additionalLanguagesDescription:
      "בחרו עד 2 שפות יעד נוספות. אם Auto מזהה אחת מהן, היא נספרת פעם אחת.",
    dynamicTranslationTitle: "תרגום דינמי",
    dynamicTranslationDescription:
      "תרגמו כותרת, גוף, הצעות וסקרים לשפות שנבחרו.",
    dynamicTranslationOn: "מופעל",
    dynamicTranslationOff: "כבוי",
    languageSearchPlaceholder: "חיפוש שפות",
  },
  ky: {
    ...englishTranslations,
    languagesTitle: "Тилдер",
    languagesDescription:
      "Бул талкуу үчүн Agora колдой турган тилдерди тандаңыз.",
    languageAutoLabel: "Авто",
    detectedLanguageAfterPublishing:
      "Жарыялангандан кийин негизги тилди аныктоо",
    autoDetectDetectedDescription: "Аныкталды: {language}",
    autoDetectUnknownDescription: "Тилди аныктоо мүмкүн болгон жок.",
    autoDetectRetryableUnknownDescription:
      "Тилди аныктоо мүмкүн болгон жок. Автоматтык аныктоо менен сактаганда кайра аракет кылат.",
    autoDetectUnsupportedDescription:
      "Аныкталды: {language}. Которуулар үчүн колдоого алынбайт.",
    additionalLanguagesEmptyDescription:
      "Дагы 2ге чейин кошумча максаттуу тил кошуңуз. Эгер Auto алардын бирин аныктаса, ал бир жолу гана эсептелет.",
    additionalLanguagesDescription:
      "Дагы 2ге чейин кошумча максаттуу тил тандаңыз. Эгер Auto алардын бирин аныктаса, ал бир жолу гана эсептелет.",
    dynamicTranslationTitle: "Динамикалык котормо",
    dynamicTranslationDescription:
      "Аталышты, негизги текстти, сунуштарды жана сурамжылоолорду тандалган тилдерге которуңуз.",
    dynamicTranslationOn: "Күйүк",
    dynamicTranslationOff: "Өчүк",
    languageSearchPlaceholder: "Тилдерди издөө",
  },
  ru: {
    ...englishTranslations,
    languagesTitle: "Языки",
    languagesDescription:
      "Выберите языки, которые Agora должна поддерживать для этого обсуждения.",
    languageAutoLabel: "Авто",
    detectedLanguageAfterPublishing:
      "Определить основной язык после публикации",
    autoDetectDetectedDescription: "Определено: {language}",
    autoDetectUnknownDescription: "Не удалось определить язык.",
    autoDetectRetryableUnknownDescription:
      "Не удалось определить язык. При сохранении с автоопределением будет выполнена повторная попытка.",
    autoDetectUnsupportedDescription:
      "Определено: {language}. Не поддерживается для переводов.",
    additionalLanguagesEmptyDescription:
      "Добавьте до 2 дополнительных целевых языков. Если Auto определит один из них, он будет засчитан один раз.",
    additionalLanguagesDescription:
      "Выберите до 2 дополнительных целевых языков. Если Auto определит один из них, он будет засчитан один раз.",
    dynamicTranslationTitle: "Динамический перевод",
    dynamicTranslationDescription:
      "Переводите заголовок, текст, предложения и опросы на выбранные языки.",
    dynamicTranslationOn: "Включено",
    dynamicTranslationOff: "Выключено",
    languageSearchPlaceholder: "Поиск языков",
  },
};
