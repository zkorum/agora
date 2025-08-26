import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupTabTranslations {
  groupsTitle: string;
  notEnoughGroupsMessage: string;
  meLabel: string;
}

export const opinionGroupTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupTabTranslations
> = {
  en: {
    groupsTitle: "Groups",
    notEnoughGroupsMessage: "Not enough groups to display.",
    meLabel: "Me",
  },
  es: {
    groupsTitle: "Grupos",
    notEnoughGroupsMessage: "No hay suficientes grupos para mostrar.",
    meLabel: "Yo",
  },
  fr: {
    groupsTitle: "Groupes",
    notEnoughGroupsMessage: "Pas assez de groupes à afficher.",
    meLabel: "Moi",
  },
  "zh-Hans": {
    groupsTitle: "群组",
    notEnoughGroupsMessage: "群组数量不足以显示。",
    meLabel: "我",
  },
  "zh-Hant": {
    groupsTitle: "群組",
    notEnoughGroupsMessage: "群組數量不足以顯示。",
    meLabel: "我",
  },
  ja: {
    groupsTitle: "グループ",
    notEnoughGroupsMessage: "表示するグループが不足しています。",
    meLabel: "私",
  },
};
