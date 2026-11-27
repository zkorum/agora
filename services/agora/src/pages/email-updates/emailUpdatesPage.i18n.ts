import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmailUpdatesPageTranslations {
  pageTitle: string;
}

export const emailUpdatesPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmailUpdatesPageTranslations
> = {
  en: { pageTitle: "Email Updates" },
  de: { pageTitle: "E-Mail-Benachrichtigungen" },
  hi: { pageTitle: "ईमेल अपडेट" },
  ar: { pageTitle: "تحديثات البريد الإلكتروني" },
  es: { pageTitle: "Novedades por correo" },
  fa: { pageTitle: "به‌روزرسانی‌های ایمیلی" },
  fr: { pageTitle: "Nouvelles par e-mail" },
  "zh-Hans": { pageTitle: "电子邮件更新" },
  "zh-Hant": { pageTitle: "電子郵件更新" },
  he: { pageTitle: "עדכונים בדוא״ל" },
  ja: { pageTitle: "メール更新" },
  ky: { pageTitle: "Электрондук почта жаңыртуулары" },
  ru: { pageTitle: "Обновления по электронной почте" },
};
