import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ShortcutBarTranslations {
  summary: string;
  me: string;
  commonGround: string;
  majority: string;
  divisive: string;
  groups: string;
}

export const shortcutBarTranslations: Record<SupportedDisplayLanguageCodes, ShortcutBarTranslations> =
  {
    en: {
      summary: "Summary",
      me: "Me",
      commonGround: "Common ground",
      majority: "Majority",
      divisive: "Divisive",
      groups: "Groups",
    },
    ar: {
      summary: "ملخص",
      me: "أنا",
      commonGround: "أرضية مشتركة",
      majority: "الأغلبية",
      divisive: "مثير للجدل",
      groups: "مجموعات",
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
      commonGround: "Terrain d'entente",
      majority: "Majorité",
      divisive: "Controversé",
      groups: "Groupes",
    },
    "zh-Hans": {
      summary: "总结",
      me: "我",
      commonGround: "共同点",
      majority: "多数",
      divisive: "分歧",
      groups: "群组",
    },
    "zh-Hant": {
      summary: "總結",
      me: "我",
      commonGround: "共同點",
      majority: "多數",
      divisive: "分歧",
      groups: "群組",
    },
    ja: {
      summary: "サマリー",
      me: "私",
      commonGround: "共通点",
      majority: "マジョリティ",
      divisive: "分かれる",
      groups: "グループ",
    },
  };
