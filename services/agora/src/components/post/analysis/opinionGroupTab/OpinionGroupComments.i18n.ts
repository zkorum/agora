export interface OpinionGroupCommentsTranslations {
  opinionsTitle: string;
  noOpinionsMessage: string;
  thisGroup: string;
  allOthers: string;
  allOtherGroups: string;
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
  ar: {
    opinionsTitle: "ترجمة: Opinions",
    noOpinionsMessage: "ترجمة: No opinions available for this group.",
    thisGroup: "ترجمة: This group",
    allOthers: "ترجمة: All others",
    allOtherGroups: "ترجمة: All other groups",
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
  "zh-Hans": {
    opinionsTitle: "意见",
    noOpinionsMessage: "此群组没有意见。",
    thisGroup: "此群组",
    allOthers: "所有其他",
    allOtherGroups: "所有其他群组",
  },
  "zh-Hant": {
    opinionsTitle: "意見",
    noOpinionsMessage: "此群組沒有意見。",
    thisGroup: "此群組",
    allOthers: "所有其他",
    allOtherGroups: "所有其他群組",
  },
  ja: {
    opinionsTitle: "意見",
    noOpinionsMessage: "このグループには意見がありません。",
    thisGroup: "このグループ",
    allOthers: "すべての他の",
    allOtherGroups: "すべての他のグループ",
  },
};
