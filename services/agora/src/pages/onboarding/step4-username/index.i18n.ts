export interface Step4UsernameTranslations {
  title: string;
  howToAppear: string;
  usernameInUse: string;
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
    howToAppear: "¿Cómo quiere aparecer en Agora?",
    usernameInUse: "El nombre de usuario ya está en uso",
  },
  fr: {
    title: "Choisissez votre nom d'utilisateur",
    howToAppear: "Comment voulez-vous apparaître dans Agora ?",
    usernameInUse: "Le nom d'utilisateur est déjà utilisé",
  },
  "zh-CN": {
    title: "选择您的用户名",
    howToAppear: "您希望在 Agora 中如何显示？",
    usernameInUse: "用户名已被使用",
  },
  "zh-TW": {
    title: "選擇您的用戶名",
    howToAppear: "您希望在 Agora 中如何顯示？",
    usernameInUse: "用戶名已被使用",
  },
  ja: {
    title: "ユーザー名を選択",
    howToAppear: "Agora でどのように表示したいですか？",
    usernameInUse: "ユーザー名はすでに使用されています",
  },
};
