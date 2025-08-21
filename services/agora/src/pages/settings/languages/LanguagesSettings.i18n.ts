import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LanguagesSettingsTranslations {
  pageTitle: string;
  displayLanguageLabel: string;
  spokenLanguagesLabel: string;
  displayLanguageTitle: string;
  displayLanguageDescription: string;
  additionalLanguagesTitle: string;
  additionalLanguagesDescription: string;
  englishFallback: string;
  noneSelected: string;
  and: string;
  other: string;
  others: string;
}

export const languagesSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  LanguagesSettingsTranslations
> = {
  en: {
    pageTitle: "Language",
    displayLanguageLabel: "Display Language",
    spokenLanguagesLabel: "Spoken Languages",
    displayLanguageTitle: "Display language",
    displayLanguageDescription:
      "Your preferred language for the Agora App headers, buttons and other text",
    additionalLanguagesTitle: "Additional languages",
    additionalLanguagesDescription:
      "For content you would like to see on Agora",
    englishFallback: "English",
    noneSelected: "None selected",
    and: "and",
    other: "other",
    others: "others",
  },
  es: {
    pageTitle: "Idioma",
    displayLanguageLabel: "Idioma de visualización",
    spokenLanguagesLabel: "Idiomas hablados",
    displayLanguageTitle: "Idioma de visualización",
    displayLanguageDescription:
      "Tu idioma preferido para los encabezados, botones y otro texto de la aplicación Agora",
    additionalLanguagesTitle: "Idiomas adicionales",
    additionalLanguagesDescription:
      "Para contenido que te gustaría ver en Agora",
    englishFallback: "Inglés",
    noneSelected: "Ninguno seleccionado",
    and: "y",
    other: "otro",
    others: "otros",
  },
  fr: {
    pageTitle: "Langue",
    displayLanguageLabel: "Langue d'affichage",
    spokenLanguagesLabel: "Langues parlées",
    displayLanguageTitle: "Langue d'affichage",
    displayLanguageDescription:
      "Votre langue préférée pour les en-têtes, boutons et autres textes de l'application Agora",
    additionalLanguagesTitle: "Langues supplémentaires",
    additionalLanguagesDescription:
      "Pour le contenu que vous aimeriez voir sur Agora",
    englishFallback: "Anglais",
    noneSelected: "Aucun sélectionné",
    and: "et",
    other: "autre",
    others: "autres",
  },
};
