// Hebrew translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "טוען...",
  },
  importConversation: {
    legalNotice: `בלחיצה על "ייבוא", הנכם מאשרים שייבוא התוכן עומד בתנאי {polisTerms} וב{termsOfUse} שלנו. שימו לב שנתוני פוליס המקוריים מורשים תחת {ccLicense}. אין לייבא תוכן בלתי חוקי או פוגעני. יש להשתמש בממשק הייבוא באחריות. שימוש לרעה אסור.`,
  },
};

export default translations;
