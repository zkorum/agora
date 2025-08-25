export interface ContentPreferenceTranslations {
  contentPreference: string;
  [key: string]: string;
}

export const contentPreferenceTranslations: Record<
  string,
  ContentPreferenceTranslations
> = {
  en: {
    contentPreference: "Content Preference",
  },
  es: {
    contentPreference: "Preferencia de Contenido",
  },
  fr: {
    contentPreference: "Préférence de Contenu",
  },
  "zh-CN": {
    contentPreference: "内容偏好",
  },
  "zh-TW": {
    contentPreference: "內容偏好",
  },
  ja: {
    contentPreference: "コンテンツ設定",
  },
};
