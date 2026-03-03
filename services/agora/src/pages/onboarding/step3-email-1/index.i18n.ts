import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmailOnboardingTranslations {
  pageTitle: string;
  emailDescription: string;
  emailPlaceholder: string;
  preferPrivateLogin: string;
  preferPhoneLogin: string;
  pleaseEnterValidEmail: string;
  pleaseEnterEmail: string;
}

export const emailOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmailOnboardingTranslations
> = {
  en: {
    pageTitle: "Enter your email address",
    emailDescription: "You will receive a 6-digit one-time code by email",
    emailPlaceholder: "Email address",
    preferPrivateLogin: "I'd prefer to login with complete privacy",
    preferPhoneLogin: "I'd rather use my phone number",
    pleaseEnterValidEmail: "Please enter a valid email address",
    pleaseEnterEmail: "Please enter an email address",
  },
  ar: {
    pageTitle: "أدخل عنوان بريدك الإلكتروني",
    emailDescription: "ستتلقى رمزًا مكوّنًا من 6 أرقام لمرة واحدة عبر البريد الإلكتروني",
    emailPlaceholder: "عنوان البريد الإلكتروني",
    preferPrivateLogin: "أفضل تسجيل الدخول بخصوصية تامة",
    preferPhoneLogin: "أفضل استخدام رقم هاتفي",
    pleaseEnterValidEmail: "الرجاء إدخال عنوان بريد إلكتروني صالح",
    pleaseEnterEmail: "الرجاء إدخال عنوان بريد إلكتروني",
  },
  es: {
    pageTitle: "Ingrese su correo electrónico",
    emailDescription:
      "Recibirá un código de un solo uso de 6 dígitos por correo electrónico",
    emailPlaceholder: "Correo electrónico",
    preferPrivateLogin: "Prefiero iniciar sesión con privacidad completa",
    preferPhoneLogin: "Prefiero usar mi número de teléfono",
    pleaseEnterValidEmail:
      "Por favor, ingrese una dirección de correo electrónico válida",
    pleaseEnterEmail:
      "Por favor, ingrese una dirección de correo electrónico",
  },
  fr: {
    pageTitle: "Entrez votre adresse e-mail",
    emailDescription:
      "Vous recevrez un code à usage unique de 6 chiffres par e-mail",
    emailPlaceholder: "Adresse e-mail",
    preferPrivateLogin: "Je préfère me connecter en toute confidentialité",
    preferPhoneLogin: "Je préfère utiliser mon numéro de téléphone",
    pleaseEnterValidEmail: "Veuillez saisir une adresse e-mail valide",
    pleaseEnterEmail: "Veuillez saisir une adresse e-mail",
  },
  "zh-Hans": {
    pageTitle: "输入您的电子邮箱地址",
    emailDescription: "您将收到一个6位一次性验证码",
    emailPlaceholder: "电子邮箱地址",
    preferPrivateLogin: "我更喜欢完全私密的登录",
    preferPhoneLogin: "我更想用手机号",
    pleaseEnterValidEmail: "请输入有效的电子邮箱地址",
    pleaseEnterEmail: "请输入电子邮箱地址",
  },
  "zh-Hant": {
    pageTitle: "輸入您的電子郵箱地址",
    emailDescription: "您將收到一個6位一次性驗證碼",
    emailPlaceholder: "電子郵箱地址",
    preferPrivateLogin: "我更喜歡完全私密的登入",
    preferPhoneLogin: "我更想用手機號",
    pleaseEnterValidEmail: "請輸入有效的電子郵箱地址",
    pleaseEnterEmail: "請輸入電子郵箱地址",
  },
  ja: {
    pageTitle: "メールアドレスを入力",
    emailDescription: "6桁の1回限りのコードをメールで受信します",
    emailPlaceholder: "メールアドレス",
    preferPrivateLogin: "完全なプライバシーでログインしたい",
    preferPhoneLogin: "携帯電話番号を使いたい",
    pleaseEnterValidEmail: "有効なメールアドレスを入力してください",
    pleaseEnterEmail: "メールアドレスを入力してください",
  },
};
