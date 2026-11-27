import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationProjectSettingsTranslations {
  projectLabel: string;
  noProjectLabel: string;
  projectSelectionDescription: string;
  projectLanguagesDescription: string;
  inheritProjectLanguagesTitle: string;
  inheritProjectLanguagesDescription: string;
  inheritedProjectLanguagesDescription: string;
  customLanguagesDescription: string;
  inheritSummary: string;
  overrideSummary: string;
}

const englishTranslations: ConversationProjectSettingsTranslations = {
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
  customLanguagesDescription: "Custom language settings for this conversation.",
  inheritSummary: "Inherit: {languages}",
  overrideSummary: "Override: {languages}",
};

export const conversationProjectSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationProjectSettingsTranslations
> = {
  en: englishTranslations,
  de: {
    projectLabel: "Projekt",
    noProjectLabel: "Kein Projekt",
    projectSelectionDescription:
      "Wählen Sie das Projekt aus der Liste, zu dem diese Diskussion gehört, oder wählen Sie kein Projekt.",
    projectLanguagesDescription:
      "Wählen Sie, ob diese Diskussion die Projekteinstellungen für die Sprache erben oder diese überschreiben soll.",
    inheritProjectLanguagesTitle: "Sprachen des Projekts übernehmen",
    inheritProjectLanguagesDescription:
      "Verwenden Sie die Sprache und die Übersetzungseinstellungen des ausgewählten Projekts.",
    inheritedProjectLanguagesDescription:
      "Verwenden Sie die Spracheinstellungen des ausgewählten Projekts.",
    customLanguagesDescription:
      "Benutzerdefinierte Spracheinstellungen für diese Diskussion.",
    inheritSummary: "Übernehmen: {languages}",
    overrideSummary: "Überschreiben: {languages}",
  },
  hi: {
    projectLabel: "परियोजना",
    noProjectLabel: "कोई परियोजना नहीं",
    projectSelectionDescription:
      "इस चर्चा से संबंधित सूचीबद्ध परियोजना चुनें, या कोई परियोजना न चुनें।",
    projectLanguagesDescription:
      "चुनें कि क्या इस चर्चा को परियोजना भाषा सेटिंग्स विरासत में लेनी चाहिए या उन्हें ओवरराइड करना चाहिए।",
    inheritProjectLanguagesTitle: "परियोजना की भाषाएँ विरासत में लें",
    inheritProjectLanguagesDescription:
      "चयनित परियोजना की भाषा और अनुवाद सेटिंग्स का उपयोग करें।",
    inheritedProjectLanguagesDescription:
      "चयनित परियोजना की भाषा सेटिंग्स का उपयोग करें।",
    customLanguagesDescription: "इस चर्चा के लिए कस्टम भाषा सेटिंग्स।",
    inheritSummary: "विरासत में लें: {languages}",
    overrideSummary: "ओवरराइड करें: {languages}",
  },
  es: {
    projectLabel: "Proyecto",
    noProjectLabel: "Sin proyecto",
    projectSelectionDescription:
      "Elija el proyecto de la lista al que pertenece esta conversación o no seleccione ningún proyecto.",
    projectLanguagesDescription:
      "Elija si esta conversación debe heredar la configuración de idioma del proyecto o sobrescribirla.",
    inheritProjectLanguagesTitle: "Heredar idiomas del proyecto",
    inheritProjectLanguagesDescription:
      "Use la configuración de idioma y traducción del proyecto seleccionado.",
    inheritedProjectLanguagesDescription:
      "Use la configuración de idioma del proyecto seleccionado.",
    customLanguagesDescription:
      "Configuración de idioma personalizada para esta conversación.",
    inheritSummary: "Heredar: {languages}",
    overrideSummary: "Sobrescribir: {languages}",
  },
  fr: {
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
    inheritSummary: "Hériter : {languages}",
    overrideSummary: "Remplacer : {languages}",
  },
  "zh-Hant": {
    projectLabel: "專案",
    noProjectLabel: "無專案",
    projectSelectionDescription: "選擇此對話所屬的已列出專案，或不選擇專案。",
    projectLanguagesDescription: "選擇此對話要繼承專案語言設定，還是覆寫它們。",
    inheritProjectLanguagesTitle: "繼承專案語言",
    inheritProjectLanguagesDescription: "使用所選專案的語言和翻譯設定。",
    inheritedProjectLanguagesDescription: "使用所選專案的語言設定。",
    customLanguagesDescription: "此對話的自訂語言設定。",
    inheritSummary: "繼承：{languages}",
    overrideSummary: "覆寫：{languages}",
  },
  "zh-Hans": {
    projectLabel: "项目",
    noProjectLabel: "无项目",
    projectSelectionDescription: "选择此对话所属的已列出项目，或不选择项目。",
    projectLanguagesDescription: "选择此对话应继承项目语言设置，还是覆盖它们。",
    inheritProjectLanguagesTitle: "继承项目语言",
    inheritProjectLanguagesDescription: "使用所选项目的语言和翻译设置。",
    inheritedProjectLanguagesDescription: "使用所选项目的语言设置。",
    customLanguagesDescription: "此对话的自定义语言设置。",
    inheritSummary: "继承：{languages}",
    overrideSummary: "覆盖：{languages}",
  },
  ja: {
    projectLabel: "プロジェクト",
    noProjectLabel: "プロジェクトなし",
    projectSelectionDescription:
      "この会話が属する一覧内のプロジェクトを選択するか、プロジェクトなしを選択します。",
    projectLanguagesDescription:
      "この会話でプロジェクトの言語設定を継承するか、上書きするかを選択します。",
    inheritProjectLanguagesTitle: "プロジェクトの言語を継承",
    inheritProjectLanguagesDescription:
      "選択したプロジェクトの言語と翻訳設定を使用します。",
    inheritedProjectLanguagesDescription:
      "選択したプロジェクトの言語設定を使用します。",
    customLanguagesDescription: "この会話用のカスタム言語設定です。",
    inheritSummary: "継承：{languages}",
    overrideSummary: "上書き：{languages}",
  },
  ar: {
    projectLabel: "المشروع",
    noProjectLabel: "بدون مشروع",
    projectSelectionDescription:
      "اختر المشروع المدرج الذي تنتمي إليه هذه المحادثة، أو لا تختر أي مشروع.",
    projectLanguagesDescription:
      "اختر ما إذا كان يجب أن ترث هذه المحادثة إعدادات لغة المشروع أو تتجاوزها.",
    inheritProjectLanguagesTitle: "وراثة لغات المشروع",
    inheritProjectLanguagesDescription:
      "استخدم إعدادات اللغة والترجمة للمشروع المحدد.",
    inheritedProjectLanguagesDescription:
      "استخدم إعدادات اللغة للمشروع المحدد.",
    customLanguagesDescription: "إعدادات لغة مخصصة لهذه المحادثة.",
    inheritSummary: "وراثة: {languages}",
    overrideSummary: "تجاوز: {languages}",
  },
  fa: {
    projectLabel: "پروژه",
    noProjectLabel: "بدون پروژه",
    projectSelectionDescription:
      "پروژه فهرست‌شده‌ای را که این گفتگو به آن تعلق دارد انتخاب کنید، یا هیچ پروژه‌ای انتخاب نکنید.",
    projectLanguagesDescription:
      "انتخاب کنید این گفتگو تنظیمات زبان پروژه را به ارث ببرد یا آن‌ها را بازنویسی کند.",
    inheritProjectLanguagesTitle: "به‌ارث‌بردن زبان‌های پروژه",
    inheritProjectLanguagesDescription:
      "از تنظیمات زبان و ترجمه پروژه انتخاب‌شده استفاده کنید.",
    inheritedProjectLanguagesDescription:
      "از تنظیمات زبان پروژه انتخاب‌شده استفاده کنید.",
    customLanguagesDescription: "تنظیمات زبان سفارشی برای این گفتگو.",
    inheritSummary: "به‌ارث‌بردن: {languages}",
    overrideSummary: "بازنویسی: {languages}",
  },
  he: {
    projectLabel: "פרויקט",
    noProjectLabel: "ללא פרויקט",
    projectSelectionDescription:
      "בחרו את הפרויקט מהרשימה שאליו שייכת השיחה הזו, או אל תבחרו פרויקט.",
    projectLanguagesDescription:
      "בחרו אם השיחה הזו תירש את הגדרות השפה של הפרויקט או תעקוף אותן.",
    inheritProjectLanguagesTitle: "ירושת שפות הפרויקט",
    inheritProjectLanguagesDescription:
      "השתמשו בהגדרות השפה והתרגום של הפרויקט שנבחר.",
    inheritedProjectLanguagesDescription:
      "השתמשו בהגדרות השפה של הפרויקט שנבחר.",
    customLanguagesDescription: "הגדרות שפה מותאמות לשיחה זו.",
    inheritSummary: "ירושה: {languages}",
    overrideSummary: "עקיפה: {languages}",
  },
  ky: {
    projectLabel: "Долбоор",
    noProjectLabel: "Долбоор жок",
    projectSelectionDescription:
      "Бул талкуу тизмедеги кайсы долбоорго таандык экенин тандаңыз же долбоорсуз калтырыңыз.",
    projectLanguagesDescription:
      "Бул талкуу долбоордун тил жөндөөлөрүн мурастайбы же аларды алмаштырабы, тандаңыз.",
    inheritProjectLanguagesTitle: "Долбоор тилдерин мурастоо",
    inheritProjectLanguagesDescription:
      "Тандалган долбоордун тил жана котормо жөндөөлөрүн колдонуңуз.",
    inheritedProjectLanguagesDescription:
      "Тандалган долбоордун тил жөндөөлөрүн колдонуңуз.",
    customLanguagesDescription: "Бул талкуу үчүн жеке тил жөндөөлөрү.",
    inheritSummary: "Мурастоо: {languages}",
    overrideSummary: "Алмаштыруу: {languages}",
  },
  ru: {
    projectLabel: "Проект",
    noProjectLabel: "Без проекта",
    projectSelectionDescription:
      "Выберите проект из списка, к которому относится это обсуждение, либо не указывайте проект.",
    projectLanguagesDescription:
      "Выберите, должно ли это обсуждение наследовать языковые настройки проекта или переопределять их.",
    inheritProjectLanguagesTitle: "Наследовать языки проекта",
    inheritProjectLanguagesDescription:
      "Использовать языковые настройки и настройки перевода выбранного проекта.",
    inheritedProjectLanguagesDescription:
      "Использовать языковые настройки выбранного проекта.",
    customLanguagesDescription:
      "Пользовательские языковые настройки для этого обсуждения.",
    inheritSummary: "Наследовать: {languages}",
    overrideSummary: "Переопределить: {languages}",
  },
};
