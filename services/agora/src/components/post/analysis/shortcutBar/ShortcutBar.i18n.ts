import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ShortcutBarTranslations {
  summary: string;
  me: string;
  agreements: string;
  disagreements: string;
  divisive: string;
  groups: string;
}

export const shortcutBarTranslations: Record<SupportedDisplayLanguageCodes, ShortcutBarTranslations> =
  {
    en: {
      summary: "Summary",
      me: "Me",
      agreements: "Agreements",
      disagreements: "Disagreements",
      divisive: "Divisive",
      groups: "Groups",
    },
    ar: {
      summary: "ملخص",
      me: "أنا",
      agreements: "اتفاقات",
      disagreements: "خلافات",
      divisive: "مثير للجدل",
      groups: "مجموعات",
    },
    es: {
      summary: "Resumen",
      me: "Yo",
      agreements: "Acuerdos",
      disagreements: "Desacuerdos",
      divisive: "Divisivo",
      groups: "Grupos",
    },
    fr: {
      summary: "Résumé",
      me: "Moi",
      agreements: "Accords",
      disagreements: "Désaccords",
      divisive: "Controversé",
      groups: "Groupes",
    },
    "zh-Hans": {
      summary: "总结",
      me: "我",
      agreements: "共识",
      disagreements: "分歧",
      divisive: "争议",
      groups: "群组",
    },
    "zh-Hant": {
      summary: "總結",
      me: "我",
      agreements: "共識",
      disagreements: "分歧",
      divisive: "爭議",
      groups: "群組",
    },
    ja: {
      summary: "サマリー",
      me: "私",
      agreements: "合意",
      disagreements: "不一致",
      divisive: "分断",
      groups: "グループ",
    },
  };
