import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface Step4UsernameTranslations {
  title: string;
  howToAppear: string;
  usernameInUse: string;
}

export const step4UsernameTranslations: Record<
  SupportedDisplayLanguageCodes,
  Step4UsernameTranslations
> = {
  en: {
    title: "Choose your username",
    howToAppear: "How do you want to appear in Agora?",
    usernameInUse: "Username is already in use",
  },
  ar: {
    title: "اختر اسم المستخدم الخاص بك",
    howToAppear: "كيف تريد أن تظهر في أجورا؟",
    usernameInUse: "اسم المستخدم مُستخدم بالفعل",
  },
  es: {
    title: "Elige tu nombre de usuario",
    howToAppear: "¿Cómo quiere aparecer en Agora?",
    usernameInUse: "El nombre de usuario ya está en uso",
  },
  fa: {
    title: "نام کاربری خود را انتخاب کنید",
    howToAppear: "می‌خواهید در آگورا چگونه نمایش داده شوید؟",
    usernameInUse: "این نام کاربری قبلاً استفاده شده است",
  },
  he: {
    title: "בחרו את שם המשתמש שלכם",
    howToAppear: "כיצד ברצונכם להופיע ב-Agora?",
    usernameInUse: "שם המשתמש כבר בשימוש",
  },
  fr: {
    title: "Choisissez votre nom d'utilisateur",
    howToAppear: "Comment voulez-vous apparaître dans Agora ?",
    usernameInUse: "Le nom d'utilisateur est déjà utilisé",
  },
  "zh-Hans": {
    title: "选择您的用户名",
    howToAppear: "您希望在 Agora 中如何显示？",
    usernameInUse: "用户名已被使用",
  },
  "zh-Hant": {
    title: "選擇您的用戶名",
    howToAppear: "您希望在 Agora 中如何顯示？",
    usernameInUse: "用戶名已被使用",
  },
  ja: {
    title: "ユーザー名を選択",
    howToAppear: "Agora でどのように表示したいですか？",
    usernameInUse: "ユーザー名はすでに使用されています",
  },
  ky: {
    title: "Колдонуучу атыңызды тандаңыз",
    howToAppear: "Agora'да кандай көрүнгүңүз келет?",
    usernameInUse: "Колдонуучу аты мурунтан эле колдонулууда",
  },
  ru: {
    title: "Выберите имя пользователя",
    howToAppear: "Как вы хотите отображаться в Agora?",
    usernameInUse: "Это имя пользователя уже занято",
  },
};
