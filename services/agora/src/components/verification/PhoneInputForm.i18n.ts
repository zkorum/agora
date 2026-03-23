import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PhoneInputFormTranslations {
  smsDescription: string;
  phoneNumberPlaceholder: string;
  developmentNumbers: string;
  pleaseEnterValidPhone: string;
  countryNotSupported: string;
  phoneTypeNotSupported: string;
  pleaseEnterPhoneNumber: string;
}

export const phoneInputFormTranslations: Record<
  SupportedDisplayLanguageCodes,
  PhoneInputFormTranslations
> = {
  en: {
    smsDescription: "You will receive a 6-digit one-time code by SMS",
    phoneNumberPlaceholder: "Phone number",
    developmentNumbers: "Development Numbers:",
    pleaseEnterValidPhone: "Please enter a valid phone number",
    countryNotSupported: "This country is not supported yet",
    phoneTypeNotSupported: "This phone number type is not supported",
    pleaseEnterPhoneNumber: "Please enter a phone number",
  },
  ar: {
    smsDescription:
      "ستتلقى رمزًا مكوّنًا من 6 أرقام لمرة واحدة عبر رسالة نصية",
    phoneNumberPlaceholder: "رقم الهاتف",
    developmentNumbers: "أرقام للاختبار:",
    pleaseEnterValidPhone: "الرجاء إدخال رقم هاتف صالح",
    countryNotSupported: "هذا البلد غير مدعوم بعد",
    phoneTypeNotSupported: "نوع رقم الهاتف هذا غير مدعوم",
    pleaseEnterPhoneNumber: "الرجاء إدخال رقم هاتف",
  },
  es: {
    smsDescription: "Recibirá un código de un solo uso de 6 dígitos por SMS",
    phoneNumberPlaceholder: "Número de teléfono",
    developmentNumbers: "Números de desarrollo:",
    pleaseEnterValidPhone: "Por favor, ingrese un número de teléfono válido",
    countryNotSupported: "Este país aún no es compatible",
    phoneTypeNotSupported: "Este tipo de número de teléfono no es compatible",
    pleaseEnterPhoneNumber: "Por favor, ingrese un número de teléfono",
  },
  fa: { smsDescription: "یک کد ۶ رقمی یکبار مصرف از طریق پیامک دریافت خواهید کرد", phoneNumberPlaceholder: "شماره تلفن", developmentNumbers: "شماره‌های توسعه:", pleaseEnterValidPhone: "لطفاً یک شماره تلفن معتبر وارد کنید", countryNotSupported: "این کشور هنوز پشتیبانی نمی‌شود", phoneTypeNotSupported: "این نوع شماره تلفن پشتیبانی نمی‌شود", pleaseEnterPhoneNumber: "لطفاً یک شماره تلفن وارد کنید" },
  fr: {
    smsDescription:
      "Vous recevrez un code à usage unique de 6 chiffres par SMS",
    phoneNumberPlaceholder: "Numéro de téléphone",
    developmentNumbers: "Numéros de Développement :",
    pleaseEnterValidPhone: "Veuillez saisir un numéro de téléphone valide",
    countryNotSupported: "Ce pays n'est pas encore pris en charge",
    phoneTypeNotSupported:
      "Ce type de numéro de téléphone n'est pas pris en charge",
    pleaseEnterPhoneNumber: "Veuillez saisir un numéro de téléphone",
  },
  "zh-Hans": {
    smsDescription: "您将收到一个6位一次性验证码",
    phoneNumberPlaceholder: "手机号",
    developmentNumbers: "开发号码：",
    pleaseEnterValidPhone: "请输入有效的手机号",
    countryNotSupported: "此国家暂不支持",
    phoneTypeNotSupported: "此手机号类型暂不支持",
    pleaseEnterPhoneNumber: "请输入手机号",
  },
  "zh-Hant": {
    smsDescription: "您將收到一個6位一次性驗證碼",
    phoneNumberPlaceholder: "手機號",
    developmentNumbers: "開發號碼：",
    pleaseEnterValidPhone: "請輸入有效的手機號",
    countryNotSupported: "此國家暫不支持",
    phoneTypeNotSupported: "此手機號類型暫不支持",
    pleaseEnterPhoneNumber: "請輸入手機號",
  },
  he: { smsDescription: "תקבלו קוד חד-פעמי בן 6 ספרות ב-SMS", phoneNumberPlaceholder: "מספר טלפון", developmentNumbers: "מספרי פיתוח:", pleaseEnterValidPhone: "אנא הזינו מספר טלפון תקין", countryNotSupported: "מדינה זו עדיין אינה נתמכת", phoneTypeNotSupported: "סוג מספר טלפון זה אינו נתמך", pleaseEnterPhoneNumber: "אנא הזינו מספר טלפון" },
  ja: {
    smsDescription: "6桁の1回限りの検証コードをSMSで受信します",
    phoneNumberPlaceholder: "携帯電話番号",
    developmentNumbers: "開発番号：",
    pleaseEnterValidPhone: "有効な電話番号を入力してください",
    countryNotSupported: "この国はまだサポートされていません",
    phoneTypeNotSupported: "この電話番号のタイプはまだサポートされていません",
    pleaseEnterPhoneNumber: "電話番号を入力してください",
  },
  ky: {
    smsDescription: "SMS аркылуу 6 орундуу бир жолку код аласыз",
    phoneNumberPlaceholder: "Телефон номери",
    developmentNumbers: "Иштеп чыгуу номерлери:",
    pleaseEnterValidPhone: "Жарактуу телефон номерин киргизиңиз",
    countryNotSupported: "Бул өлкө азырынча колдоого алынбайт",
    phoneTypeNotSupported: "Бул телефон номеринин түрү колдоого алынбайт",
    pleaseEnterPhoneNumber: "Телефон номерин киргизиңиз",
  },
  ru: {
    smsDescription: "Вы получите одноразовый 6-значный код по SMS",
    phoneNumberPlaceholder: "Номер телефона",
    developmentNumbers: "Номера для разработки:",
    pleaseEnterValidPhone: "Пожалуйста, введите действительный номер телефона",
    countryNotSupported: "Эта страна пока не поддерживается",
    phoneTypeNotSupported: "Этот тип номера телефона не поддерживается",
    pleaseEnterPhoneNumber: "Пожалуйста, введите номер телефона",
  },
};
