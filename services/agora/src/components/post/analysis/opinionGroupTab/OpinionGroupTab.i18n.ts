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
};
