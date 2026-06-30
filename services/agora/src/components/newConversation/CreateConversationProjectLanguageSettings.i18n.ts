import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CreateConversationProjectLanguageSettingsTranslations {
  projectLabel: string;
  noProjectLabel: string;
  projectSelectionDescription: string;
  projectLanguagesDescription: string;
  inheritProjectLanguagesTitle: string;
  inheritProjectLanguagesDescription: string;
  inheritedProjectLanguagesDescription: string;
  customLanguagesDescription: string;
  noProjectLanguagesDescription: string;
  usingProjectLanguagesDescription: string;
  overridingProjectLanguagesDescription: string;
  inheritSummaryPrefix: string;
  overrideSummaryPrefix: string;
  projectLanguagesFallback: string;
}

const englishTranslations: CreateConversationProjectLanguageSettingsTranslations = {
  projectLabel: "Project",
  noProjectLabel: "No project",
  projectSelectionDescription:
    "Choose the listed project this conversation belongs to, or use no project.",
  projectLanguagesDescription:
    "Choose whether this conversation should inherit project language settings or override them.",
  inheritProjectLanguagesTitle: "Inherit project languages",
  inheritProjectLanguagesDescription:
    "Use the selected project's language and translation settings.",
  inheritedProjectLanguagesDescription:
    "Use the selected project's language settings.",
  customLanguagesDescription:
    "Custom language settings for this conversation.",
  noProjectLanguagesDescription:
    "No project selected. Use conversation-specific language settings.",
  usingProjectLanguagesDescription: "Using {projectTitle}'s language settings.",
  overridingProjectLanguagesDescription:
    "Overriding {projectTitle}'s language settings for this conversation.",
  inheritSummaryPrefix: "Inherit",
  overrideSummaryPrefix: "Override",
  projectLanguagesFallback: "Project languages",
};

