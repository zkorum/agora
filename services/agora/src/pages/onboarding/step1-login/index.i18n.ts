import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginOnboardingTranslations {
  pageTitle: string;
  description: string;
  connectWallet: string;
}

export const loginOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginOnboardingTranslations
> = {
  en: {
    pageTitle: "Log In",
    description: "Connect your Jomhoor wallet to log in.",
    connectWallet: "Connect Jomhoor Wallet",
  },
  ar: {
    pageTitle: "تسجيل الدخول",
    description: "اتصل بمحفظة جمهور لتسجيل الدخول.",
    connectWallet: "اتصل بمحفظة جمهور",
  },
  es: {
    pageTitle: "Iniciar sesión",
    description: "Conecta tu billetera Jomhoor para iniciar sesión.",
    connectWallet: "Conectar billetera Jomhoor",
  },
  fr: {
    pageTitle: "Se connecter",
    description: "Connectez votre portefeuille Jomhoor pour vous connecter.",
    connectWallet: "Connecter le portefeuille Jomhoor",
  },
  "zh-Hans": {
    pageTitle: "登录",
    description: "连接您的 Jomhoor 钱包以登录。",
    connectWallet: "连接 Jomhoor 钱包",
  },
  "zh-Hant": {
    pageTitle: "登入",
    description: "連接您的 Jomhoor 錢包以登入。",
    connectWallet: "連接 Jomhoor 錢包",
  },
  ja: {
    pageTitle: "ログイン",
    description: "Jomhoor ウォレットを接続してログインしてください。",
    connectWallet: "Jomhoor ウォレットを接続",
  },
  fa: {
    pageTitle: "ورود",
    description: "کیف پول جمهور خود را متصل کنید تا وارد شوید.",
    connectWallet: "اتصال کیف پول جمهور",
  },
};
