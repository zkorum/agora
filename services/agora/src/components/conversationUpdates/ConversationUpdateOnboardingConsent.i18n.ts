import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateOnboardingConsentTranslations {
  projectLabel: string;
  conversationLabel: string;
  description: string;
}

export const conversationUpdateOnboardingConsentTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateOnboardingConsentTranslations
> = {
  en: {
    projectLabel: "Email me occasional updates about this project",
    conversationLabel: "Email me occasional updates about this conversation",
    description: "You can change this anytime in email settings.",
  },
  ar: {
    projectLabel:
      "أرسل إليّ تحديثات عرضية عن هذا المشروع عبر البريد الإلكتروني",
    conversationLabel:
      "أرسل إليّ تحديثات عرضية عن هذه المحادثة عبر البريد الإلكتروني",
    description: "يمكنك تغيير ذلك في أي وقت من إعدادات البريد الإلكتروني.",
  },
  es: {
    projectLabel:
      "Enviarme por correo actualizaciones ocasionales sobre este proyecto",
    conversationLabel:
      "Enviarme por correo actualizaciones ocasionales sobre esta conversación",
    description:
      "Puede cambiar esta opción cuando quiera en los ajustes de correo.",
  },
  fa: {
    projectLabel: "گاهی به‌روزرسانی‌های این پروژه را برایم ایمیل کن",
    conversationLabel: "گاهی به‌روزرسانی‌های این گفت‌وگو را برایم ایمیل کن",
    description:
      "هر زمان بخواهید می‌توانید این گزینه را در تنظیمات ایمیل تغییر دهید.",
  },
  fr: {
    projectLabel:
      "M’envoyer occasionnellement des actualités sur ce projet par e-mail",
    conversationLabel:
      "M’envoyer occasionnellement des actualités sur cette conversation par e-mail",
    description:
      "Vous pouvez modifier ce choix à tout moment dans les paramètres d’e-mail.",
  },
  "zh-Hans": {
    projectLabel: "偶尔向我发送有关此项目的邮件动态",
    conversationLabel: "偶尔向我发送有关此对话的邮件动态",
    description: "您可以随时在邮件设置中更改此选项。",
  },
  "zh-Hant": {
    projectLabel: "偶爾向我傳送有關此專案的郵件動態",
    conversationLabel: "偶爾向我傳送有關此對話的郵件動態",
    description: "您可以隨時在郵件設定中變更此選項。",
  },
  he: {
    projectLabel: "שליחת עדכונים מזדמנים על הפרויקט הזה בדוא״ל",
    conversationLabel: "שליחת עדכונים מזדמנים על השיחה הזו בדוא״ל",
    description: "אפשר לשנות זאת בכל עת בהגדרות הדוא״ל.",
  },
  ja: {
    projectLabel: "このプロジェクトの更新をときどきメールで受け取る",
    conversationLabel: "この会話の更新をときどきメールで受け取る",
    description: "メール設定からいつでも変更できます。",
  },
  ky: {
    projectLabel:
      "Бул долбоор тууралуу жаңыртууларды маал-маалы менен катка жөнөтүү",
    conversationLabel:
      "Бул талкуу тууралуу жаңыртууларды маал-маалы менен катка жөнөтүү",
    description: "Муну кат жөндөөлөрүнөн каалаган убакта өзгөртө аласыз.",
  },
  ru: {
    projectLabel: "Иногда присылать мне обновления этого проекта",
    conversationLabel: "Иногда присылать мне обновления этого обсуждения",
    description: "Это можно изменить в любой момент в настройках почты.",
  },
};
