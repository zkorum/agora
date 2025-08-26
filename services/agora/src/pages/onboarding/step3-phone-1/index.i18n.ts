import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PhoneOnboardingTranslations {
  pageTitle: string;
  smsDescription: string;
  phoneNumberPlaceholder: string;
  preferPrivateLogin: string;
  developmentNumbers: string;
  pleaseEnterValidPhone: string;
  countryNotSupported: string;
  phoneTypeNotSupported: string;
  pleaseEnterPhoneNumber: string;
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
    developmentNumbers: "Development Numbers:",
    pleaseEnterValidPhone: "Please enter a valid phone number",
    countryNotSupported: "This country is not supported yet",
    phoneTypeNotSupported: "This phone number type is not supported",
    pleaseEnterPhoneNumber: "Please enter a phone number",
  },
  es: {
    pageTitle: "Verificar con número de teléfono",
    smsDescription: "Recibirá un código de un solo uso de 6 dígitos por SMS",
    phoneNumberPlaceholder: "Número de teléfono",
    preferPrivateLogin: "Prefiero iniciar sesión con privacidad completa",
    developmentNumbers: "Números de desarrollo:",
    pleaseEnterValidPhone: "Por favor, ingrese un número de teléfono válido",
    countryNotSupported: "Este país aún no es compatible",
    phoneTypeNotSupported: "Este tipo de número de teléfono no es compatible",
    pleaseEnterPhoneNumber: "Por favor, ingrese un número de teléfono",
  },
  fr: {
    pageTitle: "Vérifier avec le numéro de téléphone",
    smsDescription:
      "Vous recevrez un code à usage unique de 6 chiffres par SMS",
    phoneNumberPlaceholder: "Numéro de téléphone",
    preferPrivateLogin: "Je préfère me connecter en toute confidentialité",
    developmentNumbers: "Numéros de Développement :",
    pleaseEnterValidPhone: "Veuillez saisir un numéro de téléphone valide",
    countryNotSupported: "Ce pays n'est pas encore pris en charge",
    phoneTypeNotSupported:
      "Ce type de numéro de téléphone n'est pas pris en charge",
    pleaseEnterPhoneNumber: "Veuillez saisir un numéro de téléphone",
  },
  "zh-Hans": {
    pageTitle: "使用手机号验证",
    smsDescription: "您将收到一个6位一次性验证码",
    phoneNumberPlaceholder: "手机号",
    preferPrivateLogin: "我更喜欢完全私密的登录",
    developmentNumbers: "开发号码：",
    pleaseEnterValidPhone: "请输入有效的手机号",
    countryNotSupported: "此国家暂不支持",
    phoneTypeNotSupported: "此手机号类型暂不支持",
    pleaseEnterPhoneNumber: "请输入手机号",
  },
  "zh-Hant": {
    pageTitle: "使用手機號驗證",
    smsDescription: "您將收到一個6位一次性驗證碼",
    phoneNumberPlaceholder: "手機號",
    preferPrivateLogin: "我更喜歡完全私密的登入",
    developmentNumbers: "開發號碼：",
    pleaseEnterValidPhone: "請輸入有效的手機號",
    countryNotSupported: "此國家暫不支持",
    phoneTypeNotSupported: "此手機號類型暫不支持",
    pleaseEnterPhoneNumber: "請輸入手機號",
  },
  ja: {
    pageTitle: "携帯電話で検証",
    smsDescription: "6桁の1回限りの検証コードをSMSで受信します",
    phoneNumberPlaceholder: "携帯電話番号",
    preferPrivateLogin: "完全にプライベートなログインが好みです",
    developmentNumbers: "開発番号：",
    pleaseEnterValidPhone: "請輸入有效的手機號",
    countryNotSupported: "此國家暫不支持",
    phoneTypeNotSupported: "此手機號類型暫不支持",
    pleaseEnterPhoneNumber: "請輸入手機號",
  },
};
