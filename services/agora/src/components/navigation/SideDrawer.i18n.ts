export interface SideDrawerTranslations {
  home: string;
  explore: string;
  dings: string;
  profile: string;
  settings: string;
  [key: string]: string; // Index signature to satisfy Record<string, string> constraint
}

export const sideDrawerTranslations: Record<string, SideDrawerTranslations> = {
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
};
