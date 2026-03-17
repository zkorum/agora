import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

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
  accountMerged: string;
  codeExpiredResend: string;
  wrongCodeTryAgain: string;
  credentialAlreadyLinked: string;
  authStateChanged: string;
  somethingWrong: string;
  tooManyAttempts: string;
  invalidPhoneNumber: string;
  restrictedPhoneType: string;
}

export const step3Phone2Translations: Record<SupportedDisplayLanguageCodes, Step3Phone2Translations> =
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
      accountMerged: "Success! Your accounts have been merged 🎉",
      codeExpiredResend: "Code expired—resend a new code",
      wrongCodeTryAgain: "Wrong code—try again",
      credentialAlreadyLinked: "This phone number is already linked to another account",
      authStateChanged: "Authentication state changed—please request a new code",
      somethingWrong: "Oops! Something is wrong",
      tooManyAttempts:
        "Too many attempts—please wait before requesting a new code",
      invalidPhoneNumber:
        "Sorry, this phone number is invalid. Please check and try again.",
      restrictedPhoneType:
        "Sorry, this phone number is not supported for security reasons. Please try another.",
    },
    ar: {
      title: "أدخل الرمز المكون من 6 أرقام",
      instructions: "أدخل الرمز المكون من 6 أرقام الذي أرسلناه عبر رقم الهاتف",
      expiresIn: "ينتهي في",
      codeExpired: "انتهت صلاحية الرمز",
      changeNumber: "تغيير الرقم",
      resendCodeIn: "إعادة إرسال الرمز خلال",
      resendCode: "إعادة إرسال الرمز",
      pleaseEnterValidCode: "الرجاء إدخال رمز صالح مكون من 6 أرقام",
      verificationSuccessful: "تم التحقق بنجاح 🎉",
      accountMerged: "نجح! تم دمج حساباتك 🎉",
      codeExpiredResend: "انتهت صلاحية الرمز - أرسل رمزاً جديداً",
      wrongCodeTryAgain: "رمز خاطئ - حاول مرة أخرى",
      credentialAlreadyLinked:
        "رقم الهاتف هذا مرتبط بالفعل بحساب آخر",
      authStateChanged: "تغيرت حالة المصادقة - يرجى طلب رمز جديد",
      somethingWrong: "عفواً! هناك خطأ ما",
      tooManyAttempts: "محاولات كثيرة جداً - يرجى الانتظار قبل طلب رمز جديد",
      invalidPhoneNumber:
        "عذراً، رقم الهاتف هذا غير صالح. يرجى التحقق والمحاولة مرة أخرى.",
      restrictedPhoneType:
        "عذراً، رقم الهاتف هذا غير مدعوم لأسباب أمنية. يرجى تجربة رقم آخر.",
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
      accountMerged: "¡Éxito! Sus cuentas han sido fusionadas 🎉",
      codeExpiredResend: "Código expirado—reenvíe un nuevo código",
      wrongCodeTryAgain: "Código incorrecto—intente de nuevo",
      credentialAlreadyLinked:
        "Este número de teléfono ya está vinculado a otra cuenta",
      authStateChanged: "El estado de autenticación cambió—solicite un nuevo código",
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
      accountMerged: "Succès ! Vos comptes ont été fusionnés 🎉",
      codeExpiredResend: "Code expiré—renvoyez un nouveau code",
      wrongCodeTryAgain: "Code incorrect—réessayez",
      credentialAlreadyLinked:
        "Ce numéro de téléphone est déjà associé à un autre compte",
      authStateChanged: "L'état d'authentification a changé—demandez un nouveau code",
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
      accountMerged: "成功！您的账户已合并 🎉",
      codeExpiredResend: "验证码已过期—重新发送一个新代码",
      wrongCodeTryAgain: "验证码错误—请重试",
      credentialAlreadyLinked: "此手机号码已关联到另一个账户",
      authStateChanged: "认证状态已更改—请请求新代码",
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
      accountMerged: "成功！您的帳戶已合併 🎉",
      codeExpiredResend: "驗證碼已過期—重新發送一個新代碼",
      wrongCodeTryAgain: "驗證碼錯誤—請重試",
      credentialAlreadyLinked: "此手機號碼已關聯到另一個帳戶",
      authStateChanged: "認證狀態已更改—請請求新代碼",
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
      accountMerged: "成功！アカウントが統合されました 🎉",
      codeExpiredResend: "コードが期限切れです—新しいコードを再送信",
      wrongCodeTryAgain: "コードが間違っています—もう一度試してください",
      credentialAlreadyLinked:
        "この電話番号はすでに別のアカウントにリンクされています",
      authStateChanged: "認証状態が変更されました—新しいコードをリクエストしてください",
      somethingWrong: "おっと！何かが間違っています",
      tooManyAttempts:
        "試行回数が多すぎます—新しいコードを要求する前に、少し待ってください",
      invalidPhoneNumber:
        "申し訳ありませんが、この電話番号は無効です。確認してからもう一度試してください。",
      restrictedPhoneType:
        "申し訳ありませんが、この電話番号はセキュリティ上の理由でサポートされていません。別の番号を試してください。",
    },
  fa: {
      title: "کد ۶ رقمی را وارد کنید",
      instructions: "کد ۶ رقمی ارسال شده به شماره تلفن را وارد کنید",
      expiresIn: "انقضا در",
      codeExpired: "کد منقضی شد",
      changeNumber: "تغییر شماره",
      resendCodeIn: "ارسال مجدد کد در",
      resendCode: "ارسال مجدد کد",
      pleaseEnterValidCode: "لطفاً کد ۶ رقمی معتبر وارد کنید",
      verificationSuccessful: "تأیید موفقیت‌آمیز بود 🎉",
      accountMerged: "موفقیت! حساب‌های شما ادغام شد 🎉",
      codeExpiredResend: "کد منقضی شد — کد جدید ارسال کنید",
      wrongCodeTryAgain: "کد اشتباه است — دوباره امتحان کنید",
      syncHiccupDetected: "مشکلی در همگام‌سازی پیش آمد — کد جدید ارسال کنید",
      authStateChanged: "وضعیت احراز هویت تغییر کرد — لطفاً کد جدید درخواست کنید",
      somethingWrong: "مشکلی پیش آمد",
      tooManyAttempts:
        "تلاش‌های بیش از حد — لطفاً قبل از درخواست کد جدید صبر کنید",
      invalidPhoneNumber:
        "متأسفانه این شماره تلفن نامعتبر است. لطفاً بررسی کرده و دوباره امتحان کنید.",
      restrictedPhoneType:
        "متأسفانه این شماره تلفن به دلایل امنیتی پشتیبانی نمی‌شود. لطفاً شماره دیگری امتحان کنید.",
    ky: {
      title: "6 орундуу кодду киргизиңиз",
      instructions: "Телефон номериңизге жөнөтүлгөн 6 орундуу кодду киргизиңиз",
      expiresIn: "Мөөнөтү бүтөт",
      codeExpired: "Коддун мөөнөтү бүттү",
      changeNumber: "Номерди өзгөртүү",
      resendCodeIn: "Кодду кайра жөнөтүү",
      resendCode: "Кодду кайра жөнөтүү",
      pleaseEnterValidCode: "Жарактуу 6 орундуу кодду киргизиңиз",
      verificationSuccessful: "Текшерүү ийгиликтүү 🎉",
      accountMerged: "Ийгилик! Каттоо эсептериңиз бириктирилди 🎉",
      codeExpiredResend: "Коддун мөөнөтү бүттү—жаңы код жөнөтүңүз",
      wrongCodeTryAgain: "Туура эмес код—кайра аракет кылыңыз",
      credentialAlreadyLinked:
        "Бул телефон номери башка каттоо эсебине байланышкан",
      authStateChanged: "Аутентификация абалы өзгөрдү—жаңы код сураңыз",
      somethingWrong: "Ой! Бир нерсе туура эмес",
      tooManyAttempts:
        "Аракеттер өтө көп—жаңы код сурадан мурун күтүңүз",
      invalidPhoneNumber:
        "Кечиресиз, бул телефон номери жараксыз. Текшерип, кайра аракет кылыңыз.",
      restrictedPhoneType:
        "Кечиресиз, бул телефон номери коопсуздук себептеринен колдоого алынбайт. Башка номерди колдонуңуз.",
    },
    ru: {
      title: "Введите 6-значный код",
      instructions: "Введите 6-значный код, отправленный на номер телефона",
      expiresIn: "Истекает через",
      codeExpired: "Код истёк",
      changeNumber: "Изменить номер",
      resendCodeIn: "Повторная отправка через",
      resendCode: "Отправить код повторно",
      pleaseEnterValidCode: "Пожалуйста, введите корректный 6-значный код",
      verificationSuccessful: "Верификация прошла успешно 🎉",
      accountMerged: "Аккаунты успешно объединены 🎉",
      codeExpiredResend: "Код истёк — отправьте новый код",
      wrongCodeTryAgain: "Неверный код — попробуйте ещё раз",
      credentialAlreadyLinked:
        "Этот номер телефона уже привязан к другому аккаунту",
      authStateChanged: "Состояние аутентификации изменилось — запросите новый код",
      somethingWrong: "Ой! Что-то пошло не так",
      tooManyAttempts:
        "Слишком много попыток — подождите перед запросом нового кода",
      invalidPhoneNumber:
        "Извините, этот номер телефона недействителен. Проверьте и попробуйте снова.",
      restrictedPhoneType:
        "Извините, этот номер телефона не поддерживается по соображениям безопасности. Попробуйте другой.",
    },
  };
