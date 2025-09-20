import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProfileSettingsTranslations {
  pageTitle: string;
  changeUsernameTitle: string;
}

export const profileSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ProfileSettingsTranslations
> = {
  en: {
    pageTitle: "Profile Settings",
    changeUsernameTitle: "Change username",
  },
  ar: {
    pageTitle: "إعدادات الملف الشخصي",
    changeUsernameTitle: "تغيير اسم المستخدم",
  },
  es: {
    pageTitle: "Configuración de Perfil",
    changeUsernameTitle: "Cambiar nombre de usuario",
  },
  fr: {
    pageTitle: "Paramètres du Profil",
    changeUsernameTitle: "Changer le nom d'utilisateur",
  },
  "zh-Hans": {
    pageTitle: "个人资料设置",
    changeUsernameTitle: "更改用户名",
  },
  "zh-Hant": {
    pageTitle: "個人資料設定",
    changeUsernameTitle: "更改用戶名",
  },
  ja: {
    pageTitle: "プロフィール設定",
    changeUsernameTitle: "ユーザー名を変更",
  },
};
