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
    groupsTitle: "Groups",
    meLabel: "Me",
  },
  ar: {
    groupsTitle: "المجموعات",
    meLabel: "أنا",
  },
  es: {
    groupsTitle: "Grupos",
    meLabel: "Yo",
  },
  fr: {
    groupsTitle: "Groupes",
    meLabel: "Moi",
  },
  "zh-Hans": {
    groupsTitle: "群组",
    meLabel: "我",
  },
  "zh-Hant": {
    groupsTitle: "群組",
    meLabel: "我",
  },
  ja: {
    groupsTitle: "グループ",
    meLabel: "私",
  },
};
