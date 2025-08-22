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
};
