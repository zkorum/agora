import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface Step3Phone2Translations {
  title: string;
}

export const step3Phone2Translations: Record<
  SupportedDisplayLanguageCodes,
  Step3Phone2Translations
> = {
  en: { title: "Enter the 6-digit code" },
  ar: { title: "أدخل الرمز المكون من 6 أرقام" },
  es: { title: "Ingrese el código de 6 dígitos" },
  fa: { title: "کد ۶ رقمی را وارد کنید" },
  he: { title: "הזינו את הקוד בן 6 הספרות" },
  fr: { title: "Entrez le code à 6 chiffres" },
  "zh-Hans": { title: "输入6位验证码" },
  "zh-Hant": { title: "輸入6位驗證碼" },
  ja: { title: "6桁のコードを入力" },
  ky: { title: "6 орундуу кодду киргизиңиз" },
  ru: { title: "Введите 6-значный код" },
};
