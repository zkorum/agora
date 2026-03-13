// Kyrgyz translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Жүктөлүүдө...",
  },
  importConversation: {
    legalNotice: `"Импорттоо" баскычын басуу менен, сиз мазмунду импорттоо {polisTerms} жана биздин {termsOfUse} шарттарына ылайык келерин ырастайсыз. Polis'тин баштапкы маалыматтары {ccLicense} лицензиясы менен берилгенин эске алыңыз. Мыйзамсыз же зомбулуктуу мазмунду импорттобоңуз. Импорттоо API'син жоопкерчиликтүү колдонуңуз. Кыянаттык кылууга тыюу салынат.`,
  },
};

export default translations;
