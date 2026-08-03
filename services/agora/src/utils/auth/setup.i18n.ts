import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AuthSetupTranslations {
  loggedOut: string;
  logoutFailed: string;
  localOnlyTitle: string;
  localOnlyMessage: string;
  clearLocalData: string;
  retry: string;
  localCleanupFailedTitle: string;
  localCleanupFailedMessage: string;
  navigationFailedTitle: string;
  navigationFailedMessage: string;
}

const localOnlyFallback = {
  localOnlyTitle: "Clear this device only?",
  localOnlyMessage:
    "Server logout could not be confirmed. Local account data and keys can still be erased, but server sessions may remain active until you revoke them after logging in again or they expire.",
  clearLocalData: "Clear this device",
  retry: "Retry",
  localCleanupFailedTitle: "This device could not be cleared",
  localCleanupFailedMessage:
    "Local account data or keys may remain on this device. Stay here and retry to finish logging out safely.",
  navigationFailedTitle: "Could not open the home page",
  navigationFailedMessage:
    "Local logout finished, but the home page could not be opened. Try navigating again.",
};

export const authSetupTranslations: Record<
  SupportedDisplayLanguageCodes,
  AuthSetupTranslations
> = {
  en: {
    loggedOut: "Logged out",
    logoutFailed: "Oops! Logout failed. Please try again",
    ...localOnlyFallback,
  },
  es: {
    loggedOut: "Sesión cerrada",
    logoutFailed: "¡Ups! No se pudo cerrar sesión. Inténtelo de nuevo",
    ...localOnlyFallback,
  },
  fr: {
    loggedOut: "Déconnecté",
    logoutFailed: "Oups ! La déconnexion a échoué. Veuillez réessayer",
    ...localOnlyFallback,
  },
  "zh-Hant": {
    loggedOut: "已登出",
    logoutFailed: "糟糕！登出失敗。請重試",
    ...localOnlyFallback,
  },
  "zh-Hans": {
    loggedOut: "已退出登录",
    logoutFailed: "糟糕！退出登录失败。请重试",
    ...localOnlyFallback,
  },
  ja: {
    loggedOut: "ログアウトしました",
    logoutFailed: "ログアウトに失敗しました。もう一度お試しください",
    ...localOnlyFallback,
  },
  ar: {
    loggedOut: "تم تسجيل الخروج",
    logoutFailed: "عفواً! فشل تسجيل الخروج. يرجى المحاولة مرة أخرى",
    ...localOnlyFallback,
  },
  fa: {
    loggedOut: "از حساب خارج شدید",
    logoutFailed: "متأسفیم! خروج ناموفق بود. لطفاً دوباره تلاش کنید",
    ...localOnlyFallback,
  },
  he: {
    loggedOut: "התנתקת",
    logoutFailed: "אופס! ההתנתקות נכשלה. נסו שוב",
    ...localOnlyFallback,
  },
  ky: {
    loggedOut: "Чыгып кеттиңиз",
    logoutFailed: "Ой! Чыгуу ишке ашкан жок. Кайра аракет кылыңыз",
    ...localOnlyFallback,
  },
  ru: {
    loggedOut: "Вы вышли из аккаунта",
    logoutFailed: "Ой! Не удалось выйти. Попробуйте ещё раз",
    ...localOnlyFallback,
  },
};
