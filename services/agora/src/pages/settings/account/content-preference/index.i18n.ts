import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ContentPreferenceTranslations {
  contentPreference: string;
}

export const contentPreferenceTranslations: Record<
  SupportedDisplayLanguageCodes,
  ContentPreferenceTranslations
> = {
  en: {
    contentPreference: "Content Preference",
  },
  ar: {
    contentPreference: "تفضيلات المحتوى",
  },
  es: {
    contentPreference: "Preferencia de Contenido",
  },
  fr: {
    contentPreference: "Préférence de Contenu",
  },
  "zh-Hans": {
    contentPreference: "内容偏好",
  },
  "zh-Hant": {
    contentPreference: "內容偏好",
  },
  ja: {
    contentPreference: "コンテンツ設定",
  },
};
