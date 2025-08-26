export interface DefaultMenuBarTranslations {
  logIn: string;
  [key: string]: string;
}

export const defaultMenuBarTranslations: Record<
  string,
  DefaultMenuBarTranslations
> = {
  en: {
    logIn: "Log in",
  },
  es: {
    logIn: "Log in",
  },
  fr: {
    logIn: "Log in",
  },
  "zh-Hans": {
    logIn: "登录",
  },
  "zh-Hant": {
    logIn: "登入",
  },
  ja: {
    logIn: "ログイン",
  },
};
