import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PhoneOnboardingTranslations {
  pageTitle: string;
  smsDescription: string;
  phoneNumberPlaceholder: string;
  preferPrivateLogin: string;
  preferEmailLogin: string;
  developmentNumbers: string;
  pleaseEnterValidPhone: string;
  countryNotSupported: string;
  phoneTypeNotSupported: string;
  pleaseEnterPhoneNumber: string;
  alreadyHasPhone: string;
  throttled: string;
  invalidPhoneNumber: string;
  restrictedPhoneType: string;
  credentialAlreadyLinked: string;
  somethingWrong: string;
}

export const phoneOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  PhoneOnboardingTranslations
> = {
  en: {
    pageTitle: "Verify with phone number",
    smsDescription: "You will receive a 6-digit one-time code by SMS",
    phoneNumberPlaceholder: "Phone number",
    preferPrivateLogin: "I'd prefer to login with complete privacy",
    preferEmailLogin: "I prefer to use my email address",
    developmentNumbers: "Development Numbers:",
    pleaseEnterValidPhone: "Please enter a valid phone number",
    countryNotSupported: "This country is not supported yet",
    phoneTypeNotSupported: "This phone number type is not supported",
    pleaseEnterPhoneNumber: "Please enter a phone number",
    alreadyHasPhone: "You already have a phone number linked to your account",
    throttled: "Too many attempts—please wait before trying again",
    invalidPhoneNumber:
      "Sorry, this phone number is invalid. Please check and try again.",
    restrictedPhoneType:
      "Sorry, this phone number is not supported for security reasons. Please try another.",
    credentialAlreadyLinked:
      "This phone number is already linked to another account",
    somethingWrong: "Oops! Something went wrong—please try again",
  },
  ar: {
    pageTitle: "التحقق برقم الهاتف",
    smsDescription: "ستتلقى رمزًا مكوّنًا من 6 أرقام لمرة واحدة عبر رسالة نصية",
    phoneNumberPlaceholder: "رقم الهاتف",
    preferPrivateLogin: "أفضل تسجيل الدخول بخصوصية تامة",
    preferEmailLogin: "أفضل استخدام بريدي الإلكتروني",
    developmentNumbers: "أرقام للاختبار:",
    pleaseEnterValidPhone: "الرجاء إدخال رقم هاتف صالح",
    countryNotSupported: "هذا البلد غير مدعوم بعد",
    phoneTypeNotSupported: "نوع رقم الهاتف هذا غير مدعوم",
    pleaseEnterPhoneNumber: "الرجاء إدخال رقم هاتف",
    alreadyHasPhone: "لديك بالفعل رقم هاتف مرتبط بحسابك",
    throttled: "محاولات كثيرة جداً—يرجى الانتظار قبل المحاولة مرة أخرى",
    invalidPhoneNumber:
      "عذراً، رقم الهاتف هذا غير صالح. يرجى التحقق والمحاولة مرة أخرى.",
    restrictedPhoneType:
      "عذراً، رقم الهاتف هذا غير مدعوم لأسباب أمنية. يرجى تجربة رقم آخر.",
    credentialAlreadyLinked:
      "رقم الهاتف هذا مرتبط بالفعل بحساب آخر",
    somethingWrong: "عفواً! حدث خطأ—يرجى المحاولة مرة أخرى",
  },
  es: {
    pageTitle: "Verificar con número de teléfono",
    smsDescription: "Recibirá un código de un solo uso de 6 dígitos por SMS",
    phoneNumberPlaceholder: "Número de teléfono",
    preferPrivateLogin: "Prefiero iniciar sesión con privacidad completa",
    preferEmailLogin: "Prefiero usar mi correo electrónico",
    developmentNumbers: "Números de desarrollo:",
    pleaseEnterValidPhone: "Por favor, ingrese un número de teléfono válido",
    countryNotSupported: "Este país aún no es compatible",
    phoneTypeNotSupported: "Este tipo de número de teléfono no es compatible",
    pleaseEnterPhoneNumber: "Por favor, ingrese un número de teléfono",
    alreadyHasPhone:
      "Ya tienes un número de teléfono vinculado a tu cuenta",
    throttled:
      "Demasiados intentos—por favor, espere antes de intentar de nuevo",
    invalidPhoneNumber:
      "Lo siento, este número de teléfono es inválido. Por favor, verifique e intente de nuevo.",
    restrictedPhoneType:
      "Lo siento, este número de teléfono no es compatible por razones de seguridad. Por favor, pruebe con otro.",
    credentialAlreadyLinked:
      "Este número de teléfono ya está vinculado a otra cuenta",
    somethingWrong: "¡Ups! Algo salió mal—intente de nuevo",
  },
  fr: {
    pageTitle: "Vérifier avec le numéro de téléphone",
    smsDescription:
      "Vous recevrez un code à usage unique de 6 chiffres par SMS",
    phoneNumberPlaceholder: "Numéro de téléphone",
    preferPrivateLogin: "Je préfère me connecter en toute confidentialité",
    preferEmailLogin: "Je préfère utiliser mon adresse e-mail",
    developmentNumbers: "Numéros de Développement :",
    pleaseEnterValidPhone: "Veuillez saisir un numéro de téléphone valide",
    countryNotSupported: "Ce pays n'est pas encore pris en charge",
    phoneTypeNotSupported:
      "Ce type de numéro de téléphone n'est pas pris en charge",
    pleaseEnterPhoneNumber: "Veuillez saisir un numéro de téléphone",
    alreadyHasPhone:
      "Un numéro de téléphone est déjà associé à votre compte",
    throttled:
      "Trop de tentatives—veuillez attendre avant de réessayer",
    invalidPhoneNumber:
      "Désolé, ce numéro de téléphone est invalide. Veuillez vérifier et réessayer.",
    restrictedPhoneType:
      "Désolé, ce numéro de téléphone n'est pas pris en charge pour des raisons de sécurité. Veuillez en essayer un autre.",
    credentialAlreadyLinked:
      "Ce numéro de téléphone est déjà associé à un autre compte",
    somethingWrong: "Oups ! Quelque chose a mal tourné—veuillez réessayer",
  },
  "zh-Hans": {
    pageTitle: "使用手机号验证",
    smsDescription: "您将收到一个6位一次性验证码",
    phoneNumberPlaceholder: "手机号",
    preferPrivateLogin: "我更喜欢完全私密的登录",
    preferEmailLogin: "我更想用邮箱",
    developmentNumbers: "开发号码：",
    pleaseEnterValidPhone: "请输入有效的手机号",
    countryNotSupported: "此国家暂不支持",
    phoneTypeNotSupported: "此手机号类型暂不支持",
    pleaseEnterPhoneNumber: "请输入手机号",
    alreadyHasPhone: "您的账户已关联手机号码",
    throttled: "尝试次数过多—请稍后再试",
    invalidPhoneNumber: "抱歉，这个手机号无效。请检查并重试。",
    restrictedPhoneType: "抱歉，这个手机号因安全原因不支持。请尝试其他号码。",
    credentialAlreadyLinked: "此手机号码已关联到另一个账户",
    somethingWrong: "哎呀！出错了—请重试",
  },
  "zh-Hant": {
    pageTitle: "使用手機號驗證",
    smsDescription: "您將收到一個6位一次性驗證碼",
    phoneNumberPlaceholder: "手機號",
    preferPrivateLogin: "我更喜歡完全私密的登入",
    preferEmailLogin: "我更想用郵箱",
    developmentNumbers: "開發號碼：",
    pleaseEnterValidPhone: "請輸入有效的手機號",
    countryNotSupported: "此國家暫不支持",
    phoneTypeNotSupported: "此手機號類型暫不支持",
    pleaseEnterPhoneNumber: "請輸入手機號",
    alreadyHasPhone: "您的帳戶已關聯手機號碼",
    throttled: "嘗試次數過多—請稍後再試",
    invalidPhoneNumber: "抱歉，這個手機號無效。請檢查後重試。",
    restrictedPhoneType: "抱歉，這個手機號因安全原因不支持。請嘗試其他號碼。",
    credentialAlreadyLinked: "此手機號碼已關聯到另一個帳戶",
    somethingWrong: "哎呀！出錯了—請重試",
  },
  ja: {
    pageTitle: "携帯電話で検証",
    smsDescription: "6桁の1回限りの検証コードをSMSで受信します",
    phoneNumberPlaceholder: "携帯電話番号",
    preferPrivateLogin: "完全なプライバシーでログインしたい",
    preferEmailLogin: "メールアドレスを使いたい",
    developmentNumbers: "開発番号：",
    pleaseEnterValidPhone: "有効な電話番号を入力してください",
    countryNotSupported: "この国はまだサポートされていません",
    phoneTypeNotSupported: "この電話番号のタイプはまだサポートされていません",
    pleaseEnterPhoneNumber: "電話番号を入力してください",
    alreadyHasPhone: "アカウントにはすでに電話番号がリンクされています",
    throttled: "試行回数が多すぎます—もう一度試す前にお待ちください",
    invalidPhoneNumber:
      "申し訳ありませんが、この電話番号は無効です。確認してからもう一度試してください。",
    restrictedPhoneType:
      "申し訳ありませんが、この電話番号はセキュリティ上の理由でサポートされていません。別の番号を試してください。",
    credentialAlreadyLinked:
      "この電話番号はすでに別のアカウントにリンクされています",
    somethingWrong: "おっと！何かが間違っています—もう一度お試しください",
  },
};
