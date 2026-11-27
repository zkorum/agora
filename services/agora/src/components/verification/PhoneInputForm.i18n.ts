import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PhoneInputFormTranslations {
  smsDescription: string;
  phoneNumberPlaceholder: string;
  developmentNumbers: string;
  pleaseEnterValidPhone: string;
  countryNotSupported: string;
  countryRegistrationUnavailable: string;
  phoneTypeNotSupported: string;
  pleaseEnterPhoneNumber: string;
}

export const phoneInputFormTranslations: Record<
  SupportedDisplayLanguageCodes,
  PhoneInputFormTranslations
> = {
  en: {
    smsDescription:
      "If this number is eligible, you'll receive a 6-digit one-time code by SMS",
    phoneNumberPlaceholder: "Phone number",
    developmentNumbers: "Development Numbers:",
    pleaseEnterValidPhone: "Please enter a valid phone number",
    countryNotSupported: "This country is not supported yet",
    countryRegistrationUnavailable:
      "Phone signup isn't available for this country. Existing phone users can log in.",
    phoneTypeNotSupported: "This phone number type is not supported",
    pleaseEnterPhoneNumber: "Please enter a phone number",
  },
  de: {
    smsDescription:
      "Wenn diese Nummer berechtigt ist, erhalten Sie einen 6-stelligen Einmalcode per SMS",
    phoneNumberPlaceholder: "Telefonnummer",
    developmentNumbers: "Entwicklungsnummern:",
    pleaseEnterValidPhone: "Bitte geben Sie eine gültige Telefonnummer ein",
    countryNotSupported: "Dieses Land wird noch nicht unterstützt",
    countryRegistrationUnavailable:
      "Die Registrierung per Telefon ist für dieses Land nicht verfügbar. Bestehende Telefonnutzer können sich anmelden.",
    phoneTypeNotSupported: "Dieser Telefonnummerntyp wird nicht unterstützt",
    pleaseEnterPhoneNumber: "Bitte geben Sie eine Telefonnummer ein",
  },
  hi: {
    smsDescription:
      "यदि यह नंबर पात्र है, तो आपको SMS द्वारा एक 6-अंकीय एक बार का कोड प्राप्त होगा",
    phoneNumberPlaceholder: "फ़ोन नंबर",
    developmentNumbers: "विकास संख्याएँ:",
    pleaseEnterValidPhone: "कृपया एक वैध फ़ोन नंबर दर्ज करें",
    countryNotSupported: "यह देश अभी समर्थित नहीं है",
    countryRegistrationUnavailable:
      "इस देश के लिए फ़ोन से पंजीकरण उपलब्ध नहीं है। मौजूदा फ़ोन उपयोगकर्ता लॉग इन कर सकते हैं।",
    phoneTypeNotSupported: "इस फ़ोन नंबर प्रकार का समर्थन नहीं किया जाता है",
    pleaseEnterPhoneNumber: "कृपया एक फ़ोन नंबर दर्ज करें",
  },
  ar: {
    smsDescription:
      "إذا كان هذا الرقم مؤهلاً، فستتلقى رمزًا مكوّنًا من 6 أرقام عبر رسالة نصية",
    phoneNumberPlaceholder: "رقم الهاتف",
    developmentNumbers: "أرقام للاختبار:",
    pleaseEnterValidPhone: "الرجاء إدخال رقم هاتف صالح",
    countryNotSupported: "هذا البلد غير مدعوم بعد",
    countryRegistrationUnavailable:
      "التسجيل برقم الهاتف غير متاح لهذا البلد. يمكن للمستخدمين الحاليين تسجيل الدخول.",
    phoneTypeNotSupported: "نوع رقم الهاتف هذا غير مدعوم",
    pleaseEnterPhoneNumber: "الرجاء إدخال رقم هاتف",
  },
  es: {
    smsDescription:
      "Si este número es elegible, recibirá un código de un solo uso de 6 dígitos por SMS",
    phoneNumberPlaceholder: "Número de teléfono",
    developmentNumbers: "Números de desarrollo:",
    pleaseEnterValidPhone: "Por favor, ingrese un número de teléfono válido",
    countryNotSupported: "Este país aún no es compatible",
    countryRegistrationUnavailable:
      "El registro por teléfono no está disponible en este país. Los usuarios existentes pueden iniciar sesión.",
    phoneTypeNotSupported: "Este tipo de número de teléfono no es compatible",
    pleaseEnterPhoneNumber: "Por favor, ingrese un número de teléfono",
  },
  fa: {
    smsDescription:
      "اگر این شماره واجد شرایط باشد، یک کد ۶ رقمی یکبار مصرف از طریق پیامک دریافت خواهید کرد",
    phoneNumberPlaceholder: "شماره تلفن",
    developmentNumbers: "شماره‌های توسعه:",
    pleaseEnterValidPhone: "لطفاً یک شماره تلفن معتبر وارد کنید",
    countryNotSupported: "این کشور هنوز پشتیبانی نمی‌شود",
    countryRegistrationUnavailable:
      "ثبت‌نام با شماره تلفن برای این کشور در دسترس نیست. کاربران فعلی می‌توانند وارد شوند.",
    phoneTypeNotSupported: "این نوع شماره تلفن پشتیبانی نمی‌شود",
    pleaseEnterPhoneNumber: "لطفاً یک شماره تلفن وارد کنید",
  },
  fr: {
    smsDescription:
      "Si ce numéro est éligible, vous recevrez un code à usage unique de 6 chiffres par SMS",
    phoneNumberPlaceholder: "Numéro de téléphone",
    developmentNumbers: "Numéros de Développement :",
    pleaseEnterValidPhone: "Veuillez saisir un numéro de téléphone valide",
    countryNotSupported: "Ce pays n'est pas encore pris en charge",
    countryRegistrationUnavailable:
      "L'inscription par téléphone n'est pas disponible pour ce pays. Les utilisateurs existants peuvent se connecter.",
    phoneTypeNotSupported:
      "Ce type de numéro de téléphone n'est pas pris en charge",
    pleaseEnterPhoneNumber: "Veuillez saisir un numéro de téléphone",
  },
  "zh-Hans": {
    smsDescription: "如果此号码符合条件，您将收到一个6位一次性验证码",
    phoneNumberPlaceholder: "手机号",
    developmentNumbers: "开发号码：",
    pleaseEnterValidPhone: "请输入有效的手机号",
    countryNotSupported: "此国家暂不支持",
    countryRegistrationUnavailable:
      "此国家暂不支持手机号注册。已有手机号用户可以登录。",
    phoneTypeNotSupported: "此手机号类型暂不支持",
    pleaseEnterPhoneNumber: "请输入手机号",
  },
  "zh-Hant": {
    smsDescription: "如果此號碼符合條件，您將收到一個6位一次性驗證碼",
    phoneNumberPlaceholder: "手機號",
    developmentNumbers: "開發號碼：",
    pleaseEnterValidPhone: "請輸入有效的手機號",
    countryNotSupported: "此國家暫不支持",
    countryRegistrationUnavailable:
      "此國家暫不支援手機號註冊。已有手機號的使用者可以登入。",
    phoneTypeNotSupported: "此手機號類型暫不支持",
    pleaseEnterPhoneNumber: "請輸入手機號",
  },
  he: {
    smsDescription: "אם המספר הזה זכאי, תקבלו קוד חד-פעמי בן 6 ספרות ב-SMS",
    phoneNumberPlaceholder: "מספר טלפון",
    developmentNumbers: "מספרי פיתוח:",
    pleaseEnterValidPhone: "אנא הזינו מספר טלפון תקין",
    countryNotSupported: "מדינה זו עדיין אינה נתמכת",
    countryRegistrationUnavailable:
      "הרשמה באמצעות טלפון אינה זמינה למדינה זו. משתמשים קיימים יכולים להתחבר.",
    phoneTypeNotSupported: "סוג מספר טלפון זה אינו נתמך",
    pleaseEnterPhoneNumber: "אנא הזינו מספר טלפון",
  },
  ja: {
    smsDescription:
      "この番号が対象の場合、6桁のワンタイムコードをSMSで受信します",
    phoneNumberPlaceholder: "携帯電話番号",
    developmentNumbers: "開発番号：",
    pleaseEnterValidPhone: "有効な電話番号を入力してください",
    countryNotSupported: "この国はまだサポートされていません",
    countryRegistrationUnavailable:
      "この国では電話番号による新規登録はできません。既存のユーザーはログインできます。",
    phoneTypeNotSupported: "この電話番号のタイプはまだサポートされていません",
    pleaseEnterPhoneNumber: "電話番号を入力してください",
  },
  ky: {
    smsDescription:
      "Бул номер талаптарга жооп берсе, SMS аркылуу 6 орундуу бир жолку код аласыз",
    phoneNumberPlaceholder: "Телефон номери",
    developmentNumbers: "Иштеп чыгуу номерлери:",
    pleaseEnterValidPhone: "Жарактуу телефон номерин киргизиңиз",
    countryNotSupported: "Бул өлкө азырынча колдоого алынбайт",
    countryRegistrationUnavailable:
      "Бул өлкө үчүн телефон аркылуу катталуу жеткиликтүү эмес. Мурда катталган колдонуучулар кире алышат.",
    phoneTypeNotSupported: "Бул телефон номеринин түрү колдоого алынбайт",
    pleaseEnterPhoneNumber: "Телефон номерин киргизиңиз",
  },
  ru: {
    smsDescription:
      "Если этот номер соответствует условиям, вы получите одноразовый 6-значный код по SMS",
    phoneNumberPlaceholder: "Номер телефона",
    developmentNumbers: "Номера для разработки:",
    pleaseEnterValidPhone: "Пожалуйста, введите действительный номер телефона",
    countryNotSupported: "Эта страна пока не поддерживается",
    countryRegistrationUnavailable:
      "Регистрация по телефону для этой страны недоступна. Существующие пользователи могут войти.",
    phoneTypeNotSupported: "Этот тип номера телефона не поддерживается",
    pleaseEnterPhoneNumber: "Пожалуйста, введите номер телефона",
  },
};
