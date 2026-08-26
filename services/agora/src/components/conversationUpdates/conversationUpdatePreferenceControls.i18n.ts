import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatePreferenceControlsTranslations {
  projectDefaultDescription: string;
  receiveEmailUpdatesFor: string;
  receiveEmailUpdatesByDefaultFor: string;
}

export const conversationUpdatePreferenceControlsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdatePreferenceControlsTranslations
> = {
  en: {
    projectDefaultDescription: "Project default",
    receiveEmailUpdatesFor: "Receive Email Updates for {name}",
    receiveEmailUpdatesByDefaultFor: "Email Updates by default for {name}",
  },
  es: {
    projectDefaultDescription: "Valor predeterminado del proyecto",
    receiveEmailUpdatesFor: "Seguir {name} por correo",
    receiveEmailUpdatesByDefaultFor:
      "Novedades por correo por defecto para {name}",
  },
  fr: {
    projectDefaultDescription: "Réglage par défaut du projet",
    receiveEmailUpdatesFor: "Suivre {name} par e-mail",
    receiveEmailUpdatesByDefaultFor:
      "Nouvelles par e-mail par défaut pour {name}",
  },
  "zh-Hant": {
    projectDefaultDescription: "專案預設值",
    receiveEmailUpdatesFor: "接收 {name} 的電子郵件更新",
    receiveEmailUpdatesByDefaultFor: "{name} 的預設電子郵件更新",
  },
  "zh-Hans": {
    projectDefaultDescription: "项目默认值",
    receiveEmailUpdatesFor: "接收 {name} 的电子邮件更新",
    receiveEmailUpdatesByDefaultFor: "{name} 的默认电子邮件更新",
  },
  ja: {
    projectDefaultDescription: "プロジェクトの既定値",
    receiveEmailUpdatesFor: "{name} のメール更新を受信",
    receiveEmailUpdatesByDefaultFor: "{name} のメール更新の既定値",
  },
  ar: {
    projectDefaultDescription: "الإعداد الافتراضي للمشروع",
    receiveEmailUpdatesFor: "تلقي تحديثات البريد الإلكتروني من {name}",
    receiveEmailUpdatesByDefaultFor:
      "تحديثات البريد الإلكتروني افتراضيًا لـ {name}",
  },
  fa: {
    projectDefaultDescription: "پیش‌فرض پروژه",
    receiveEmailUpdatesFor: "دریافت به‌روزرسانی ایمیلی برای {name}",
    receiveEmailUpdatesByDefaultFor: "به‌روزرسانی ایمیلی پیش‌فرض {name}",
  },
  he: {
    projectDefaultDescription: "ברירת המחדל של הפרויקט",
    receiveEmailUpdatesFor: "קבלת עדכונים בדוא״ל עבור {name}",
    receiveEmailUpdatesByDefaultFor: "עדכונים בדוא״ל כברירת מחדל עבור {name}",
  },
  ky: {
    projectDefaultDescription: "Долбоордун демейки жөндөөсү",
    receiveEmailUpdatesFor: "{name} үчүн электрондук почта жаңыртууларын алуу",
    receiveEmailUpdatesByDefaultFor:
      "{name} үчүн демейки электрондук жаңыртуулар",
  },
  ru: {
    projectDefaultDescription: "Настройка проекта по умолчанию",
    receiveEmailUpdatesFor:
      "Получать обновления по электронной почте для {name}",
    receiveEmailUpdatesByDefaultFor:
      "Почтовые обновления по умолчанию для проекта «{name}»",
  },
};
