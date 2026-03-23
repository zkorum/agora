import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyEmailCodeTranslations {
  title: string;
}

export const verifyEmailCodeTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyEmailCodeTranslations
> = {
  en: {
    title: "Enter Code",
  },
  ar: {
    title: "أدخل الرمز",
  },
  es: {
    title: "Ingrese el código",
  },
  fa: {
    title: "کد را وارد کنید",
  },
  he: {
    title: "הזינו את הקוד",
  },
  fr: {
    title: "Entrez le code",
  },
  "zh-Hans": {
    title: "输入验证码",
  },
  "zh-Hant": {
    title: "輸入驗證碼",
  },
  ja: {
    title: "コードを入力",
  },
  ky: {
    title: "Кодду киргизиңиз",
  },
  ru: {
    title: "Введите код",
  },
};
