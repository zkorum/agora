import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginOnboardingTranslations {
  pageTitle: string;
  description: string;
  loginWithRarimo: string;
  loginWithPhone: string;
  loginWithEmail: string;
}

export const loginOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginOnboardingTranslations
> = {
  en: {
    pageTitle: "Log In",
    description: "Please select a log in method.",
    loginWithRarimo: "Login with Rarimo",
    loginWithPhone: "Login with my phone number",
    loginWithEmail: "I prefer to login with email",
  },
  ar: {
    pageTitle: "تسجيل الدخول",
    description: "يرجى اختيار طريقة تسجيل الدخول.",
    loginWithRarimo: "تسجيل الدخول باستخدام Rarimo",
    loginWithPhone: "تسجيل الدخول برقم هاتفي",
    loginWithEmail: "أفضل تسجيل الدخول بالبريد الإلكتروني",
  },
  es: {
    pageTitle: "Iniciar sesión",
    description: "Por favor, seleccione un método de inicio de sesión.",
    loginWithRarimo: "Iniciar sesión con Rarimo",
    loginWithPhone: "Iniciar sesión con mi número de teléfono",
    loginWithEmail: "Prefiero iniciar sesión con correo electrónico",
  },
  fr: {
    pageTitle: "Se connecter",
    description: "Veuillez sélectionner une méthode de connexion.",
    loginWithRarimo: "Se connecter avec Rarimo",
    loginWithPhone: "Se connecter avec mon numéro de téléphone",
    loginWithEmail: "Je préfère me connecter avec mon e-mail",
  },
  "zh-Hans": {
    pageTitle: "登录",
    description: "请选择登录方式。",
    loginWithRarimo: "使用 Rarimo 登录",
    loginWithPhone: "使用手机号登录",
    loginWithEmail: "我更想用邮箱登录",
  },
  "zh-Hant": {
    pageTitle: "登入",
    description: "請選擇登入方式。",
    loginWithRarimo: "使用 Rarimo 登入",
    loginWithPhone: "使用手機號登入",
    loginWithEmail: "我更想用郵箱登入",
  },
  ja: {
    pageTitle: "ログイン",
    description: "ログイン方法を選択してください。",
    loginWithRarimo: "Rarimo でログイン",
    loginWithPhone: "携帯電話でログイン",
    loginWithEmail: "メールでログインしたい",
  },
};
