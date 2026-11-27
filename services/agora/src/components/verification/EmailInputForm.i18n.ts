import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmailInputFormTranslations {
  emailDescription: string;
  emailPlaceholder: string;
  pleaseEnterValidEmail: string;
  pleaseEnterEmail: string;
}

export const emailInputFormTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmailInputFormTranslations
> = {
  en: {
    emailDescription:
      "You will receive a 6-digit one-time code by email. Your email stays private.",
    emailPlaceholder: "Email address",
    pleaseEnterValidEmail: "Please enter a valid email address",
    pleaseEnterEmail: "Please enter an email address",
  },
  de: {
    emailDescription:
      "Sie erhalten einen 6-stelligen Einmalcode per E-Mail. Ihre E-Mail-Adresse bleibt privat.",
    emailPlaceholder: "E-Mail-Adresse",
    pleaseEnterValidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
    pleaseEnterEmail: "Bitte geben Sie eine E-Mail-Adresse ein",
  },
  hi: {
    emailDescription:
      "आपको ईमेल द्वारा 6-अंकीय एक बार का कोड प्राप्त होगा। आपका ईमेल निजी रहेगा।",
    emailPlaceholder: "ईमेल पता",
    pleaseEnterValidEmail: "कृपया एक वैध ईमेल पता दर्ज करें",
    pleaseEnterEmail: "कृपया एक ईमेल पता दर्ज करें",
  },
  ar: {
    emailDescription:
      "ستتلقى رمزًا مكوّنًا من 6 أرقام لمرة واحدة عبر البريد الإلكتروني. يظل بريدك الإلكتروني خاصًا.",
    emailPlaceholder: "عنوان البريد الإلكتروني",
    pleaseEnterValidEmail: "الرجاء إدخال عنوان بريد إلكتروني صالح",
    pleaseEnterEmail: "الرجاء إدخال عنوان بريد إلكتروني",
  },
  es: {
    emailDescription:
      "Recibirá un código de un solo uso de 6 dígitos por correo electrónico. Su correo electrónico se mantiene privado.",
    emailPlaceholder: "Correo electrónico",
    pleaseEnterValidEmail:
      "Por favor, ingrese una dirección de correo electrónico válida",
    pleaseEnterEmail: "Por favor, ingrese una dirección de correo electrónico",
  },
  fa: {
    emailDescription:
      "یک کد ۶ رقمی یکبار مصرف از طریق ایمیل دریافت خواهید کرد. ایمیل شما خصوصی می‌ماند.",
    emailPlaceholder: "آدرس ایمیل",
    pleaseEnterValidEmail: "لطفاً یک آدرس ایمیل معتبر وارد کنید",
    pleaseEnterEmail: "لطفاً یک آدرس ایمیل وارد کنید",
  },
  fr: {
    emailDescription:
      "Vous recevrez un code à usage unique de 6 chiffres par e-mail. Votre e-mail reste privé.",
    emailPlaceholder: "Adresse e-mail",
    pleaseEnterValidEmail: "Veuillez saisir une adresse e-mail valide",
    pleaseEnterEmail: "Veuillez saisir une adresse e-mail",
  },
  "zh-Hans": {
    emailDescription:
      "您将通过电子邮件收到一个6位一次性验证码。您的电子邮箱地址将保持私密。",
    emailPlaceholder: "电子邮箱地址",
    pleaseEnterValidEmail: "请输入有效的电子邮箱地址",
    pleaseEnterEmail: "请输入电子邮箱地址",
  },
  "zh-Hant": {
    emailDescription:
      "您將透過電子郵件收到一個6位一次性驗證碼。您的電子郵件地址將保持私密。",
    emailPlaceholder: "電子郵箱地址",
    pleaseEnterValidEmail: "請輸入有效的電子郵箱地址",
    pleaseEnterEmail: "請輸入電子郵箱地址",
  },
  he: {
    emailDescription:
      'תקבלו קוד חד-פעמי בן 6 ספרות בדוא"ל. כתובת הדוא"ל שלכם נשארת פרטית.',
    emailPlaceholder: 'כתובת דוא"ל',
    pleaseEnterValidEmail: 'אנא הזינו כתובת דוא"ל תקינה',
    pleaseEnterEmail: 'אנא הזינו כתובת דוא"ל',
  },
  ja: {
    emailDescription:
      "6桁のワンタイムコードをメールでお送りします。メールアドレスは非公開です。",
    emailPlaceholder: "メールアドレス",
    pleaseEnterValidEmail: "有効なメールアドレスを入力してください",
    pleaseEnterEmail: "メールアドレスを入力してください",
  },
  ky: {
    emailDescription:
      "Электрондук почта аркылуу 6 орундуу бир жолку код аласыз. Электрондук почта дарегиңиз купуя сакталат.",
    emailPlaceholder: "Электрондук почта дареги",
    pleaseEnterValidEmail: "Жарактуу электрондук почта дарегин киргизиңиз",
    pleaseEnterEmail: "Электрондук почта дарегин киргизиңиз",
  },
  ru: {
    emailDescription:
      "Вы получите одноразовый 6-значный код по электронной почте. Ваш адрес электронной почты остаётся конфиденциальным.",
    emailPlaceholder: "Адрес электронной почты",
    pleaseEnterValidEmail:
      "Пожалуйста, введите действительный адрес электронной почты",
    pleaseEnterEmail: "Пожалуйста, введите адрес электронной почты",
  },
};
