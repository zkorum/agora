export interface ShortcutBarTranslations {
  summary: string;
  me: string;
  commonGround: string;
  majority: string;
  divisive: string;
  groups: string;
}

export const shortcutBarTranslations: Record<string, ShortcutBarTranslations> =
  {
    en: {
      summary: "Summary",
      me: "Me",
      commonGround: "Common ground",
      majority: "Majority",
      divisive: "Divisive",
      groups: "Groups",
    },
    es: {
      summary: "Resumen",
      me: "Yo",
      commonGround: "Terreno común",
      majority: "Mayoría",
      divisive: "Divisivo",
      groups: "Grupos",
    },
    fr: {
      summary: "Résumé",
      me: "Moi",
      commonGround: "Terrain commun",
      majority: "Majorité",
      divisive: "Controversé",
      groups: "Groupes",
    },
  };
