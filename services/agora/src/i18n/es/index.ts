// Spanish translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Cargando...",
  },
  importConversation: {
    legalNotice: `Al hacer clic en "Importar", confirma que la importación del contenido cumple con los {polisTerms} y nuestros {termsOfUse}. Tenga en cuenta que los datos originales de Polis están licenciados bajo {ccLicense}. No importe material ilegal o abusivo. Use la API de importación de manera responsable. Se prohíbe el abuso.`,
  },
};

export default translations;
