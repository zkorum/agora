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
  credentialAlreadyLinked: string;
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
    credentialAlreadyLinked: "This email address is already linked to another account",
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
    credentialAlreadyLinked:
      "عنوان البريد الإلكتروني هذا مرتبط بالفعل بحساب آخر",
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
    credentialAlreadyLinked:
      "Esta dirección de correo electrónico ya está vinculada a otra cuenta",
    authStateChanged:
      "El estado de autenticación cambió—solicite un nuevo código",
    somethingWrong: "¡Ups! Algo salió mal",
    tooManyAttempts:
      "Demasiados intentos—por favor, espere antes de solicitar un nuevo código",
  },
  fa: {
    title: "کد ۶ رقمی را وارد کنید",
    instructions: "کد ۶ رقمی ارسال شده به آدرس زیر را وارد کنید",
    expiresIn: "انقضا در",
    codeExpired: "کد منقضی شده است",
    changeEmail: "تغییر ایمیل",
    resendCodeIn: "ارسال مجدد کد در",
    resendCode: "ارسال مجدد کد",
    pleaseEnterValidCode: "لطفاً یک کد معتبر ۶ رقمی وارد کنید",
    verificationSuccessful: "ورود موفقیت‌آمیز!",
    accountMerged: "موفقیت! حساب‌های شما ادغام شدند",
    codeExpiredResend: "کد منقضی شده—کد جدید ارسال کنید",
    wrongCodeTryAgain: "کد اشتباه—دوباره تلاش کنید",
    credentialAlreadyLinked: "این آدرس ایمیل قبلاً به حساب دیگری متصل شده است",
    authStateChanged:
      "وضعیت احراز هویت تغییر کرده—لطفاً کد جدید درخواست کنید",
    somethingWrong: "متأسفیم! مشکلی پیش آمده است",
    tooManyAttempts:
      "تعداد تلاش‌ها بیش از حد—لطفاً قبل از درخواست کد جدید صبر کنید",
  },
  he: {
    title: "הזינו את הקוד בן 6 הספרות",
    instructions: "הזינו את הקוד בן 6 הספרות שנשלח אל",
    expiresIn: "פג תוקף בעוד",
    codeExpired: "הקוד פג תוקף",
    changeEmail: "שינוי אימייל",
    resendCodeIn: "שליחת קוד מחדש בעוד",
    resendCode: "שליחת קוד מחדש",
    pleaseEnterValidCode: "אנא הזינו קוד תקין בן 6 ספרות",
    verificationSuccessful: "ההתחברות הצליחה!",
    accountMerged: "הצלחה! החשבונות שלכם מוזגו",
    codeExpiredResend: "הקוד פג תוקף—שלחו קוד חדש",
    wrongCodeTryAgain: "קוד שגוי—נסו שוב",
    credentialAlreadyLinked: "כתובת אימייל זו כבר מקושרת לחשבון אחר",
    authStateChanged:
      "מצב האימות השתנה—אנא בקשו קוד חדש",
    somethingWrong: "אופס! משהו לא בסדר",
    tooManyAttempts:
      "יותר מדי ניסיונות—אנא המתינו לפני בקשת קוד חדש",
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
    credentialAlreadyLinked:
      "Cette adresse e-mail est déjà associée à un autre compte",
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
    credentialAlreadyLinked: "此电子邮箱地址已关联到另一个账户",
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
    credentialAlreadyLinked: "此電子郵箱地址已關聯到另一個帳戶",
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
    credentialAlreadyLinked:
      "このメールアドレスはすでに別のアカウントにリンクされています",
    authStateChanged:
      "認証状態が変更されました—新しいコードをリクエストしてください",
    somethingWrong: "おっと！何かが間違っています",
    tooManyAttempts:
      "試行回数が多すぎます—新しいコードを要求する前に、少し待ってください",
  },
  ky: {
    title: "6 орундуу кодду киргизиңиз",
    instructions: "Биз жөнөткөн 6 орундуу кодду киргизиңиз",
    expiresIn: "Мөөнөтү бүтөт",
    codeExpired: "Коддун мөөнөтү бүттү",
    changeEmail: "Электрондук почтаны өзгөртүү",
    resendCodeIn: "Кодду кайра жөнөтүү",
    resendCode: "Кодду кайра жөнөтүү",
    pleaseEnterValidCode: "Жарактуу 6 орундуу кодду киргизиңиз",
    verificationSuccessful: "Кирүү ийгиликтүү!",
    accountMerged: "Ийгилик! Каттоо эсептериңиз бириктирилди",
    codeExpiredResend: "Коддун мөөнөтү бүттү—жаңы код жөнөтүңүз",
    wrongCodeTryAgain: "Туура эмес код—кайра аракет кылыңыз",
    credentialAlreadyLinked:
      "Бул электрондук почта дареги башка каттоо эсебине байланышкан",
    authStateChanged:
      "Аутентификация абалы өзгөрдү—жаңы код сураңыз",
    somethingWrong: "Ой! Бир нерсе туура эмес",
    tooManyAttempts:
      "Аракеттер өтө көп—жаңы код сурадан мурун күтүңүз",
  },
  ru: {
    title: "Введите 6-значный код",
    instructions: "Введите 6-значный код, отправленный на",
    expiresIn: "Истекает через",
    codeExpired: "Код истёк",
    changeEmail: "Изменить email",
    resendCodeIn: "Повторная отправка через",
    resendCode: "Отправить код повторно",
    pleaseEnterValidCode: "Пожалуйста, введите корректный 6-значный код",
    verificationSuccessful: "Вход выполнен успешно!",
    accountMerged: "Аккаунты успешно объединены",
    codeExpiredResend: "Код истёк — отправьте новый код",
    wrongCodeTryAgain: "Неверный код — попробуйте ещё раз",
    credentialAlreadyLinked:
      "Этот адрес электронной почты уже привязан к другому аккаунту",
    authStateChanged:
      "Состояние аутентификации изменилось — запросите новый код",
    somethingWrong: "Ой! Что-то пошло не так",
    tooManyAttempts:
      "Слишком много попыток — подождите перед запросом нового кода",
  },
};
