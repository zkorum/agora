import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginOnboardingTranslations {
  pageTitle: string;
  description: string;
  connectWallet: string;
  loginWithRarimo: string;
  loginWithPhone: string;
  loginWithEmail: string;
}

export const loginOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginOnboardingTranslations
> = {
  en: {
    pageTitle: "Log In",
    description: "Please select a log in method.",
    connectWallet: "Connect Jomhoor Wallet",
    loginWithRarimo: "Login with Rarimo",
    loginWithPhone: "Login with phone number",
    loginWithEmail: "Login with email",
  },
  ar: {
    pageTitle: "تسجيل الدخول",
    description: "يرجى اختيار طريقة تسجيل الدخول.",
    connectWallet: "اتصل بمحفظة جمهور",
    loginWithRarimo: "تسجيل الدخول باستخدام Rarimo",
    loginWithPhone: "تسجيل الدخول برقم هاتفي",
    loginWithEmail: "تسجيل الدخول ببريدي الإلكتروني",
  },
  es: {
    pageTitle: "Iniciar sesión",
    description: "Por favor, seleccione un método de inicio de sesión.",
    connectWallet: "Conectar billetera Jomhoor",
    loginWithRarimo: "Iniciar sesión con Rarimo",
    loginWithPhone: "Iniciar sesión con mi número de teléfono",
    loginWithEmail: "Iniciar sesión con mi correo electrónico",
  },
  fr: {
    pageTitle: "Se connecter",
    description: "Veuillez sélectionner une méthode de connexion.",
    connectWallet: "Connecter le portefeuille Jomhoor",
    loginWithRarimo: "Se connecter avec Rarimo",
    loginWithPhone: "Se connecter avec mon numéro de téléphone",
    loginWithEmail: "Se connecter avec mon e-mail",
  },
  "zh-Hans": {
    pageTitle: "登录",
    description: "请选择登录方式。",
    connectWallet: "连接 Jomhoor 钱包",
    loginWithRarimo: "使用 Rarimo 登录",
    loginWithPhone: "使用手机号登录",
    loginWithEmail: "使用我的邮箱登录",
  },
  "zh-Hant": {
    pageTitle: "登入",
    description: "請選擇登入方式。",
    connectWallet: "連接 Jomhoor 錢包",
    loginWithRarimo: "使用 Rarimo 登入",
    loginWithPhone: "使用手機號登入",
    loginWithEmail: "使用我的郵箱登入",
  },
  ja: {
    pageTitle: "ログイン",
    description: "ログイン方法を選択してください。",
    connectWallet: "Jomhoor ウォレットを接続",
    loginWithRarimo: "Rarimo でログイン",
    loginWithPhone: "携帯電話でログイン",
    loginWithEmail: "自分のメールでログイン",
  },
  fa: {
    pageTitle: "ورود",
    description: "لطفاً روش ورود را انتخاب کنید.",
    connectWallet: "اتصال کیف پول جمهور",
    loginWithRarimo: "ورود با Rarimo",
    loginWithPhone: "ورود با شماره تلفن",
    loginWithEmail: "ورود با ایمیل",
  },
  ky: {
    pageTitle: "Кирүү",
    description: "Кирүү ыкмасын тандаңыз.",
    connectWallet: "Jomhoor капчыгын туташтыруу",
    loginWithRarimo: "Rarimo менен кирүү",
    loginWithPhone: "Телефон номери менен кирүү",
    loginWithEmail: "Электрондук почта менен кирүү",
  },
  ru: {
    pageTitle: "Вход",
    description: "Пожалуйста, выберите способ входа.",
    connectWallet: "Подключить кошелёк Jomhoor",
    loginWithRarimo: "Войти через Rarimo",
    loginWithPhone: "Войти по номеру телефона",
    loginWithEmail: "Войти по электронной почте",
  },
};
