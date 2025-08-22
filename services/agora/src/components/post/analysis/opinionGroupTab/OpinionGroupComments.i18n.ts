export interface OpinionGroupCommentsTranslations {
  opinionsTitle: string;
  noOpinionsMessage: string;
  thisGroup: string;
  allOthers: string;
  allOtherGroups: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const opinionGroupCommentsTranslations: Record<
  string,
  OpinionGroupCommentsTranslations
> = {
  en: {
    opinionsTitle: "Opinions",
    noOpinionsMessage: "No opinions available for this group.",
    thisGroup: "This group",
    allOthers: "All others",
    allOtherGroups: "All other groups",
  },
  es: {
    opinionsTitle: "Opiniones",
    noOpinionsMessage: "No hay opiniones disponibles para este grupo.",
    thisGroup: "Este grupo",
    allOthers: "Todos los demás",
    allOtherGroups: "Todos los otros grupos",
  },
  fr: {
    opinionsTitle: "Opinions",
    noOpinionsMessage: "Aucune opinion disponible pour ce groupe.",
    thisGroup: "Ce groupe",
    allOthers: "Tous les autres",
    allOtherGroups: "Tous les autres groupes",
  },
};
