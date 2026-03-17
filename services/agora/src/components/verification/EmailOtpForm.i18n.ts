import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmailOtpFormTranslations {
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
  credentialAlreadyLinked: string;
  authStateChanged: string;
  somethingWrong: string;
  tooManyAttempts: string;
  alreadyHasCredential: string;
  unreachable: string;
  disposable: string;
}

export const emailOtpFormTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmailOtpFormTranslations
> = {
  en: {
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
    credentialAlreadyLinked: "This email address is already linked to another account",
    authStateChanged:
      "Authentication state changed—please request a new code",
    somethingWrong: "Oops! Something is wrong",
    tooManyAttempts:
      "Too many attempts—please wait before requesting a new code",
    alreadyHasCredential:
      "You already have an email address linked to your account",
    unreachable:
      "This email address doesn't seem to exist—please use a different one",
    disposable:
      "Temporary or disposable email addresses are not allowed",
  },
  ar: {
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
    credentialAlreadyLinked:
      "عنوان البريد الإلكتروني هذا مرتبط بالفعل بحساب آخر",
    authStateChanged: "تغيرت حالة المصادقة - يرجى طلب رمز جديد",
    somethingWrong: "عفواً! هناك خطأ ما",
    tooManyAttempts: "محاولات كثيرة جداً - يرجى الانتظار قبل طلب رمز جديد",
    alreadyHasCredential:
      "لديك بالفعل عنوان بريد إلكتروني مرتبط بحسابك",
    unreachable:
      "يبدو أن عنوان البريد الإلكتروني هذا غير موجود—يرجى استخدام عنوان آخر",
    disposable: "عناوين البريد الإلكتروني المؤقتة أو التي يمكن التخلص منها غير مسموح بها",
  },
  es: {
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
    credentialAlreadyLinked:
      "Esta dirección de correo electrónico ya está vinculada a otra cuenta",
    authStateChanged:
      "El estado de autenticación cambió—solicite un nuevo código",
    somethingWrong: "¡Ups! Algo salió mal",
    tooManyAttempts:
      "Demasiados intentos—por favor, espere antes de solicitar un nuevo código",
    alreadyHasCredential:
      "Ya tienes una dirección de correo electrónico vinculada a tu cuenta",
    unreachable:
      "Esta dirección de correo electrónico no parece existir—use una diferente",
    disposable:
      "No se permiten direcciones de correo electrónico temporales o desechables",
  },
  fr: {
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
    credentialAlreadyLinked:
      "Cette adresse e-mail est déjà associée à un autre compte",
    authStateChanged:
      "L'état d'authentification a changé—demandez un nouveau code",
    somethingWrong: "Oups ! Quelque chose ne va pas",
    tooManyAttempts:
      "Trop de tentatives—veuillez attendre avant de demander un nouveau code",
    alreadyHasCredential:
      "Une adresse e-mail est déjà associée à votre compte",
    unreachable:
      "Cette adresse e-mail ne semble pas exister—veuillez en utiliser une autre",
    disposable:
      "Les adresses e-mail temporaires ou jetables ne sont pas autorisées",
  },
  "zh-Hans": {
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
    credentialAlreadyLinked: "此电子邮箱地址已关联到另一个账户",
    authStateChanged: "认证状态已更改—请请求新代码",
    somethingWrong: "哎呀！出错了",
    tooManyAttempts: "太多尝试—请等待重新请求一个新代码",
    alreadyHasCredential: "您的账户已关联电子邮箱地址",
    unreachable: "此电子邮箱地址似乎不存在—请使用其他地址",
    disposable: "不允许使用临时或一次性电子邮箱地址",
  },
  "zh-Hant": {
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
    credentialAlreadyLinked: "此電子郵箱地址已關聯到另一個帳戶",
    authStateChanged: "認證狀態已更改—請請求新代碼",
    somethingWrong: "哎呀！出錯了",
    tooManyAttempts: "太多嘗試—請等待重新請求一個新代碼",
    alreadyHasCredential: "您的帳戶已關聯電子郵箱地址",
    unreachable: "此電子郵箱地址似乎不存在—請使用其他地址",
    disposable: "不允許使用臨時或一次性電子郵箱地址",
  },
  ja: {
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
    credentialAlreadyLinked:
      "このメールアドレスはすでに別のアカウントにリンクされています",
    authStateChanged:
      "認証状態が変更されました—新しいコードをリクエストしてください",
    somethingWrong: "おっと！何かが間違っています",
    tooManyAttempts:
      "試行回数が多すぎます—新しいコードを要求する前に、少し待ってください",
    alreadyHasCredential:
      "アカウントにはすでにメールアドレスがリンクされています",
    unreachable:
      "このメールアドレスは存在しないようです—別のアドレスをお使いください",
    disposable:
      "一時的または使い捨てのメールアドレスは許可されていません",
  },
  ky: {
    instructions: "Биз жөнөткөн 6 орундуу кодду киргизиңиз",
    expiresIn: "Мөөнөтү",
    codeExpired: "Коддун мөөнөтү бүттү",
    changeEmail: "Электрондук почтаны өзгөртүү",
    resendCodeIn: "Кодду кайра жөнөтүү",
    resendCode: "Кодду кайра жөнөтүү",
    pleaseEnterValidCode: "Жарактуу 6 орундуу код киргизиңиз",
    verificationSuccessful: "Кирүү ийгиликтүү!",
    accountMerged: "Ийгилик! Аккаунттарыңыз бириктирилди",
    codeExpiredResend: "Коддун мөөнөтү бүттү — жаңы код жөнөтүңүз",
    wrongCodeTryAgain: "Туура эмес код — кайра аракет кылыңыз",
    credentialAlreadyLinked:
      "Бул электрондук почта дареги башка аккаунтка мурунтан эле байланган",
    authStateChanged:
      "Аутентификация абалы өзгөрдү — жаңы код сураңыз",
    somethingWrong: "Ой! Бир нерсе туура эмес",
    tooManyAttempts:
      "Өтө көп аракет — жаңы код сурап бергенге чейин күтүңүз",
    alreadyHasCredential:
      "Аккаунтуңузга электрондук почта дареги мурунтан эле байланган",
    unreachable:
      "Бул электрондук почта дареги жок сыяктуу — башка дарек колдонуңуз",
    disposable:
      "Убактылуу же бир жолку электрондук почта даректерине уруксат берилбейт",
  },
  ru: {
    instructions: "Введите 6-значный код, отправленный на",
    expiresIn: "Истекает через",
    codeExpired: "Код истёк",
    changeEmail: "Изменить email",
    resendCodeIn: "Отправить код повторно через",
    resendCode: "Отправить код повторно",
    pleaseEnterValidCode: "Пожалуйста, введите действительный 6-значный код",
    verificationSuccessful: "Вход выполнен успешно!",
    accountMerged: "Успешно! Ваши аккаунты объединены",
    codeExpiredResend: "Код истёк — отправьте новый код",
    wrongCodeTryAgain: "Неверный код — попробуйте снова",
    credentialAlreadyLinked:
      "Этот адрес электронной почты уже привязан к другому аккаунту",
    authStateChanged:
      "Состояние аутентификации изменилось — запросите новый код",
    somethingWrong: "Ой! Что-то пошло не так",
    tooManyAttempts:
      "Слишком много попыток — подождите перед запросом нового кода",
    alreadyHasCredential:
      "К вашему аккаунту уже привязан адрес электронной почты",
    unreachable:
      "Этот адрес электронной почты, похоже, не существует — используйте другой",
    disposable:
      "Временные или одноразовые адреса электронной почты не допускаются",
  },
};
