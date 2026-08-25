import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmailUpdatesSettingsPageTranslations {
  pageTitle: string;
}

export const emailUpdatesSettingsPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmailUpdatesSettingsPageTranslations
> = {
  en: { pageTitle: "Email Updates" },
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
