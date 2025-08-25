import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SideDrawerTranslations {
  home: string;
  explore: string;
  dings: string;
  profile: string;
  settings: string;
}

export const sideDrawerTranslations: Record<
  SupportedDisplayLanguageCodes,
  SideDrawerTranslations
> = {
  en: {
    home: "Home",
    explore: "Explore",
    dings: "Dings",
    profile: "Profile",
    settings: "Settings",
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    dings: "Dings",
    profile: "Perfil",
    settings: "Configuración",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    dings: "Dings",
    profile: "Profil",
    settings: "Paramètres",
  },
  "zh-CN": {
    home: "首页",
    explore: "探索",
    dings: "Dings",
    profile: "个人资料",
    settings: "设置",
  },
  "zh-TW": {
    home: "首頁",
    explore: "探索",
    dings: "Dings",
    profile: "個人資料",
    settings: "設定",
  },
  ja: {
    home: "ホーム",
    explore: "探索",
    dings: "Dings",
    profile: "プロフィール",
    settings: "設定",
  },
};
