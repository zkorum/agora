import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PhoneAuthUnavailableNoticeTranslations {
  technicalUnavailable: string;
}

export const phoneAuthUnavailableNoticeTranslations: Record<
  SupportedDisplayLanguageCodes,
  PhoneAuthUnavailableNoticeTranslations
> = {
  en: {
    technicalUnavailable:
      "Phone authentication is temporarily unavailable due to a technical issue. Please use another method and try again later.",
  },
  ar: {
    technicalUnavailable:
      "التحقق عبر الهاتف غير متاح مؤقتًا بسبب مشكلة تقنية. يرجى استخدام طريقة أخرى والمحاولة لاحقًا.",
  },
  es: {
    technicalUnavailable:
      "La autenticación por teléfono no está disponible temporalmente debido a un problema técnico. Use otro método e inténtelo más tarde.",
  },
  fa: {
    technicalUnavailable:
      "احراز هویت با تلفن به دلیل یک مشکل فنی موقتاً در دسترس نیست. لطفاً از روش دیگری استفاده کنید و بعداً دوباره تلاش کنید.",
  },
  he: {
    technicalUnavailable:
      "האימות בטלפון אינו זמין זמנית עקב בעיה טכנית. השתמשו בשיטה אחרת ונסו שוב מאוחר יותר.",
  },
  fr: {
    technicalUnavailable:
      "L’authentification par téléphone est temporairement indisponible en raison d’un problème technique. Utilisez une autre méthode et réessayez plus tard.",
  },
  "zh-Hans": {
    technicalUnavailable:
      "由于技术问题，手机验证暂时不可用。请使用其他方式并稍后重试。",
  },
  "zh-Hant": {
    technicalUnavailable:
      "由於技術問題，手機驗證暫時無法使用。請使用其他方式並稍後重試。",
  },
  ja: {
    technicalUnavailable:
      "技術的な問題により、電話番号による認証は一時的に利用できません。別の方法を使用し、後でもう一度お試しください。",
  },
  ky: {
    technicalUnavailable:
      "Техникалык көйгөйдөн улам телефон аркылуу аныктыгын текшерүү убактылуу жеткиликсиз. Башка ыкманы колдонуп, кийинчерээк кайра аракет кылыңыз.",
  },
  ru: {
    technicalUnavailable:
      "Аутентификация по телефону временно недоступна из-за технической проблемы. Используйте другой способ и повторите попытку позже.",
  },
};
