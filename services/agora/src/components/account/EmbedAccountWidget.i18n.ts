import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmbedAccountWidgetTranslations {
  logoutButton: string;
  logoutTooltip: string;
}

export const embedAccountWidgetTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmbedAccountWidgetTranslations
> = {
  en: {
    logoutButton: "Log Out",
    logoutTooltip: "Logout",
  },
  de: {
    logoutButton: "Abmelden",
    logoutTooltip: "Abmelden",
  },
  hi: {
    logoutButton: "बाहर निकलें",
    logoutTooltip: "बाहर निकलें",
  },
  ar: {
    logoutButton: "تسجيل الخروج",
    logoutTooltip: "تسجيل الخروج",
  },
  es: {
    logoutButton: "Cerrar Sesión",
    logoutTooltip: "Cerrar Sesión",
  },
  fa: {
    logoutButton: "خروج",
    logoutTooltip: "خروج",
  },
  fr: {
    logoutButton: "Se Déconnecter",
    logoutTooltip: "Se Déconnecter",
  },
  "zh-Hans": {
    logoutButton: "登出",
    logoutTooltip: "登出",
  },
  "zh-Hant": {
    logoutButton: "登出",
    logoutTooltip: "登出",
  },
  he: {
    logoutButton: "התנתקות",
    logoutTooltip: "התנתקות",
  },
  ja: {
    logoutButton: "ログアウト",
    logoutTooltip: "ログアウト",
  },
  ky: {
    logoutButton: "Чыгуу",
    logoutTooltip: "Чыгуу",
  },
  ru: {
    logoutButton: "Выйти",
    logoutTooltip: "Выйти",
  },
};
