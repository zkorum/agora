// Arabic translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "جارٍ التحميل...",
  },
  importConversation: {
    legalNotice: `بالنقر على "استيراد"، فإنك تؤكد أن استيراد المحتوى يتوافق مع {polisTerms} و{termsOfUse} الخاصة بنا. يرجى ملاحظة أن بيانات بوليس الأصلية مرخّصة بموجب {ccLicense}. لا تستورد محتوى غير قانوني أو مسيء. استخدم واجهة برمجة الاستيراد بمسؤولية. يُحظر إساءة الاستخدام.`,
  },
};

export default translations;