export const createConversationProjectLanguageSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  CreateConversationProjectLanguageSettingsTranslations
> = {
  en: englishTranslations,
  es: {
    ...englishTranslations,
    projectLabel: "Proyecto",
    noProjectLabel: "Sin proyecto",
    projectLanguagesDescription:
      "Elige si esta conversación debe heredar la configuración de idioma del proyecto o sobrescribirla.",
    inheritProjectLanguagesTitle: "Heredar idiomas del proyecto",
    inheritProjectLanguagesDescription:
      "Usa la configuración de idioma y traducción del proyecto seleccionado.",
    inheritedProjectLanguagesDescription:
      "Usa la configuración de idioma del proyecto seleccionado.",
    customLanguagesDescription:
      "Configuración de idioma personalizada para esta conversación.",
    noProjectLanguagesDescription:
      "No hay proyecto seleccionado. Usa configuración de idioma específica para la conversación.",
    usingProjectLanguagesDescription:
      "Usando la configuración de idioma de {projectTitle}.",
    overridingProjectLanguagesDescription:
      "Sobrescribiendo la configuración de idioma de {projectTitle} para esta conversación.",
    inheritSummaryPrefix: "Heredar",
    overrideSummaryPrefix: "Sobrescribir",
    projectLanguagesFallback: "Idiomas del proyecto",
  },
  fr: {
    ...englishTranslations,
    projectLabel: "Projet",
    noProjectLabel: "Aucun projet",
    projectSelectionDescription:
      "Choisissez le projet listé auquel cette conversation appartient, ou n'utilisez aucun projet.",
    projectLanguagesDescription:
      "Choisissez si cette conversation doit hériter des paramètres de langue du projet ou les remplacer.",
    inheritProjectLanguagesTitle: "Hériter les langues du projet",
    inheritProjectLanguagesDescription:
      "Utiliser les paramètres de langue et de traduction du projet sélectionné.",
    inheritedProjectLanguagesDescription:
      "Utiliser les paramètres de langue du projet sélectionné.",
    customLanguagesDescription:
      "Paramètres de langue personnalisés pour cette conversation.",
    noProjectLanguagesDescription:
      "Aucun projet sélectionné. Utilisez des paramètres de langue propres à la conversation.",
    usingProjectLanguagesDescription:
      "Utilise les paramètres de langue de {projectTitle}.",
    overridingProjectLanguagesDescription:
      "Remplace les paramètres de langue de {projectTitle} pour cette conversation.",
    inheritSummaryPrefix: "Hériter",
    overrideSummaryPrefix: "Remplacer",
    projectLanguagesFallback: "Langues du projet",
  },
  "zh-Hant": {
    ...englishTranslations,
    projectLabel: "專案",
    noProjectLabel: "無專案",
    projectLanguagesDescription:
      "選擇此對話要繼承專案語言設定，還是覆寫它們。",
    inheritProjectLanguagesTitle: "繼承專案語言",
    inheritProjectLanguagesDescription:
      "使用所選專案的語言和翻譯設定。",
    inheritedProjectLanguagesDescription: "使用所選專案的語言設定。",
    customLanguagesDescription: "此對話的自訂語言設定。",
    noProjectLanguagesDescription:
      "未選擇專案。使用此對話專用的語言設定。",
    usingProjectLanguagesDescription: "正在使用 {projectTitle} 的語言設定。",
    overridingProjectLanguagesDescription:
      "正在為此對話覆寫 {projectTitle} 的語言設定。",
    inheritSummaryPrefix: "繼承",
    overrideSummaryPrefix: "覆寫",
    projectLanguagesFallback: "專案語言",
  },
  "zh-Hans": {
    ...englishTranslations,
    projectLabel: "项目",
    noProjectLabel: "无项目",
    projectLanguagesDescription:
      "选择此对话应继承项目语言设置，还是覆盖它们。",
    inheritProjectLanguagesTitle: "继承项目语言",
    inheritProjectLanguagesDescription:
      "使用所选项目的语言和翻译设置。",
    inheritedProjectLanguagesDescription: "使用所选项目的语言设置。",
    customLanguagesDescription: "此对话的自定义语言设置。",
    noProjectLanguagesDescription: "未选择项目。使用对话专属语言设置。",
    usingProjectLanguagesDescription: "正在使用 {projectTitle} 的语言设置。",
    overridingProjectLanguagesDescription:
      "正在为此对话覆盖 {projectTitle} 的语言设置。",
    inheritSummaryPrefix: "继承",
    overrideSummaryPrefix: "覆盖",
    projectLanguagesFallback: "项目语言",
  },
  ja: {
    ...englishTranslations,
    projectLabel: "プロジェクト",
    noProjectLabel: "プロジェクトなし",
    projectLanguagesDescription:
      "この会話でプロジェクトの言語設定を継承するか、上書きするかを選択します。",
    inheritProjectLanguagesTitle: "プロジェクトの言語を継承",
    inheritProjectLanguagesDescription:
      "選択したプロジェクトの言語と翻訳設定を使用します。",
    inheritedProjectLanguagesDescription:
      "選択したプロジェクトの言語設定を使用します。",
    customLanguagesDescription: "この会話用のカスタム言語設定です。",
    noProjectLanguagesDescription:
      "プロジェクトが選択されていません。会話固有の言語設定を使用します。",
    usingProjectLanguagesDescription:
      "{projectTitle} の言語設定を使用しています。",
    overridingProjectLanguagesDescription:
      "この会話では {projectTitle} の言語設定を上書きしています。",
    inheritSummaryPrefix: "継承",
    overrideSummaryPrefix: "上書き",
    projectLanguagesFallback: "プロジェクトの言語",
  },
  ar: {
    ...englishTranslations,
    projectLabel: "المشروع",
    noProjectLabel: "بدون مشروع",
    projectLanguagesDescription:
      "اختر ما إذا كان يجب أن ترث هذه المحادثة إعدادات لغة المشروع أو تتجاوزها.",
    inheritProjectLanguagesTitle: "وراثة لغات المشروع",
    inheritProjectLanguagesDescription:
      "استخدم إعدادات اللغة والترجمة للمشروع المحدد.",
    inheritedProjectLanguagesDescription:
      "استخدم إعدادات اللغة للمشروع المحدد.",
    customLanguagesDescription: "إعدادات لغة مخصصة لهذه المحادثة.",
    noProjectLanguagesDescription:
      "لم يتم تحديد مشروع. استخدم إعدادات لغة خاصة بالمحادثة.",
    usingProjectLanguagesDescription: "يتم استخدام إعدادات اللغة لـ {projectTitle}.",
    overridingProjectLanguagesDescription:
      "يتم تجاوز إعدادات اللغة لـ {projectTitle} لهذه المحادثة.",
    inheritSummaryPrefix: "وراثة",
    overrideSummaryPrefix: "تجاوز",
    projectLanguagesFallback: "لغات المشروع",
  },
  fa: {
    ...englishTranslations,
    projectLabel: "پروژه",
    noProjectLabel: "بدون پروژه",
    projectLanguagesDescription:
      "انتخاب کنید این گفتگو تنظیمات زبان پروژه را به ارث ببرد یا آن‌ها را بازنویسی کند.",
    inheritProjectLanguagesTitle: "به‌ارث‌بردن زبان‌های پروژه",
    inheritProjectLanguagesDescription:
      "از تنظیمات زبان و ترجمه پروژه انتخاب‌شده استفاده کنید.",
    inheritedProjectLanguagesDescription:
      "از تنظیمات زبان پروژه انتخاب‌شده استفاده کنید.",
    customLanguagesDescription: "تنظیمات زبان سفارشی برای این گفتگو.",
    noProjectLanguagesDescription:
      "هیچ پروژه‌ای انتخاب نشده است. از تنظیمات زبان ویژه گفتگو استفاده کنید.",
    usingProjectLanguagesDescription:
      "در حال استفاده از تنظیمات زبان {projectTitle}.",
    overridingProjectLanguagesDescription:
      "در حال بازنویسی تنظیمات زبان {projectTitle} برای این گفتگو.",
    inheritSummaryPrefix: "به‌ارث‌بردن",
    overrideSummaryPrefix: "بازنویسی",
    projectLanguagesFallback: "زبان‌های پروژه",
  },
  he: {
    ...englishTranslations,
    projectLabel: "פרויקט",
    noProjectLabel: "ללא פרויקט",
    projectLanguagesDescription:
      "בחרו אם השיחה הזו תירש את הגדרות השפה של הפרויקט או תעקוף אותן.",
    inheritProjectLanguagesTitle: "ירושת שפות הפרויקט",
    inheritProjectLanguagesDescription:
      "השתמשו בהגדרות השפה והתרגום של הפרויקט שנבחר.",
    inheritedProjectLanguagesDescription:
      "השתמשו בהגדרות השפה של הפרויקט שנבחר.",
    customLanguagesDescription: "הגדרות שפה מותאמות לשיחה זו.",
    noProjectLanguagesDescription:
      "לא נבחר פרויקט. השתמשו בהגדרות שפה ייעודיות לשיחה.",
    usingProjectLanguagesDescription:
      "משתמשים בהגדרות השפה של {projectTitle}.",
    overridingProjectLanguagesDescription:
      "עוקפים את הגדרות השפה של {projectTitle} עבור שיחה זו.",
    inheritSummaryPrefix: "ירושה",
    overrideSummaryPrefix: "עקיפה",
    projectLanguagesFallback: "שפות הפרויקט",
  },
  ky: {
    ...englishTranslations,
    projectLabel: "Долбоор",
    noProjectLabel: "Долбоор жок",
    projectLanguagesDescription:
      "Бул талкуу долбоордун тил жөндөөлөрүн мурастайбы же аларды алмаштырабы, тандаңыз.",
    inheritProjectLanguagesTitle: "Долбоор тилдерин мурастоо",
    inheritProjectLanguagesDescription:
      "Тандалган долбоордун тил жана котормо жөндөөлөрүн колдонуңуз.",
    inheritedProjectLanguagesDescription:
      "Тандалган долбоордун тил жөндөөлөрүн колдонуңуз.",
    customLanguagesDescription: "Бул талкуу үчүн жеке тил жөндөөлөрү.",
    noProjectLanguagesDescription:
      "Долбоор тандалган жок. Талкууга тиешелүү тил жөндөөлөрүн колдонуңуз.",
    usingProjectLanguagesDescription:
      "{projectTitle} тил жөндөөлөрү колдонулууда.",
    overridingProjectLanguagesDescription:
      "Бул талкуу үчүн {projectTitle} тил жөндөөлөрү алмаштырылууда.",
    inheritSummaryPrefix: "Мурастоо",
    overrideSummaryPrefix: "Алмаштыруу",
    projectLanguagesFallback: "Долбоор тилдери",
  },
  ru: {
    ...englishTranslations,
    projectLabel: "Проект",
    noProjectLabel: "Без проекта",
    projectLanguagesDescription:
      "Выберите, должно ли это обсуждение наследовать языковые настройки проекта или переопределять их.",
    inheritProjectLanguagesTitle: "Наследовать языки проекта",
    inheritProjectLanguagesDescription:
      "Использовать языковые настройки и настройки перевода выбранного проекта.",
    inheritedProjectLanguagesDescription:
      "Использовать языковые настройки выбранного проекта.",
    customLanguagesDescription:
      "Пользовательские языковые настройки для этого обсуждения.",
    noProjectLanguagesDescription:
      "Проект не выбран. Используйте языковые настройки только для обсуждения.",
    usingProjectLanguagesDescription:
      "Используются языковые настройки {projectTitle}.",
    overridingProjectLanguagesDescription:
      "Языковые настройки {projectTitle} переопределены для этого обсуждения.",
    inheritSummaryPrefix: "Наследовать",
    overrideSummaryPrefix: "Переопределить",
    projectLanguagesFallback: "Языки проекта",
  },
};
