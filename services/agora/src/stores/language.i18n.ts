import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LanguageStoreTranslations {
  failedToFetchLanguagePreferences: string;
  failedToSaveLanguagePreferences: string;
  failedToSaveDisplayLanguagePreference: string;
  failedToUpdateSpokenLanguages: string;
  failedToChangeDisplayLanguage: string;
  failedToClearLanguagePreferences: string;
}

export const languageStoreTranslations: Record<
  SupportedDisplayLanguageCodes,
  LanguageStoreTranslations
> = {
  en: { failedToFetchLanguagePreferences: "Failed to fetch language preferences from backend", failedToSaveLanguagePreferences: "Failed to save language preferences", failedToSaveDisplayLanguagePreference: "Failed to save display language preference", failedToUpdateSpokenLanguages: "Failed to update spoken languages", failedToChangeDisplayLanguage: "Failed to change display language", failedToClearLanguagePreferences: "Failed to clear language preferences" },
  es: { failedToFetchLanguagePreferences: "No se pudieron obtener las preferencias de idioma del servidor", failedToSaveLanguagePreferences: "No se pudieron guardar las preferencias de idioma", failedToSaveDisplayLanguagePreference: "No se pudo guardar la preferencia de idioma de visualización", failedToUpdateSpokenLanguages: "No se pudieron actualizar los idiomas hablados", failedToChangeDisplayLanguage: "No se pudo cambiar el idioma de visualización", failedToClearLanguagePreferences: "No se pudieron borrar las preferencias de idioma" },
  fr: { failedToFetchLanguagePreferences: "Échec de la récupération des préférences linguistiques depuis le serveur", failedToSaveLanguagePreferences: "Échec de l’enregistrement des préférences linguistiques", failedToSaveDisplayLanguagePreference: "Échec de l’enregistrement de la préférence de langue d’affichage", failedToUpdateSpokenLanguages: "Échec de la mise à jour des langues parlées", failedToChangeDisplayLanguage: "Échec du changement de langue d’affichage", failedToClearLanguagePreferences: "Échec de l’effacement des préférences linguistiques" },
  "zh-Hant": { failedToFetchLanguagePreferences: "無法從伺服器取得語言偏好設定", failedToSaveLanguagePreferences: "無法儲存語言偏好設定", failedToSaveDisplayLanguagePreference: "無法儲存顯示語言偏好設定", failedToUpdateSpokenLanguages: "無法更新口語語言", failedToChangeDisplayLanguage: "無法變更顯示語言", failedToClearLanguagePreferences: "無法清除語言偏好設定" },
  "zh-Hans": { failedToFetchLanguagePreferences: "无法从服务器获取语言偏好设置", failedToSaveLanguagePreferences: "无法保存语言偏好设置", failedToSaveDisplayLanguagePreference: "无法保存显示语言偏好设置", failedToUpdateSpokenLanguages: "无法更新口语语言", failedToChangeDisplayLanguage: "无法更改显示语言", failedToClearLanguagePreferences: "无法清除语言偏好设置" },
  ja: { failedToFetchLanguagePreferences: "サーバーから言語設定を取得できませんでした", failedToSaveLanguagePreferences: "言語設定を保存できませんでした", failedToSaveDisplayLanguagePreference: "表示言語設定を保存できませんでした", failedToUpdateSpokenLanguages: "使用言語を更新できませんでした", failedToChangeDisplayLanguage: "表示言語を変更できませんでした", failedToClearLanguagePreferences: "言語設定をクリアできませんでした" },
  ar: { failedToFetchLanguagePreferences: "فشل جلب تفضيلات اللغة من الخادم", failedToSaveLanguagePreferences: "فشل حفظ تفضيلات اللغة", failedToSaveDisplayLanguagePreference: "فشل حفظ تفضيل لغة العرض", failedToUpdateSpokenLanguages: "فشل تحديث اللغات المنطوقة", failedToChangeDisplayLanguage: "فشل تغيير لغة العرض", failedToClearLanguagePreferences: "فشل مسح تفضيلات اللغة" },
  fa: { failedToFetchLanguagePreferences: "دریافت تنظیمات زبان از سرور ناموفق بود", failedToSaveLanguagePreferences: "ذخیره تنظیمات زبان ناموفق بود", failedToSaveDisplayLanguagePreference: "ذخیره تنظیمات زبان نمایش ناموفق بود", failedToUpdateSpokenLanguages: "به‌روزرسانی زبان‌های گفتاری ناموفق بود", failedToChangeDisplayLanguage: "تغییر زبان نمایش ناموفق بود", failedToClearLanguagePreferences: "پاک کردن تنظیمات زبان ناموفق بود" },
  he: { failedToFetchLanguagePreferences: "טעינת העדפות השפה מהשרת נכשלה", failedToSaveLanguagePreferences: "שמירת העדפות השפה נכשלה", failedToSaveDisplayLanguagePreference: "שמירת העדפת שפת התצוגה נכשלה", failedToUpdateSpokenLanguages: "עדכון השפות המדוברות נכשל", failedToChangeDisplayLanguage: "שינוי שפת התצוגה נכשל", failedToClearLanguagePreferences: "ניקוי העדפות השפה נכשל" },
  ky: { failedToFetchLanguagePreferences: "Серверден тил жөндөөлөрүн алуу ишке ашкан жок", failedToSaveLanguagePreferences: "Тил жөндөөлөрүн сактоо ишке ашкан жок", failedToSaveDisplayLanguagePreference: "Көрсөтүү тилинин жөндөөсүн сактоо ишке ашкан жок", failedToUpdateSpokenLanguages: "Сүйлөө тилдерин жаңыртуу ишке ашкан жок", failedToChangeDisplayLanguage: "Көрсөтүү тилин өзгөртүү ишке ашкан жок", failedToClearLanguagePreferences: "Тил жөндөөлөрүн тазалоо ишке ашкан жок" },
  ru: { failedToFetchLanguagePreferences: "Не удалось получить языковые настройки с сервера", failedToSaveLanguagePreferences: "Не удалось сохранить языковые настройки", failedToSaveDisplayLanguagePreference: "Не удалось сохранить язык интерфейса", failedToUpdateSpokenLanguages: "Не удалось обновить разговорные языки", failedToChangeDisplayLanguage: "Не удалось изменить язык интерфейса", failedToClearLanguagePreferences: "Не удалось очистить языковые настройки" },
};
