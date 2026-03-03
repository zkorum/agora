import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyEmailTranslations {
  title: string;
  alreadyHasEmail: string;
}

export const verifyEmailTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyEmailTranslations
> = {
  en: {
    title: "Verify Email",
    alreadyHasEmail:
      "You already have an email address linked to your account",
  },
  ar: {
    title: "التحقق من البريد الإلكتروني",
    alreadyHasEmail:
      "لديك بالفعل عنوان بريد إلكتروني مرتبط بحسابك",
  },
  es: {
    title: "Verificar correo electrónico",
    alreadyHasEmail:
      "Ya tienes una dirección de correo electrónico vinculada a tu cuenta",
  },
  fr: {
    title: "Vérifier l'e-mail",
    alreadyHasEmail:
      "Une adresse e-mail est déjà associée à votre compte",
  },
  "zh-Hans": {
    title: "验证邮箱",
    alreadyHasEmail: "您的账户已关联电子邮箱地址",
  },
  "zh-Hant": {
    title: "驗證郵箱",
    alreadyHasEmail: "您的帳戶已關聯電子郵箱地址",
  },
  ja: {
    title: "メール確認",
    alreadyHasEmail:
      "アカウントにはすでにメールアドレスがリンクされています",
  },
};
