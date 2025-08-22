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
  [key: string]: string; // Required for Record<string, string> constraint
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
      title: "Ingresa el código de 6 dígitos",
      instructions:
        "Ingresa el código de 6 dígitos que hemos enviado al número de teléfono",
      expiresIn: "Expira en",
      codeExpired: "Código expirado",
      changeNumber: "Cambiar Número",
      resendCodeIn: "Reenviar Código en",
      resendCode: "Reenviar Código",
      pleaseEnterValidCode: "Por favor ingresa un código válido de 6 dígitos",
      verificationSuccessful: "Verificación exitosa 🎉",
      codeExpiredResend: "Código expirado—reenvía un nuevo código",
      wrongCodeTryAgain: "Código incorrecto—intenta de nuevo",
      syncHiccupDetected:
        "¡Ups! Error de sincronización detectado—reenvía un nuevo código",
      somethingWrong: "¡Ups! Algo está mal",
      tooManyAttempts:
        "Demasiados intentos—por favor espera antes de solicitar un nuevo código",
      invalidPhoneNumber:
        "Lo siento, este número de teléfono es inválido. Por favor verifica e intenta de nuevo.",
      restrictedPhoneType:
        "Lo siento, este número de teléfono no es compatible por razones de seguridad. Por favor prueba con otro.",
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
