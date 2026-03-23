// Persian (Farsi) translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "در حال بارگذاری...",
  },
  importConversation: {
    legalNotice: `با کلیک روی "وارد کردن"، شما تأیید می‌کنید که وارد کردن محتوا مطابق با {polisTerms} و {termsOfUse} ما است. توجه داشته باشید که داده‌های اصلی پولیس تحت مجوز {ccLicense} منتشر شده‌اند. محتوای غیرقانونی یا توهین‌آمیز وارد نکنید. از رابط برنامه‌نویسی واردات به‌صورت مسئولانه استفاده کنید. سوءاستفاده ممنوع است.`,
  },
};

export default translations;
