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
    title: "Log in",
    description: "Verify a credential to participate to this conversation",
    verifyWithRarimo: "Log in with Rarimo",
    verifyWithPhone: "Log in with phone number",
    verifyWithEmail: "Log in with email",
  },
  ar: {
    title: "تسجيل الدخول",
    description: "تحقق من بيانات الاعتماد للمشاركة في هذه المحادثة",
    verifyWithRarimo: "تسجيل الدخول باستخدام Rarimo",
    verifyWithPhone: "تسجيل الدخول برقم الهاتف",
    verifyWithEmail: "تسجيل الدخول بالبريد الإلكتروني",
  },
  es: {
    title: "Iniciar sesión",
    description:
      "Verifica una credencial para participar en esta conversación",
    verifyWithRarimo: "Iniciar sesión con Rarimo",
    verifyWithPhone: "Iniciar sesión con número de teléfono",
    verifyWithEmail: "Iniciar sesión con correo electrónico",
  },
  fa: {
    title: "ورود",
    description: "یک اعتبارنامه تأیید کنید تا در این گفتگو مشارکت کنید",
    verifyWithRarimo: "ورود با Rarimo",
    verifyWithPhone: "ورود با شماره تلفن",
    verifyWithEmail: "ورود با ایمیل",
  },
  he: {
    title: "התחברות",
    description: "אמתו אישורים כדי להשתתף בשיחה זו",
    verifyWithRarimo: "התחברות עם Rarimo",
    verifyWithPhone: "התחברות עם מספר טלפון",
    verifyWithEmail: "התחברות עם אימייל",
  },
  fr: {
    title: "Se connecter",
    description:
      "Vérifiez une accréditation pour participer à cette conversation",
    verifyWithRarimo: "Se connecter avec Rarimo",
    verifyWithPhone: "Se connecter avec un numéro de téléphone",
    verifyWithEmail: "Se connecter avec un e-mail",
  },
  "zh-Hans": {
    title: "登录",
    description: "验证凭证以参与此对话",
    verifyWithRarimo: "使用 Rarimo 登录",
    verifyWithPhone: "使用手机号登录",
    verifyWithEmail: "使用电子邮箱登录",
  },
  "zh-Hant": {
    title: "登入",
    description: "驗證憑證以參與此對話",
    verifyWithRarimo: "使用 Rarimo 登入",
    verifyWithPhone: "使用手機號登入",
    verifyWithEmail: "使用電子郵件登入",
  },
  ja: {
    title: "ログイン",
    description: "この会話に参加するために資格情報を確認してください",
    verifyWithRarimo: "Rarimoでログイン",
    verifyWithPhone: "電話番号でログイン",
    verifyWithEmail: "メールでログイン",
  },
  ky: {
    title: "Кирүү",
    description:
      "Бул сүйлөшүүгө катышуу үчүн күбөлүктү текшериңиз",
    verifyWithRarimo: "Rarimo менен кирүү",
    verifyWithPhone: "Телефон номери менен кирүү",
    verifyWithEmail: "Электрондук почта менен кирүү",
  },
  ru: {
    title: "Войти",
    description:
      "Подтвердите учётные данные для участия в этом обсуждении",
    verifyWithRarimo: "Войти через Rarimo",
    verifyWithPhone: "Войти по номеру телефона",
    verifyWithEmail: "Войти по электронной почте",
  },
};
