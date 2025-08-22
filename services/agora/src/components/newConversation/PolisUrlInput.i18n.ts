export interface PolisUrlInputTranslations {
  importTitle: string;
  description: string;
  validUrlExamples: string;
  urlPlaceholder: string;
  legalNotice: string;
  polisTerms: string;
  termsOfUse: string;
  ccLicense: string;
  [key: string]: string;
}

export const polisUrlInputTranslations: Record<
  string,
  PolisUrlInputTranslations
> = {
  en: {
    importTitle: "Import Conversation from Polis",
    description: "Paste a Polis URL below to import a conversation.",
    validUrlExamples: "Valid URL examples:",
    urlPlaceholder: "e.g., https://pol.is/xxxxx",
    legalNotice:
      'By clicking "Import", you confirm that importing the content complies with the',
    polisTerms: "Pol.is Terms",
    termsOfUse: "Terms of Use",
    ccLicense: "Creative Commons Attribution 4.0 International license",
  },
  es: {
    importTitle: "Importar Conversación desde Polis",
    description:
      "Pega una URL de Polis a continuación para importar una conversación.",
    validUrlExamples: "Ejemplos de URL válidas:",
    urlPlaceholder: "ej., https://pol.is/xxxxx",
    legalNotice:
      'Al hacer clic en "Importar", confirmas que importar el contenido cumple con los',
    polisTerms: "Términos de Pol.is",
    termsOfUse: "Términos de Uso",
    ccLicense: "licencia Creative Commons Atribución 4.0 Internacional",
  },
  fr: {
    importTitle: "Importer une Conversation depuis Polis",
    description:
      "Collez une URL Polis ci-dessous pour importer une conversation.",
    validUrlExamples: "Exemples d'URL valides :",
    urlPlaceholder: "ex., https://pol.is/xxxxx",
    legalNotice:
      'En cliquant sur "Importer", vous confirmez que l\'importation du contenu respecte les',
    polisTerms: "Conditions de Pol.is",
    termsOfUse: "Conditions d'Utilisation",
    ccLicense: "licence Creative Commons Attribution 4.0 International",
  },
};
