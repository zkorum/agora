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
};
