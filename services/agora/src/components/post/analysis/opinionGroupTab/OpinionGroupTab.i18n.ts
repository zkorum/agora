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
    groupsTitle: "Opinion groups",
    notEnoughGroupsMessage: "Not enough groups to display.",
  },
  ar: {
    groupsTitle: "مجموعات الرأي",
    notEnoughGroupsMessage: "لا توجد مجموعات كافية للعرض.",
  },
  es: {
    groupsTitle: "Grupos de opinión",
    notEnoughGroupsMessage: "No hay suficientes grupos para mostrar.",
  },
  fr: {
    groupsTitle: "Groupes d'opinion",
    notEnoughGroupsMessage: "Pas assez de groupes à afficher.",
  },
  "zh-Hans": {
    groupsTitle: "意见群组",
    notEnoughGroupsMessage: "群组数量不足以显示。",
  },
  "zh-Hant": {
    groupsTitle: "意見群組",
    notEnoughGroupsMessage: "群組數量不足以顯示。",
  },
  ja: {
    groupsTitle: "意見グループ",
    notEnoughGroupsMessage: "表示するグループが不足しています。",
  },
};
