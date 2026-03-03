import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface Step3Email2Translations {
  title: string;
  instructions: string;
  expiresIn: string;
  codeExpired: string;
  changeEmail: string;
  resendCodeIn: string;
  resendCode: string;
  pleaseEnterValidCode: string;
  verificationSuccessful: string;
  accountMerged: string;
  codeExpiredResend: string;
  wrongCodeTryAgain: string;
  syncHiccupDetected: string;
  authStateChanged: string;
  somethingWrong: string;
  tooManyAttempts: string;
}

export const step3Email2Translations: Record<
  SupportedDisplayLanguageCodes,
  Step3Email2Translations
> = {
  en: {
    title: "Enter the 6-digit code",
    instructions: "Enter the 6-digit code that we sent to",
    expiresIn: "Expires in",
    codeExpired: "Code expired",
    changeEmail: "Change Email",
    resendCodeIn: "Resend Code in",
    resendCode: "Resend Code",
    pleaseEnterValidCode: "Please enter a valid 6-digit code",
    verificationSuccessful: "Login successful!",
    accountMerged: "Success! Your accounts have been merged",
    codeExpiredResend: "Code expired—resend a new code",
    wrongCodeTryAgain: "Wrong code—try again",
    syncHiccupDetected: "Oops! Sync hiccup detected—resend a new code",
    authStateChanged:
      "Authentication state changed—please request a new code",
    somethingWrong: "Oops! Something is wrong",
    tooManyAttempts:
      "Too many attempts—please wait before requesting a new code",
  },
  ar: {
    title: "أدخل الرمز المكون من 6 أرقام",
    instructions: "أدخل الرمز المكون من 6 أرقام الذي أرسلناه إلى",
    expiresIn: "ينتهي في",
    codeExpired: "انتهت صلاحية الرمز",
    changeEmail: "تغيير البريد الإلكتروني",
    resendCodeIn: "إعادة إرسال الرمز خلال",
    resendCode: "إعادة إرسال الرمز",
    pleaseEnterValidCode: "الرجاء إدخال رمز صالح مكون من 6 أرقام",
    verificationSuccessful: "تم تسجيل الدخول بنجاح!",
    accountMerged: "نجح! تم دمج حساباتك",
    codeExpiredResend: "انتهت صلاحية الرمز - أرسل رمزاً جديداً",
    wrongCodeTryAgain: "رمز خاطئ - حاول مرة أخرى",
    syncHiccupDetected:
      "عفواً! تم اكتشاف خلل في المزامنة - أرسل رمزاً جديداً",
    authStateChanged: "تغيرت حالة المصادقة - يرجى طلب رمز جديد",
    somethingWrong: "عفواً! هناك خطأ ما",
    tooManyAttempts: "محاولات كثيرة جداً - يرجى الانتظار قبل طلب رمز جديد",
  },
  es: {
    title: "Ingrese el código de 6 dígitos",
    instructions:
      "Ingrese el código de 6 dígitos que hemos enviado a",
    expiresIn: "Expira en",
    codeExpired: "Código expirado",
    changeEmail: "Cambiar correo electrónico",
    resendCodeIn: "Reenviar código en",
    resendCode: "Reenviar código",
    pleaseEnterValidCode: "Por favor, ingrese un código válido de 6 dígitos",
    verificationSuccessful: "¡Inicio de sesión exitoso!",
    accountMerged: "¡Éxito! Sus cuentas han sido fusionadas",
    codeExpiredResend: "Código expirado—reenvíe un nuevo código",
    wrongCodeTryAgain: "Código incorrecto—intente de nuevo",
    syncHiccupDetected:
      "¡Ups! Error de sincronización detectado—reenvíe un nuevo código",
    authStateChanged:
      "El estado de autenticación cambió—solicite un nuevo código",
    somethingWrong: "¡Ups! Algo salió mal",
    tooManyAttempts:
      "Demasiados intentos—por favor, espere antes de solicitar un nuevo código",
  },
  fr: {
    title: "Entrez le code à 6 chiffres",
    instructions:
      "Entrez le code à 6 chiffres que nous avons envoyé à",
    expiresIn: "Expire dans",
    codeExpired: "Code expiré",
    changeEmail: "Changer l'e-mail",
    resendCodeIn: "Renvoyer le Code dans",
    resendCode: "Renvoyer le Code",
    pleaseEnterValidCode: "Veuillez entrer un code valide à 6 chiffres",
    verificationSuccessful: "Connexion réussie !",
    accountMerged: "Succès ! Vos comptes ont été fusionnés",
    codeExpiredResend: "Code expiré—renvoyez un nouveau code",
    wrongCodeTryAgain: "Code incorrect—réessayez",
    syncHiccupDetected:
      "Oups ! Problème de synchronisation détecté—renvoyez un nouveau code",
    authStateChanged:
      "L'état d'authentification a changé—demandez un nouveau code",
    somethingWrong: "Oups ! Quelque chose ne va pas",
    tooManyAttempts:
      "Trop de tentatives—veuillez attendre avant de demander un nouveau code",
  },
  "zh-Hans": {
    title: "输入6位验证码",
    instructions: "输入我们发送到以下地址的6位验证码",
    expiresIn: "过期时间",
    codeExpired: "验证码已过期",
    changeEmail: "更换邮箱",
    resendCodeIn: "重新发送代码",
    resendCode: "重新发送代码",
    pleaseEnterValidCode: "请输入有效的6位验证码",
    verificationSuccessful: "登录成功！",
    accountMerged: "成功！您的账户已合并",
    codeExpiredResend: "验证码已过期—重新发送一个新代码",
    wrongCodeTryAgain: "验证码错误—请重试",
    syncHiccupDetected: "哎呀！同步问题检测到—重新发送一个新代码",
    authStateChanged: "认证状态已更改—请请求新代码",
    somethingWrong: "哎呀！出错了",
    tooManyAttempts: "太多尝试—请等待重新请求一个新代码",
  },
  "zh-Hant": {
    title: "輸入6位驗證碼",
    instructions: "輸入我們發送到以下地址的6位驗證碼",
    expiresIn: "過期時間",
    codeExpired: "驗證碼已過期",
    changeEmail: "更換郵箱",
    resendCodeIn: "重新發送代碼",
    resendCode: "重新發送代碼",
    pleaseEnterValidCode: "請輸入有效的6位驗證碼",
    verificationSuccessful: "登入成功！",
    accountMerged: "成功！您的帳戶已合併",
    codeExpiredResend: "驗證碼已過期—重新發送一個新代碼",
    wrongCodeTryAgain: "驗證碼錯誤—請重試",
    syncHiccupDetected: "哎呀！同步問題檢測到—重新發送一個新代碼",
    authStateChanged: "認證狀態已更改—請請求新代碼",
    somethingWrong: "哎呀！出錯了",
    tooManyAttempts: "太多嘗試—請等待重新請求一個新代碼",
  },
  ja: {
    title: "6桁のコードを入力",
    instructions: "以下のアドレスに送信した6桁のコードを入力してください",
    expiresIn: "有効期限",
    codeExpired: "コードが期限切れです",
    changeEmail: "メールアドレスを変更",
    resendCodeIn: "コードを再送信",
    resendCode: "コードを再送信",
    pleaseEnterValidCode: "有効な6桁のコードを入力してください",
    verificationSuccessful: "ログイン成功！",
    accountMerged: "成功！アカウントが統合されました",
    codeExpiredResend: "コードが期限切れです—新しいコードを再送信",
    wrongCodeTryAgain: "コードが間違っています—もう一度試してください",
    syncHiccupDetected:
      "おっと！同期の問題が検出されました—新しいコードを再送信",
    authStateChanged:
      "認証状態が変更されました—新しいコードをリクエストしてください",
    somethingWrong: "おっと！何かが間違っています",
    tooManyAttempts:
      "試行回数が多すぎます—新しいコードを要求する前に、少し待ってください",
  },
};
