import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyPhoneTranslations {
  title: string;
  alreadyHasPhone: string;
}

export const verifyPhoneTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyPhoneTranslations
> = {
  en: {
    title: "Verify Phone",
    alreadyHasPhone: "You already have a phone number linked to your account",
  },
  ar: {
    title: "التحقق من الهاتف",
    alreadyHasPhone: "لديك بالفعل رقم هاتف مرتبط بحسابك",
  },
  es: {
    title: "Verificar teléfono",
    alreadyHasPhone:
      "Ya tienes un número de teléfono vinculado a tu cuenta",
  },
  fr: {
    title: "Vérifier le téléphone",
    alreadyHasPhone:
      "Un numéro de téléphone est déjà associé à votre compte",
  },
  "zh-Hans": {
    title: "验证手机",
    alreadyHasPhone: "您的账户已关联手机号码",
  },
  "zh-Hant": {
    title: "驗證手機",
    alreadyHasPhone: "您的帳戶已關聯手機號碼",
  },
  ja: {
    title: "電話確認",
    alreadyHasPhone: "アカウントにはすでに電話番号がリンクされています",
  },
};
