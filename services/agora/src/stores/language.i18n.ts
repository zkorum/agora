import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LanguageStoreTranslations {
  failedToFetchLanguagePreferences: string;
  failedToUpdateSpokenLanguages: string;
  failedToChangeDisplayLanguage: string;
}

export const languageStoreTranslations: Record<
  SupportedDisplayLanguageCodes,
  LanguageStoreTranslations
> = {
  en: {
    failedToFetchLanguagePreferences:
      "Failed to fetch language preferences from backend",
    failedToUpdateSpokenLanguages: "Failed to update spoken languages",
    failedToChangeDisplayLanguage: "Failed to change display language",
  },
  es: {
    failedToFetchLanguagePreferences:
      "No se pudieron obtener las preferencias de idioma del servidor",
    failedToUpdateSpokenLanguages:
      "No se pudieron actualizar los idiomas hablados",
    failedToChangeDisplayLanguage:
      "No se pudo cambiar el idioma de visualización",
  },
  fr: {
    failedToFetchLanguagePreferences:
      "Échec de la récupération des préférences linguistiques depuis le serveur",
    failedToUpdateSpokenLanguages:
      "Échec de la mise à jour des langues parlées",
    failedToChangeDisplayLanguage: "Échec du changement de langue d’affichage",
  },
  "zh-Hant": {
    failedToFetchLanguagePreferences: "無法從伺服器取得語言偏好設定",
    failedToUpdateSpokenLanguages: "無法更新口語語言",
    failedToChangeDisplayLanguage: "無法變更顯示語言",
  },
  "zh-Hans": {
    failedToFetchLanguagePreferences: "无法从服务器获取语言偏好设置",
    failedToUpdateSpokenLanguages: "无法更新口语语言",
    failedToChangeDisplayLanguage: "无法更改显示语言",
  },
  ja: {
    failedToFetchLanguagePreferences:
      "サーバーから言語設定を取得できませんでした",
    failedToUpdateSpokenLanguages: "使用言語を更新できませんでした",
    failedToChangeDisplayLanguage: "表示言語を変更できませんでした",
  },
  ar: {
    failedToFetchLanguagePreferences: "فشل جلب تفضيلات اللغة من الخادم",
    failedToUpdateSpokenLanguages: "فشل تحديث اللغات المنطوقة",
    failedToChangeDisplayLanguage: "فشل تغيير لغة العرض",
  },
  fa: {
    failedToFetchLanguagePreferences: "دریافت تنظیمات زبان از سرور ناموفق بود",
    failedToUpdateSpokenLanguages: "به‌روزرسانی زبان‌های گفتاری ناموفق بود",
    failedToChangeDisplayLanguage: "تغییر زبان نمایش ناموفق بود",
  },
  he: {
    failedToFetchLanguagePreferences: "טעינת העדפות השפה מהשרת נכשלה",
    failedToUpdateSpokenLanguages: "עדכון השפות המדוברות נכשל",
    failedToChangeDisplayLanguage: "שינוי שפת התצוגה נכשל",
  },
  ky: {
    failedToFetchLanguagePreferences:
      "Серверден тил жөндөөлөрүн алуу ишке ашкан жок",
    failedToUpdateSpokenLanguages: "Сүйлөө тилдерин жаңыртуу ишке ашкан жок",
    failedToChangeDisplayLanguage: "Көрсөтүү тилин өзгөртүү ишке ашкан жок",
  },
  ru: {
    failedToFetchLanguagePreferences:
      "Не удалось получить языковые настройки с сервера",
    failedToUpdateSpokenLanguages: "Не удалось обновить разговорные языки",
    failedToChangeDisplayLanguage: "Не удалось изменить язык интерфейса",
  },
};
