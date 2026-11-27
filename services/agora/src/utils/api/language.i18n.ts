import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LanguageApiTranslations {
  failedToSaveLanguagePreferences: string;
}

export const languageApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  LanguageApiTranslations
> = {
  en: { failedToSaveLanguagePreferences: "Failed to save language preferences" },
  de: {
    failedToSaveLanguagePreferences:
      "Fehler beim Speichern der Spracheinstellungen",
  },
  hi: { failedToSaveLanguagePreferences: "भाषा प्राथमिकताएँ सहेजने में विफल" },
  es: { failedToSaveLanguagePreferences: "No se pudieron guardar las preferencias de idioma" },
  fr: { failedToSaveLanguagePreferences: "Échec de l’enregistrement des préférences linguistiques" },
  "zh-Hant": { failedToSaveLanguagePreferences: "無法儲存語言偏好設定" },
  "zh-Hans": { failedToSaveLanguagePreferences: "无法保存语言偏好设置" },
  ja: { failedToSaveLanguagePreferences: "言語設定を保存できませんでした" },
  ar: { failedToSaveLanguagePreferences: "فشل حفظ تفضيلات اللغة" },
  fa: { failedToSaveLanguagePreferences: "ذخیره تنظیمات زبان ناموفق بود" },
  he: { failedToSaveLanguagePreferences: "שמירת העדפות השפה נכשלה" },
  ky: { failedToSaveLanguagePreferences: "Тил жөндөөлөрүн сактоо ишке ашкан жок" },
  ru: { failedToSaveLanguagePreferences: "Не удалось сохранить языковые настройки" },
};
