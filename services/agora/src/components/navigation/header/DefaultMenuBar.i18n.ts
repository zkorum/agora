import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DefaultMenuBarTranslations {
  logIn: string;
}

export const defaultMenuBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  DefaultMenuBarTranslations
> = {
  en: {
    logIn: "Log in",
  },
  ar: {
    logIn: "تسجيل الدخول",
  },
  es: {
    logIn: "Iniciar sesión",
  },
  fa: {
    logIn: "ورود",
  },
  fr: {
    logIn: "Se connecter",
  },
  "zh-Hans": {
    logIn: "登录",
  },
  "zh-Hant": {
    logIn: "登入",
  },
  he: {
    logIn: "התחברות",
  },
  ja: {
    logIn: "ログイン",
  },
  ky: {
    logIn: "Кирүү",
  },
  ru: {
    logIn: "Войти",
  },
};
