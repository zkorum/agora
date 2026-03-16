import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyAnyTranslations {
  title: string;
  description: string;
  verifyWithRarimo: string;
  verifyWithPhone: string;
  verifyWithEmail: string;
}

export const verifyAnyTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyAnyTranslations
> = {
  en: {
    title: "Verify your account",
    description: "Choose a verification method",
    verifyWithRarimo: "Verify with Rarimo",
    verifyWithPhone: "Verify with phone number",
    verifyWithEmail: "Verify with email",
  },
  ar: {
    title: "تحقق من حسابك",
    description: "اختر طريقة التحقق",
    verifyWithRarimo: "التحقق باستخدام رقمي",
    verifyWithPhone: "التحقق برقم الهاتف",
    verifyWithEmail: "التحقق بالبريد الإلكتروني",
  },
  es: {
    title: "Verifica tu cuenta",
    description: "Elige un método de verificación",
    verifyWithRarimo: "Verificar con Rarimo",
    verifyWithPhone: "Verificar con número de teléfono",
    verifyWithEmail: "Verificar con correo electrónico",
  },
  fr: {
    title: "Vérifiez votre compte",
    description: "Choisissez une méthode de vérification",
    verifyWithRarimo: "Vérifier avec Rarimo",
    verifyWithPhone: "Vérifier avec un numéro de téléphone",
    verifyWithEmail: "Vérifier avec un e-mail",
  },
  "zh-Hans": {
    title: "验证您的账户",
    description: "选择验证方式",
    verifyWithRarimo: "使用 Rarimo 验证",
    verifyWithPhone: "使用手机号验证",
    verifyWithEmail: "使用电子邮箱验证",
  },
  "zh-Hant": {
    title: "驗證您的帳戶",
    description: "選擇驗證方式",
    verifyWithRarimo: "使用 Rarimo 驗證",
    verifyWithPhone: "使用手機號驗證",
    verifyWithEmail: "使用電子郵件驗證",
  },
  ja: {
    title: "アカウントを確認",
    description: "確認方法を選択してください",
    verifyWithRarimo: "Rarimoで確認",
    verifyWithPhone: "電話番号で確認",
    verifyWithEmail: "メールで確認",
  },
  ky: {
    title: "Аккаунтуңузду текшериңиз",
    description: "Текшерүү ыкмасын тандаңыз",
    verifyWithRarimo: "Rarimo менен текшерүү",
    verifyWithPhone: "Телефон номери менен текшерүү",
    verifyWithEmail: "Электрондук почта менен текшерүү",
  },
  ru: {
    title: "Подтвердите аккаунт",
    description: "Выберите способ верификации",
    verifyWithRarimo: "Подтвердить через Rarimo",
    verifyWithPhone: "Подтвердить по номеру телефона",
    verifyWithEmail: "Подтвердить по электронной почте",
  },
};
