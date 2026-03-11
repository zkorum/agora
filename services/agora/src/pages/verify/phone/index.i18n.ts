import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyPhoneTranslations {
  title: string;
  alreadyHasPhone: string;
  throttled: string;
  invalidPhoneNumber: string;
  restrictedPhoneType: string;
  credentialAlreadyLinked: string;
  somethingWrong: string;
}

export const verifyPhoneTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyPhoneTranslations
> = {
  en: {
    title: "Verify Phone",
    alreadyHasPhone: "You already have a phone number linked to your account",
    throttled: "Too many attempts—please wait before trying again",
    invalidPhoneNumber:
      "Sorry, this phone number is invalid. Please check and try again.",
    restrictedPhoneType:
      "Sorry, this phone number is not supported for security reasons. Please try another.",
    credentialAlreadyLinked:
      "This phone number is already linked to another account",
    somethingWrong: "Oops! Something went wrong—please try again",
  },
  ar: {
    title: "التحقق من الهاتف",
    alreadyHasPhone: "لديك بالفعل رقم هاتف مرتبط بحسابك",
    throttled: "محاولات كثيرة جداً—يرجى الانتظار قبل المحاولة مرة أخرى",
    invalidPhoneNumber:
      "عذراً، رقم الهاتف هذا غير صالح. يرجى التحقق والمحاولة مرة أخرى.",
    restrictedPhoneType:
      "عذراً، رقم الهاتف هذا غير مدعوم لأسباب أمنية. يرجى تجربة رقم آخر.",
    credentialAlreadyLinked:
      "رقم الهاتف هذا مرتبط بالفعل بحساب آخر",
    somethingWrong: "عفواً! حدث خطأ—يرجى المحاولة مرة أخرى",
  },
  es: {
    title: "Verificar teléfono",
    alreadyHasPhone:
      "Ya tienes un número de teléfono vinculado a tu cuenta",
    throttled:
      "Demasiados intentos—por favor, espere antes de intentar de nuevo",
    invalidPhoneNumber:
      "Lo siento, este número de teléfono es inválido. Por favor, verifique e intente de nuevo.",
    restrictedPhoneType:
      "Lo siento, este número de teléfono no es compatible por razones de seguridad. Por favor, pruebe con otro.",
    credentialAlreadyLinked:
      "Este número de teléfono ya está vinculado a otra cuenta",
    somethingWrong: "¡Ups! Algo salió mal—intente de nuevo",
  },
  fr: {
    title: "Vérifier le téléphone",
    alreadyHasPhone:
      "Un numéro de téléphone est déjà associé à votre compte",
    throttled:
      "Trop de tentatives—veuillez attendre avant de réessayer",
    invalidPhoneNumber:
      "Désolé, ce numéro de téléphone est invalide. Veuillez vérifier et réessayer.",
    restrictedPhoneType:
      "Désolé, ce numéro de téléphone n'est pas pris en charge pour des raisons de sécurité. Veuillez en essayer un autre.",
    credentialAlreadyLinked:
      "Ce numéro de téléphone est déjà associé à un autre compte",
    somethingWrong: "Oups ! Quelque chose a mal tourné—veuillez réessayer",
  },
  "zh-Hans": {
    title: "验证手机",
    alreadyHasPhone: "您的账户已关联手机号码",
    throttled: "尝试次数过多—请稍后再试",
    invalidPhoneNumber: "抱歉，这个手机号无效。请检查并重试。",
    restrictedPhoneType: "抱歉，这个手机号因安全原因不支持。请尝试其他号码。",
    credentialAlreadyLinked: "此手机号码已关联到另一个账户",
    somethingWrong: "哎呀！出错了—请重试",
  },
  "zh-Hant": {
    title: "驗證手機",
    alreadyHasPhone: "您的帳戶已關聯手機號碼",
    throttled: "嘗試次數過多—請稍後再試",
    invalidPhoneNumber: "抱歉，這個手機號無效。請檢查後重試。",
    restrictedPhoneType: "抱歉，這個手機號因安全原因不支持。請嘗試其他號碼。",
    credentialAlreadyLinked: "此手機號碼已關聯到另一個帳戶",
    somethingWrong: "哎呀！出錯了—請重試",
  },
  ja: {
    title: "電話確認",
    alreadyHasPhone: "アカウントにはすでに電話番号がリンクされています",
    throttled: "試行回数が多すぎます—もう一度試す前にお待ちください",
    invalidPhoneNumber:
      "申し訳ありませんが、この電話番号は無効です。確認してからもう一度試してください。",
    restrictedPhoneType:
      "申し訳ありませんが、この電話番号はセキュリティ上の理由でサポートされていません。別の番号を試してください。",
    credentialAlreadyLinked:
      "この電話番号はすでに別のアカウントにリンクされています",
    somethingWrong: "おっと！何かが間違っています—もう一度お試しください",
  },
};
