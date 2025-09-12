import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupTabTranslations {
  groupsTitle: string;
  notEnoughGroupsMessage: string;
}

export const opinionGroupTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupTabTranslations
> = {
  en: {
    groupsTitle: "Groups",
    notEnoughGroupsMessage: "Not enough groups to display.",
  },
  ar: {
    groupsTitle: "المجموعات",
    notEnoughGroupsMessage: "لا توجد مجموعات كافية للعرض.",
  },
  es: {
    groupsTitle: "Grupos",
    notEnoughGroupsMessage: "No hay suficientes grupos para mostrar.",
  },
  fr: {
    groupsTitle: "Groupes",
    notEnoughGroupsMessage: "Pas assez de groupes à afficher.",
  },
  "zh-Hans": {
    groupsTitle: "群组",
    notEnoughGroupsMessage: "群组数量不足以显示。",
  },
  "zh-Hant": {
    groupsTitle: "群組",
    notEnoughGroupsMessage: "群組數量不足以顯示。",
  },
  ja: {
    groupsTitle: "グループ",
    notEnoughGroupsMessage: "表示するグループが不足しています。",
  },
};
