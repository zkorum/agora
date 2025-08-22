// French translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Chargement...",
  },
  importConversation: {
    legalNotice: `En cliquant sur "Importer", vous confirmez que l'importation du contenu respecte les {polisTerms} et nos {termsOfUse}. Notez que les données originales de Polis sont sous licence {ccLicense}. N'importez pas de contenu illégal ou abusif. Utilisez l'API d'importation de manière responsable. Les abus sont interdits.`,
  },
};

export default translations;
