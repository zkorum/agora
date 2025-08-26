import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface WelcomeTranslations {
  signUp: string;
  login: string;
  skipAuthentication: string;
  launchApp: string;
  logOut: string;
}

export const welcomeTranslations: Record<
  SupportedDisplayLanguageCodes,
  WelcomeTranslations
> = {
  en: {
    signUp: "Sign Up",
    login: "Log In",
    skipAuthentication: "Skip Authentication",
    launchApp: "Launch App",
    logOut: "Log Out",
  },
  es: {
    signUp: "Registrarse",
    login: "Iniciar Sesión",
    skipAuthentication: "Omitir Autenticación",
    launchApp: "Abrir Aplicación",
    logOut: "Cerrar Sesión",
  },
  fr: {
    signUp: "S'inscrire",
    login: "Se Connecter",
    skipAuthentication: "Ignorer l'Authentification",
    launchApp: "Lancer l'Application",
    logOut: "Se Déconnecter",
  },
  "zh-Hans": {
    signUp: "注册",
    login: "登录",
    skipAuthentication: "跳过认证",
    launchApp: "启动应用",
    logOut: "登出",
  },
  "zh-Hant": {
    signUp: "註冊",
    login: "登入",
    skipAuthentication: "跳過認證",
    launchApp: "啟動應用",
    logOut: "登出",
  },
  ja: {
    signUp: "サインアップ",
    login: "ログイン",
    skipAuthentication: "認証をスキップ",
    launchApp: "アプリを起動",
    logOut: "ログアウト",
  },
};
