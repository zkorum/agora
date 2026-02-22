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
      agreements: "Approved",
      disagreements: "Rejected",
      divisive: "Divisive",
      groups: "Groups",
    },
    ar: {
      summary: "ملخص",
      me: "أنا",
      agreements: "معتمدة",
      disagreements: "مرفوضة",
      divisive: "مثير للجدل",
      groups: "مجموعات",
    },
    es: {
      summary: "Resumen",
      me: "Yo",
      agreements: "Aprobados",
      disagreements: "Rechazados",
      divisive: "Divisivo",
      groups: "Grupos",
    },
    fr: {
      summary: "Résumé",
      me: "Moi",
      agreements: "Approuvés",
      disagreements: "Rejetés",
      divisive: "Controversé",
      groups: "Groupes",
    },
    "zh-Hans": {
      summary: "总结",
      me: "我",
      agreements: "通过",
      disagreements: "否决",
      divisive: "争议",
      groups: "群组",
    },
    "zh-Hant": {
      summary: "總結",
      me: "我",
      agreements: "通過",
      disagreements: "否決",
      divisive: "爭議",
      groups: "群組",
    },
    ja: {
      summary: "サマリー",
      me: "私",
      agreements: "承認",
      disagreements: "否決",
      divisive: "分断",
      groups: "グループ",
    },
  };
