export interface Step3Phone2Translations {
  title: string;
  instructions: string;
  expiresIn: string;
  codeExpired: string;
  changeNumber: string;
  resendCodeIn: string;
  resendCode: string;
  pleaseEnterValidCode: string;
  verificationSuccessful: string;
  codeExpiredResend: string;
  wrongCodeTryAgain: string;
  syncHiccupDetected: string;
  somethingWrong: string;
  tooManyAttempts: string;
  invalidPhoneNumber: string;
  restrictedPhoneType: string;
}

export const step3Phone2Translations: Record<string, Step3Phone2Translations> =
  {
    en: {
      title: "Enter the 6-digit code",
      instructions: "Enter the 6-digit that we have sent via the phone number",
      expiresIn: "Expires in",
      codeExpired: "Code expired",
      changeNumber: "Change Number",
      resendCodeIn: "Resend Code in",
      resendCode: "Resend Code",
      pleaseEnterValidCode: "Please enter a valid 6-digit code",
      verificationSuccessful: "Verification successful 🎉",
      codeExpiredResend: "Code expired—resend a new code",
      wrongCodeTryAgain: "Wrong code—try again",
      syncHiccupDetected: "Oops! Sync hiccup detected—resend a new code",
      somethingWrong: "Oops! Something is wrong",
      tooManyAttempts:
        "Too many attempts—please wait before requesting a new code",
      invalidPhoneNumber:
        "Sorry, this phone number is invalid. Please check and try again.",
      restrictedPhoneType:
        "Sorry, this phone number is not supported for security reasons. Please try another.",
    },
    es: {
      title: "Ingrese el código de 6 dígitos",
      instructions:
        "Ingrese el código de 6 dígitos que hemos enviado a su número de teléfono",
      expiresIn: "Expira en",
      codeExpired: "Código expirado",
      changeNumber: "Cambiar número",
      resendCodeIn: "Reenviar código en",
      resendCode: "Reenviar código",
      pleaseEnterValidCode: "Por favor, ingrese un código válido de 6 dígitos",
      verificationSuccessful: "Verificación exitosa 🎉",
      codeExpiredResend: "Código expirado—reenvíe un nuevo código",
      wrongCodeTryAgain: "Código incorrecto—intente de nuevo",
      syncHiccupDetected:
        "¡Ups! Error de sincronización detectado—reenvíe un nuevo código",
      somethingWrong: "¡Ups! Algo salió mal",
      tooManyAttempts:
        "Demasiados intentos—por favor, espere antes de solicitar un nuevo código",
      invalidPhoneNumber:
        "Lo siento, este número de teléfono es inválido. Por favor, verifique e intente de nuevo.",
      restrictedPhoneType:
        "Lo siento, este número de teléfono no es compatible por razones de seguridad. Por favor, pruebe con otro.",
    },
    fr: {
      title: "Entrez le code à 6 chiffres",
      instructions:
        "Entrez le code à 6 chiffres que nous avons envoyé au numéro de téléphone",
      expiresIn: "Expire dans",
      codeExpired: "Code expiré",
      changeNumber: "Changer le Numéro",
      resendCodeIn: "Renvoyer le Code dans",
      resendCode: "Renvoyer le Code",
      pleaseEnterValidCode: "Veuillez entrer un code valide à 6 chiffres",
      verificationSuccessful: "Vérification réussie 🎉",
      codeExpiredResend: "Code expiré—renvoyez un nouveau code",
      wrongCodeTryAgain: "Code incorrect—réessayez",
      syncHiccupDetected:
        "Oups ! Problème de synchronisation détecté—renvoyez un nouveau code",
      somethingWrong: "Oups ! Quelque chose ne va pas",
      tooManyAttempts:
        "Trop de tentatives—veuillez attendre avant de demander un nouveau code",
      invalidPhoneNumber:
        "Désolé, ce numéro de téléphone est invalide. Veuillez vérifier et réessayer.",
      restrictedPhoneType:
        "Désolé, ce numéro de téléphone n'est pas pris en charge pour des raisons de sécurité. Veuillez en essayer un autre.",
    },
  };
