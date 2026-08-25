import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatePreferenceControlsTranslations {
  receiveEmailUpdatesFor: string;
}

export const conversationUpdatePreferenceControlsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdatePreferenceControlsTranslations
> = {
  en: { receiveEmailUpdatesFor: "Receive Email Updates for {name}" },
  es: { receiveEmailUpdatesFor: "Seguir {name} por correo" },
  fr: { receiveEmailUpdatesFor: "Suivre {name} par e-mail" },
  "zh-Hant": { receiveEmailUpdatesFor: "接收 {name} 的電子郵件更新" },
  "zh-Hans": { receiveEmailUpdatesFor: "接收 {name} 的电子邮件更新" },
  ja: { receiveEmailUpdatesFor: "{name} のメール更新を受信" },
  ar: { receiveEmailUpdatesFor: "تلقي تحديثات البريد الإلكتروني من {name}" },
  fa: { receiveEmailUpdatesFor: "دریافت به‌روزرسانی ایمیلی برای {name}" },
  he: { receiveEmailUpdatesFor: "קבלת עדכונים בדוא״ל עבור {name}" },
  ky: {
    receiveEmailUpdatesFor: "{name} үчүн электрондук почта жаңыртууларын алуу",
  },
  ru: {
    receiveEmailUpdatesFor:
      "Получать обновления по электронной почте для {name}",
  },
};
