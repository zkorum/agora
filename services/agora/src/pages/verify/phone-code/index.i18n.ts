import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyPhoneCodeTranslations {
  title: string;
}

export const verifyPhoneCodeTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyPhoneCodeTranslations
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
};
