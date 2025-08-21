export interface Step4UsernameTranslations {
  title: string;
  howToAppear: string;
  usernameInUse: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const step4UsernameTranslations: Record<
  string,
  Step4UsernameTranslations
> = {
  en: {
    title: "Choose your username",
    howToAppear: "How do you want to appear in Agora?",
    usernameInUse: "Username is already in use",
  },
  es: {
    title: "Elige tu nombre de usuario",
    howToAppear: "¿Cómo quieres aparecer en Agora?",
    usernameInUse: "El nombre de usuario ya está en uso",
  },
  fr: {
    title: "Choisissez votre nom d'utilisateur",
    howToAppear: "Comment voulez-vous apparaître dans Agora ?",
    usernameInUse: "Le nom d'utilisateur est déjà utilisé",
  },
};
