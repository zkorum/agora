import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginOnboardingTranslations {
  pageTitle: string;
  description: string;
  loginWithRariMe: string;
  loginWithPhone: string;
}

export const loginOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginOnboardingTranslations
> = {
  en: {
    pageTitle: "Log In",
    description: "Please select a log in method.",
    loginWithRariMe: "Login with RariMe",
    loginWithPhone: "Login with my phone number",
  },
  es: {
    pageTitle: "Iniciar sesión",
    description: "Por favor, seleccione un método de inicio de sesión.",
    loginWithRariMe: "Iniciar sesión con RariMe",
    loginWithPhone: "Iniciar sesión con mi número de teléfono",
  },
  fr: {
    pageTitle: "Se connecter",
    description: "Veuillez sélectionner une méthode de connexion.",
    loginWithRariMe: "Se connecter avec RariMe",
    loginWithPhone: "Se connecter avec mon numéro de téléphone",
  },
  "zh-CN": {
    pageTitle: "登录",
    description: "请选择登录方式。",
    loginWithRariMe: "使用 RariMe 登录",
    loginWithPhone: "使用手机号登录",
  },
  "zh-TW": {
    pageTitle: "登入",
    description: "請選擇登入方式。",
    loginWithRariMe: "使用 RariMe 登入",
    loginWithPhone: "使用手機號登入",
  },
  ja: {
    pageTitle: "ログイン",
    description: "ログイン方法を選択してください。",
    loginWithRariMe: "RariMe でログイン",
    loginWithPhone: "携帯電話でログイン",
  },
};
