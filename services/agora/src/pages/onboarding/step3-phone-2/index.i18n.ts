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
    "zh-Hans": {
      title: "输入6位验证码",
      instructions: "输入我们通过手机号发送的6位验证码",
      expiresIn: "过期时间",
      codeExpired: "验证码已过期",
      changeNumber: "更换号码",
      resendCodeIn: "重新发送代码",
      resendCode: "重新发送代码",
      pleaseEnterValidCode: "请输入有效的6位验证码",
      verificationSuccessful: "验证成功 🎉",
      codeExpiredResend: "验证码已过期—重新发送一个新代码",
      wrongCodeTryAgain: "验证码错误—请重试",
      syncHiccupDetected: "哎呀！同步问题检测到—重新发送一个新代码",
      somethingWrong: "哎呀！出错了",
      tooManyAttempts: "太多尝试—请等待重新请求一个新代码",
      invalidPhoneNumber: "抱歉，这个手机号无效。请检查并重试。",
      restrictedPhoneType: "抱歉，这个手机号因安全原因不支持。请尝试其他号码。",
    },
    "zh-Hant": {
      title: "輸入6位驗證碼",
      instructions: "輸入我們通過手機號發送的6位驗證碼",
      expiresIn: "過期時間",
      codeExpired: "驗證碼已過期",
      changeNumber: "更換號碼",
      resendCodeIn: "重新發送代碼",
      resendCode: "重新發送代碼",
      pleaseEnterValidCode: "請輸入有效的6位驗證碼",
      verificationSuccessful: "驗證成功 🎉",
      codeExpiredResend: "驗證碼已過期—重新發送一個新代碼",
      wrongCodeTryAgain: "驗證碼錯誤—請重試",
      syncHiccupDetected: "哎呀！同步問題檢測到—重新發送一個新代碼",
      somethingWrong: "哎呀！出錯了",
      tooManyAttempts: "太多嘗試—請等待重新請求一個新代碼",
      invalidPhoneNumber: "抱歉，這個手機號無效。請檢查並重試。",
      restrictedPhoneType: "抱歉，這個手機號因安全原因不支持。請嘗試其他號碼。",
    },
    ja: {
      title: "6桁のコードを入力",
      instructions: "携帯電話番号に送信された6桁のコードを入力してください",
      expiresIn: "有効期限",
      codeExpired: "コードが期限切れです",
      changeNumber: "番号を変更",
      resendCodeIn: "コードを再送信",
      resendCode: "コードを再送信",
      pleaseEnterValidCode: "有効な6桁のコードを入力してください",
      verificationSuccessful: "検証成功 🎉",
      codeExpiredResend: "コードが期限切れです—新しいコードを再送信",
      wrongCodeTryAgain: "コードが間違っています—もう一度試してください",
      syncHiccupDetected:
        "おっと！同期の問題が検出されました—新しいコードを再送信",
      somethingWrong: "おっと！何かが間違っています",
      tooManyAttempts:
        "試行回数が多すぎます—新しいコードを要求する前に、少し待ってください",
      invalidPhoneNumber:
        "申し訳ありませんが、この電話番号は無効です。確認してからもう一度試してください。",
      restrictedPhoneType:
        "申し訳ありませんが、この電話番号はセキュリティ上の理由でサポートされていません。別の番号を試してください。",
    },
  };
