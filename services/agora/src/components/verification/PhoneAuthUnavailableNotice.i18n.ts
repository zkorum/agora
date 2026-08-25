import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PhoneAuthUnavailableNoticeTranslations {
  technicalUnavailable: string;
  registrationUnavailable: string;
}

export const phoneAuthUnavailableNoticeTranslations: Record<
  SupportedDisplayLanguageCodes,
  PhoneAuthUnavailableNoticeTranslations
> = {
  en: {
    technicalUnavailable:
      "Phone authentication is temporarily unavailable due to a technical issue. Please use another method and try again later.",
    registrationUnavailable:
      "Phone registration is currently unavailable. If you already have an account with a phone number, you can still log in.",
  },
  ar: {
    technicalUnavailable:
      "التحقق عبر الهاتف غير متاح مؤقتًا بسبب مشكلة تقنية. يرجى استخدام طريقة أخرى والمحاولة لاحقًا.",
    registrationUnavailable:
      "التسجيل بالهاتف غير متاح حاليًا. إذا كان لديك حساب مرتبط برقم هاتف، فلا يزال بإمكانك تسجيل الدخول.",
  },
  es: {
    technicalUnavailable:
      "La autenticación por teléfono no está disponible temporalmente debido a un problema técnico. Use otro método e inténtelo más tarde.",
    registrationUnavailable:
      "El registro por teléfono no está disponible actualmente. Si ya tiene una cuenta con un número de teléfono, aún puede iniciar sesión.",
  },
  fa: {
    technicalUnavailable:
      "احراز هویت با تلفن به دلیل یک مشکل فنی موقتاً در دسترس نیست. لطفاً از روش دیگری استفاده کنید و بعداً دوباره تلاش کنید.",
    registrationUnavailable:
      "ثبت‌نام با تلفن در حال حاضر در دسترس نیست. اگر از قبل حسابی با شماره تلفن دارید، همچنان می‌توانید وارد شوید.",
  },
  he: {
    technicalUnavailable:
      "האימות בטלפון אינו זמין זמנית עקב בעיה טכנית. השתמשו בשיטה אחרת ונסו שוב מאוחר יותר.",
    registrationUnavailable:
      "הרשמה בטלפון אינה זמינה כרגע. אם כבר יש לכם חשבון עם מספר טלפון, עדיין ניתן להתחבר.",
  },
  fr: {
    technicalUnavailable:
      "L’authentification par téléphone est temporairement indisponible en raison d’un problème technique. Utilisez une autre méthode et réessayez plus tard.",
    registrationUnavailable:
      "L’inscription par téléphone est actuellement indisponible. Si vous avez déjà un compte associé à un numéro de téléphone, vous pouvez toujours vous connecter.",
  },
  "zh-Hans": {
    technicalUnavailable:
      "由于技术问题，手机验证暂时不可用。请使用其他方式并稍后重试。",
    registrationUnavailable:
      "手机注册目前不可用。如果您已有绑定手机号的账户，仍可登录。",
  },
  "zh-Hant": {
    technicalUnavailable:
      "由於技術問題，手機驗證暫時無法使用。請使用其他方式並稍後重試。",
    registrationUnavailable:
      "手機註冊目前無法使用。如果您已有綁定手機號碼的帳戶，仍可登入。",
  },
  ja: {
    technicalUnavailable:
      "技術的な問題により、電話番号による認証は一時的に利用できません。別の方法を使用し、後でもう一度お試しください。",
    registrationUnavailable:
      "電話番号での登録は現在利用できません。電話番号に紐づくアカウントをお持ちの場合は、引き続きログインできます。",
  },
  ky: {
    technicalUnavailable:
      "Техникалык көйгөйдөн улам телефон аркылуу аныктыгын текшерүү убактылуу жеткиликсиз. Башка ыкманы колдонуп, кийинчерээк кайра аракет кылыңыз.",
    registrationUnavailable:
      "Телефон менен катталуу учурда жеткиликсиз. Телефон номери байланышкан аккаунтуңуз бар болсо, дагы эле кире аласыз.",
  },
  ru: {
    technicalUnavailable:
      "Аутентификация по телефону временно недоступна из-за технической проблемы. Используйте другой способ и повторите попытку позже.",
    registrationUnavailable:
      "Регистрация по телефону сейчас недоступна. Если у вас уже есть аккаунт с номером телефона, вы по-прежнему можете войти.",
  },
};
