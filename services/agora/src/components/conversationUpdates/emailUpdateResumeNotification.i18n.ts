import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmailUpdateResumeNotificationTranslations {
  preferenceSavedAndGlobalResumed: string;
}

export const emailUpdateResumeNotificationTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmailUpdateResumeNotificationTranslations
> = {
  en: {
    preferenceSavedAndGlobalResumed:
      "Email Updates were turned back on globally, and your preference was saved.",
  },
  ar: {
    preferenceSavedAndGlobalResumed:
      "أُعيد تفعيل تحديثات البريد الإلكتروني بشكل عام وحُفظ تفضيلك.",
  },
  es: {
    preferenceSavedAndGlobalResumed:
      "Las novedades por correo se volvieron a activar globalmente y se guardó su preferencia.",
  },
  fa: {
    preferenceSavedAndGlobalResumed:
      "به‌روزرسانی‌های ایمیلی دوباره به‌صورت کلی فعال شدند و ترجیح شما ذخیره شد.",
  },
  fr: {
    preferenceSavedAndGlobalResumed:
      "Les nouvelles par e-mail ont été réactivées globalement et votre préférence a été enregistrée.",
  },
  "zh-Hans": {
    preferenceSavedAndGlobalResumed:
      "电子邮件更新已在全局重新开启，并且您的偏好设置已保存。",
  },
  "zh-Hant": {
    preferenceSavedAndGlobalResumed:
      "電子郵件更新已在全域重新開啟，且您的偏好設定已儲存。",
  },
  he: {
    preferenceSavedAndGlobalResumed:
      "עדכוני הדוא״ל הופעלו מחדש באופן גלובלי וההעדפה שלך נשמרה.",
  },
  ja: {
    preferenceSavedAndGlobalResumed:
      "メール更新を全体で再びオンにし、設定を保存しました。",
  },
  ky: {
    preferenceSavedAndGlobalResumed:
      "Электрондук почта жаңыртуулары жалпы түрдө кайра күйгүзүлүп, тандооңуз сакталды.",
  },
  ru: {
    preferenceSavedAndGlobalResumed:
      "Обновления по электронной почте снова включены глобально, а настройка сохранена.",
  },
};
