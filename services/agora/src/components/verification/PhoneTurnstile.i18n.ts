import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface PhoneTurnstileTranslations {
  retrySecurityCheck: string;
}

export const phoneTurnstileTranslations: Record<
  SupportedDisplayLanguageCodes,
  PhoneTurnstileTranslations
> = {
  en: { retrySecurityCheck: "Complete the security check and try again." },
  ar: { retrySecurityCheck: "أكمل التحقق الأمني ثم حاول مرة أخرى." },
  es: {
    retrySecurityCheck:
      "Completa la verificación de seguridad e inténtalo de nuevo.",
  },
  fa: { retrySecurityCheck: "بررسی امنیتی را کامل کنید و دوباره تلاش کنید." },
  fr: {
    retrySecurityCheck: "Terminez la vérification de sécurité, puis réessayez.",
  },
  "zh-Hans": { retrySecurityCheck: "请完成安全验证后重试。" },
  "zh-Hant": { retrySecurityCheck: "請完成安全驗證後重試。" },
  he: { retrySecurityCheck: "השלימו את בדיקת האבטחה ונסו שוב." },
  ja: {
    retrySecurityCheck:
      "セキュリティ確認を完了してから、もう一度お試しください。",
  },
  ky: {
    retrySecurityCheck: "Коопсуздук текшерүүсүн бүтүрүп, кайра аракет кылыңыз.",
  },
  ru: {
    retrySecurityCheck: "Пройдите проверку безопасности и попробуйте ещё раз.",
  },
};
