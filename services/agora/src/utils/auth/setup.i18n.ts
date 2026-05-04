import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AuthSetupTranslations {
  loggedOut: string;
  logoutFailed: string;
}

export const authSetupTranslations: Record<
  SupportedDisplayLanguageCodes,
  AuthSetupTranslations
> = {
  en: { loggedOut: "Logged out", logoutFailed: "Oops! Logout failed. Please try again" },
  es: { loggedOut: "Sesión cerrada", logoutFailed: "¡Ups! No se pudo cerrar sesión. Inténtelo de nuevo" },
  fr: { loggedOut: "Déconnecté", logoutFailed: "Oups ! La déconnexion a échoué. Veuillez réessayer" },
  "zh-Hant": { loggedOut: "已登出", logoutFailed: "糟糕！登出失敗。請重試" },
  "zh-Hans": { loggedOut: "已退出登录", logoutFailed: "糟糕！退出登录失败。请重试" },
  ja: { loggedOut: "ログアウトしました", logoutFailed: "ログアウトに失敗しました。もう一度お試しください" },
  ar: { loggedOut: "تم تسجيل الخروج", logoutFailed: "عفواً! فشل تسجيل الخروج. يرجى المحاولة مرة أخرى" },
  fa: { loggedOut: "از حساب خارج شدید", logoutFailed: "متأسفیم! خروج ناموفق بود. لطفاً دوباره تلاش کنید" },
  he: { loggedOut: "התנתקת", logoutFailed: "אופס! ההתנתקות נכשלה. נסו שוב" },
  ky: { loggedOut: "Чыгып кеттиңиз", logoutFailed: "Ой! Чыгуу ишке ашкан жок. Кайра аракет кылыңыз" },
  ru: { loggedOut: "Вы вышли из аккаунта", logoutFailed: "Ой! Не удалось выйти. Попробуйте ещё раз" },
};
