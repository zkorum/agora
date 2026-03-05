import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmailOnboardingTranslations {
  pageTitle: string;
  emailDescription: string;
  emailPlaceholder: string;
  preferPrivateLogin: string;
  preferPhoneLogin: string;
  pleaseEnterValidEmail: string;
  pleaseEnterEmail: string;
  alreadyHasEmail: string;
  throttled: string;
  unreachable: string;
  disposable: string;
  somethingWrong: string;
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
    alreadyHasEmail:
      "You already have an email address linked to your account",
    throttled: "Too many attempts—please wait before trying again",
    unreachable:
      "This email address doesn't seem to exist—please check and try again",
    disposable:
      "Temporary or disposable email addresses are not allowed",
    somethingWrong: "Oops! Something went wrong—please try again",
  },
  ar: {
    pageTitle: "أدخل عنوان بريدك الإلكتروني",
    emailDescription: "ستتلقى رمزًا مكوّنًا من 6 أرقام لمرة واحدة عبر البريد الإلكتروني",
    emailPlaceholder: "عنوان البريد الإلكتروني",
    preferPrivateLogin: "أفضل تسجيل الدخول بخصوصية تامة",
    preferPhoneLogin: "أفضل استخدام رقم هاتفي",
    pleaseEnterValidEmail: "الرجاء إدخال عنوان بريد إلكتروني صالح",
    pleaseEnterEmail: "الرجاء إدخال عنوان بريد إلكتروني",
    alreadyHasEmail: "لديك بالفعل عنوان بريد إلكتروني مرتبط بحسابك",
    throttled: "محاولات كثيرة جداً—يرجى الانتظار قبل المحاولة مرة أخرى",
    unreachable:
      "يبدو أن عنوان البريد الإلكتروني هذا غير موجود—يرجى التحقق والمحاولة مرة أخرى",
    disposable: "عناوين البريد الإلكتروني المؤقتة أو التي يمكن التخلص منها غير مسموح بها",
    somethingWrong: "عفواً! حدث خطأ—يرجى المحاولة مرة أخرى",
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
    alreadyHasEmail:
      "Ya tienes una dirección de correo electrónico vinculada a tu cuenta",
    throttled:
      "Demasiados intentos—por favor, espere antes de intentar de nuevo",
    unreachable:
      "Esta dirección de correo electrónico no parece existir—verifique e intente de nuevo",
    disposable:
      "No se permiten direcciones de correo electrónico temporales o desechables",
    somethingWrong: "¡Ups! Algo salió mal—intente de nuevo",
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
    alreadyHasEmail:
      "Une adresse e-mail est déjà associée à votre compte",
    throttled:
      "Trop de tentatives—veuillez attendre avant de réessayer",
    unreachable:
      "Cette adresse e-mail ne semble pas exister—veuillez vérifier et réessayer",
    disposable:
      "Les adresses e-mail temporaires ou jetables ne sont pas autorisées",
    somethingWrong: "Oups ! Quelque chose a mal tourné—veuillez réessayer",
  },
  "zh-Hans": {
    pageTitle: "输入您的电子邮箱地址",
    emailDescription: "您将收到一个6位一次性验证码",
    emailPlaceholder: "电子邮箱地址",
    preferPrivateLogin: "我更喜欢完全私密的登录",
    preferPhoneLogin: "我更想用手机号",
    pleaseEnterValidEmail: "请输入有效的电子邮箱地址",
    pleaseEnterEmail: "请输入电子邮箱地址",
    alreadyHasEmail: "您的账户已关联电子邮箱地址",
    throttled: "尝试次数过多—请稍后再试",
    unreachable: "此电子邮箱地址似乎不存在—请检查后重试",
    disposable: "不允许使用临时或一次性电子邮箱地址",
    somethingWrong: "哎呀！出错了—请重试",
  },
  "zh-Hant": {
    pageTitle: "輸入您的電子郵箱地址",
    emailDescription: "您將收到一個6位一次性驗證碼",
    emailPlaceholder: "電子郵箱地址",
    preferPrivateLogin: "我更喜歡完全私密的登入",
    preferPhoneLogin: "我更想用手機號",
    pleaseEnterValidEmail: "請輸入有效的電子郵箱地址",
    pleaseEnterEmail: "請輸入電子郵箱地址",
    alreadyHasEmail: "您的帳戶已關聯電子郵箱地址",
    throttled: "嘗試次數過多—請稍後再試",
    unreachable: "此電子郵箱地址似乎不存在—請檢查後重試",
    disposable: "不允許使用臨時或一次性電子郵箱地址",
    somethingWrong: "哎呀！出錯了—請重試",
  },
  ja: {
    pageTitle: "メールアドレスを入力",
    emailDescription: "6桁の1回限りのコードをメールで受信します",
    emailPlaceholder: "メールアドレス",
    preferPrivateLogin: "完全なプライバシーでログインしたい",
    preferPhoneLogin: "携帯電話番号を使いたい",
    pleaseEnterValidEmail: "有効なメールアドレスを入力してください",
    pleaseEnterEmail: "メールアドレスを入力してください",
    alreadyHasEmail:
      "アカウントにはすでにメールアドレスがリンクされています",
    throttled: "試行回数が多すぎます—もう一度試す前にお待ちください",
    unreachable:
      "このメールアドレスは存在しないようです—確認してもう一度お試しください",
    disposable:
      "一時的または使い捨てのメールアドレスは許可されていません",
    somethingWrong: "おっと！何かが間違っています—もう一度お試しください",
  },
};
