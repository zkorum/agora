import { type SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PolisUrlInputTranslations {
  importTitle: string;
  description: string;
  validUrlExamples: string;
  urlPlaceholder: string;
  polisTerms: string;
  termsOfUse: string;
  ccLicense: string;
}

export const polisUrlInputTranslations: Record<
  SupportedDisplayLanguageCodes,
  PolisUrlInputTranslations
> = {
  en: {
    importTitle: "Import Conversation from Polis",
    description: "Paste a Polis URL below to import a conversation.",
    validUrlExamples: "Valid URL examples:",
    urlPlaceholder: "e.g., https://pol.is/xxxxx",
    polisTerms: "Pol.is Terms",
    termsOfUse: "Terms of Use",
    ccLicense: "CC BY 4.0",
  },
  es: {
    importTitle: "Importar Conversación desde Polis",
    description:
      "Pega una URL de Polis a continuación para importar una conversación.",
    validUrlExamples: "Ejemplos de URL válidas:",
    urlPlaceholder: "ej., https://pol.is/xxxxx",
    polisTerms: "Términos de uso de Pol.is",
    termsOfUse: "Términos de uso",
    ccLicense: "CC BY 4.0",
  },
  fr: {
    importTitle: "Importer une Conversation depuis Polis",
    description:
      "Collez une URL Polis ci-dessous pour importer une conversation.",
    validUrlExamples: "Exemples d'URL valides :",
    urlPlaceholder: "ex., https://pol.is/xxxxx",
    polisTerms: "Conditions d'utilisation de Pol.is",
    termsOfUse: "Conditions d'utilisation",
    ccLicense: "CC BY 4.0",
  },
};
