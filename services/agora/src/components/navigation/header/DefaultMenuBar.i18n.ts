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
    logIn: "Iniciar sesión",
  },
  fr: {
    logIn: "Se connecter",
  },
};
