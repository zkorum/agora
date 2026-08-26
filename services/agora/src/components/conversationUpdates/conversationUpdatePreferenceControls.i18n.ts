import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatePreferenceControlsTranslations {
  projectDefaultDescription: string;
  inheritedFromProject: string;
  loadingConversations: string;
  receiveEmailUpdatesFor: string;
  receiveEmailUpdatesByDefaultFor: string;
}

export const conversationUpdatePreferenceControlsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdatePreferenceControlsTranslations
> = {
  en: {
    projectDefaultDescription: "Project default",
    inheritedFromProject: "Inherited from project",
    loadingConversations: "Loading more conversations",
    receiveEmailUpdatesFor: "Receive Email Updates for {name}",
    receiveEmailUpdatesByDefaultFor: "Email Updates by default for {name}",
  },
  es: {
    projectDefaultDescription: "Valor predeterminado del proyecto",
    inheritedFromProject: "Heredado del proyecto",
    loadingConversations: "Cargando más conversaciones",
    receiveEmailUpdatesFor: "Seguir {name} por correo",
    receiveEmailUpdatesByDefaultFor:
      "Novedades por correo por defecto para {name}",
  },
  fr: {
    projectDefaultDescription: "Réglage par défaut du projet",
    inheritedFromProject: "Hérité du projet",
    loadingConversations: "Chargement de conversations supplémentaires",
    receiveEmailUpdatesFor: "Suivre {name} par e-mail",
    receiveEmailUpdatesByDefaultFor:
      "Nouvelles par e-mail par défaut pour {name}",
  },
  "zh-Hant": {
    projectDefaultDescription: "專案預設值",
    inheritedFromProject: "繼承自專案",
    loadingConversations: "正在載入更多對話",
    receiveEmailUpdatesFor: "接收 {name} 的電子郵件更新",
    receiveEmailUpdatesByDefaultFor: "{name} 的預設電子郵件更新",
  },
  "zh-Hans": {
    projectDefaultDescription: "项目默认值",
    inheritedFromProject: "继承自项目",
    loadingConversations: "正在加载更多对话",
    receiveEmailUpdatesFor: "接收 {name} 的电子邮件更新",
    receiveEmailUpdatesByDefaultFor: "{name} 的默认电子邮件更新",
  },
  ja: {
    projectDefaultDescription: "プロジェクトの既定値",
    inheritedFromProject: "プロジェクトから継承",
    loadingConversations: "さらに会話を読み込んでいます",
    receiveEmailUpdatesFor: "{name} のメール更新を受信",
    receiveEmailUpdatesByDefaultFor: "{name} のメール更新の既定値",
  },
  ar: {
    projectDefaultDescription: "الإعداد الافتراضي للمشروع",
    inheritedFromProject: "موروث من المشروع",
    loadingConversations: "جارٍ تحميل المزيد من المحادثات",
    receiveEmailUpdatesFor: "تلقي تحديثات البريد الإلكتروني من {name}",
    receiveEmailUpdatesByDefaultFor:
      "تحديثات البريد الإلكتروني افتراضيًا لـ {name}",
  },
  fa: {
    projectDefaultDescription: "پیش‌فرض پروژه",
    inheritedFromProject: "به‌ارث‌رسیده از پروژه",
    loadingConversations: "در حال بارگیری گفتگوهای بیشتر",
    receiveEmailUpdatesFor: "دریافت به‌روزرسانی ایمیلی برای {name}",
    receiveEmailUpdatesByDefaultFor: "به‌روزرسانی ایمیلی پیش‌فرض {name}",
  },
  he: {
    projectDefaultDescription: "ברירת המחדל של הפרויקט",
    inheritedFromProject: "עבר בירושה מהפרויקט",
    loadingConversations: "טעינת שיחות נוספות",
    receiveEmailUpdatesFor: "קבלת עדכונים בדוא״ל עבור {name}",
    receiveEmailUpdatesByDefaultFor: "עדכונים בדוא״ל כברירת מחדל עבור {name}",
  },
  ky: {
    projectDefaultDescription: "Долбоордун демейки жөндөөсү",
    inheritedFromProject: "Долбоордон мурасталган",
    loadingConversations: "Дагы маектер жүктөлүүдө",
    receiveEmailUpdatesFor: "{name} үчүн электрондук почта жаңыртууларын алуу",
    receiveEmailUpdatesByDefaultFor:
      "{name} үчүн демейки электрондук жаңыртуулар",
  },
  ru: {
    projectDefaultDescription: "Настройка проекта по умолчанию",
    inheritedFromProject: "Унаследовано от проекта",
    loadingConversations: "Загрузка дополнительных обсуждений",
    receiveEmailUpdatesFor:
      "Получать обновления по электронной почте для {name}",
    receiveEmailUpdatesByDefaultFor:
      "Почтовые обновления по умолчанию для проекта «{name}»",
  },
};
