import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginOnboardingTranslations {
  pageTitle: string;
  description: string;
  connectWallet: string;
  loginWithPhone: string;
}

export const loginOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginOnboardingTranslations
> = {
  en: {
    pageTitle: "Log In",
    description: "Connect your Jomhoor wallet or use your phone number.",
    connectWallet: "Connect Jomhoor Wallet",
    loginWithPhone: "Log in with phone number",
  },
  ar: {
    pageTitle: "تسجيل الدخول",
    description: "اتصل بمحفظة جمهور أو استخدم رقم هاتفك.",
    connectWallet: "اتصل بمحفظة جمهور",
    loginWithPhone: "تسجيل الدخول برقم الهاتف",
  },
  es: {
    pageTitle: "Iniciar sesión",
    description: "Conecta tu billetera Jomhoor o usa tu número de teléfono.",
    connectWallet: "Conectar billetera Jomhoor",
    loginWithPhone: "Iniciar sesión con teléfono",
  },
  fr: {
    pageTitle: "Se connecter",
    description: "Connectez votre portefeuille Jomhoor ou utilisez votre numéro de téléphone.",
    connectWallet: "Connecter le portefeuille Jomhoor",
    loginWithPhone: "Se connecter avec le téléphone",
  },
  "zh-Hans": {
    pageTitle: "登录",
    description: "连接您的 Jomhoor 钱包或使用手机号码。",
    connectWallet: "连接 Jomhoor 钱包",
    loginWithPhone: "使用手机号码登录",
  },
  "zh-Hant": {
    pageTitle: "登入",
    description: "連接您的 Jomhoor 錢包或使用手機號碼。",
    connectWallet: "連接 Jomhoor 錢包",
    loginWithPhone: "使用手機號碼登入",
  },
  ja: {
    pageTitle: "ログイン",
    description: "Jomhoor ウォレットを接続するか、電話番号でログインしてください。",
    connectWallet: "Jomhoor ウォレットを接続",
    loginWithPhone: "電話番号でログイン",
  },
  fa: {
    pageTitle: "ورود",
    description: "کیف پول جمهور خود را متصل کنید یا از شماره تلفن استفاده کنید.",
    connectWallet: "اتصال کیف پول جمهور",
    loginWithPhone: "ورود با شماره تلفن",
  },
};
