// English translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Loading...",
  },
  importConversation: {
    legalNotice: `By clicking "Import", you confirm that importing the content complies with the {polisTerms} and our {termsOfUse}. Note that the original Polis data are licensed under the {ccLicense}. Do not import illegal or abusive. Use the import API responsibly. Abuse is prohibited.`,
  },
};

export default translations;
