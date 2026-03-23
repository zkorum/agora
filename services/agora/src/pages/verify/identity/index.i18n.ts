import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyIdentityTranslations {
  title: string;
  description: string;
  verifyWithRarimo: string;
  verifyWithPhone: string;
}

export const verifyIdentityTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyIdentityTranslations
> = {
  en: {
    title: "Verify your identity",
    description: "Choose a verification method",
    verifyWithRarimo: "Verify with Rarimo",
    verifyWithPhone: "Verify with phone number",
  },
  ar: {
    title: "تحقق من هويتك",
    description: "اختر طريقة التحقق",
    verifyWithRarimo: "التحقق باستخدام رقمي",
    verifyWithPhone: "التحقق برقم الهاتف",
  },
  es: {
    title: "Verifica tu identidad",
    description: "Elige un método de verificación",
    verifyWithRarimo: "Verificar con Rarimo",
    verifyWithPhone: "Verificar con número de teléfono",
  },
  fa: {
    title: "تأیید هویت شما",
    description: "یک روش تأیید هویت انتخاب کنید",
    verifyWithRarimo: "تأیید هویت با Rarimo",
    verifyWithPhone: "تأیید هویت با شماره تلفن",
  },
  he: {
    title: "אמתו את זהותכם",
    description: "בחרו שיטת אימות",
    verifyWithRarimo: "אימות עם Rarimo",
    verifyWithPhone: "אימות עם מספר טלפון",
  },
  fr: {
    title: "Vérifiez votre identité",
    description: "Choisissez une méthode de vérification",
    verifyWithRarimo: "Vérifier avec Rarimo",
    verifyWithPhone: "Vérifier avec un numéro de téléphone",
  },
  "zh-Hans": {
    title: "验证您的身份",
    description: "选择验证方式",
    verifyWithRarimo: "使用 Rarimo 验证",
    verifyWithPhone: "使用手机号验证",
  },
  "zh-Hant": {
    title: "驗證您的身份",
    description: "選擇驗證方式",
    verifyWithRarimo: "使用 Rarimo 驗證",
    verifyWithPhone: "使用手機號驗證",
  },
  ja: {
    title: "本人確認",
    description: "確認方法を選択してください",
    verifyWithRarimo: "Rarimoで確認",
    verifyWithPhone: "電話番号で確認",
  },
  ky: {
    title: "Инсандыгыңызды текшериңиз",
    description: "Текшерүү ыкмасын тандаңыз",
    verifyWithRarimo: "Rarimo менен текшерүү",
    verifyWithPhone: "Телефон номери менен текшерүү",
  },
  ru: {
    title: "Подтвердите личность",
    description: "Выберите способ верификации",
    verifyWithRarimo: "Подтвердить через Rarimo",
    verifyWithPhone: "Подтвердить по номеру телефона",
  },
};
