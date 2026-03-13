import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ClusterVisualizationTranslations {
  groupsTitle: string;
  meLabel: string;
}

export const clusterVisualizationTranslations: Record<
  SupportedDisplayLanguageCodes,
  ClusterVisualizationTranslations
> = {
  en: {
    groupsTitle: "Opinion groups",
    meLabel: "Me",
  },
  ar: {
    groupsTitle: "مجموعات الرأي",
    meLabel: "أنا",
  },
  es: {
    groupsTitle: "Grupos de opinión",
    meLabel: "Yo",
  },
  fr: {
    groupsTitle: "Groupes d'opinion",
    meLabel: "Moi",
  },
  "zh-Hans": {
    groupsTitle: "意见群组",
    meLabel: "我",
  },
  "zh-Hant": {
    groupsTitle: "意見群組",
    meLabel: "我",
  },
  ja: {
    groupsTitle: "意見グループ",
    meLabel: "私",
  },
  ky: {
    groupsTitle: "Пикир топтору",
    meLabel: "Мен",
  },
  ru: {
    groupsTitle: "Группы мнений",
    meLabel: "Я",
  },
};
