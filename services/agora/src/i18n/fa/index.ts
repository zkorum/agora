// Persian (فارسی) translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "در حال بارگذاری...",
  },
  importConversation: {
    legalNotice: `با کلیک بر روی «وارد کردن»، تأیید می‌کنید که وارد کردن محتوا با {polisTerms} و {termsOfUse} ما مطابقت دارد. توجه داشته باشید که داده‌های اصلی پولیس تحت مجوز {ccLicense} منتشر شده‌اند. محتوای غیرقانونی یا توهین‌آمیز وارد نکنید. از رابط برنامه‌نویسی وارد کردن مسئولانه استفاده کنید. سوءاستفاده ممنوع است.`,
  },
};

export default translations;
