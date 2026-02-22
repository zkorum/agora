import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupCommentsTranslations {
  opinionsTitle: string;
  opinionsTitleLong: string;
  noOpinionsMessage: string;
  thisGroup: string;
  allOthers: string;
  allOtherGroups: string;
}

export const opinionGroupCommentsTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupCommentsTranslations
> = {
  en: {
    opinionsTitle: "Statements",
    opinionsTitleLong: "Representative statements",
    noOpinionsMessage: "No statements available for this group.",
    thisGroup: "This group",
    allOthers: "All others",
    allOtherGroups: "All other groups",
  },
  ar: {
    opinionsTitle: "المقترحات",
    opinionsTitleLong: "المقترحات الممثّلة",
    noOpinionsMessage: "لا توجد مقترحات متاحة لهذه المجموعة.",
    thisGroup: "هذه المجموعة",
    allOthers: "جميع الآخرين",
    allOtherGroups: "جميع المجموعات الأخرى",
  },
  es: {
    opinionsTitle: "Proposiciones",
    opinionsTitleLong: "Proposiciones representativas",
    noOpinionsMessage: "No hay proposiciones disponibles para este grupo.",
    thisGroup: "Este grupo",
    allOthers: "Todos los demás",
    allOtherGroups: "Los otros grupos",
  },
  fr: {
    opinionsTitle: "Propositions",
    opinionsTitleLong: "Propositions représentatives",
    noOpinionsMessage: "Aucune proposition disponible pour ce groupe.",
    thisGroup: "Ce groupe",
    allOthers: "Tous les autres",
    allOtherGroups: "Les autres groupes",
  },
  "zh-Hans": {
    opinionsTitle: "观点",
    opinionsTitleLong: "代表性观点",
    noOpinionsMessage: "此群组没有观点。",
    thisGroup: "此群组",
    allOthers: "所有其他",
    allOtherGroups: "所有其他群组",
  },
  "zh-Hant": {
    opinionsTitle: "觀點",
    opinionsTitleLong: "代表性觀點",
    noOpinionsMessage: "此群組沒有觀點。",
    thisGroup: "此群組",
    allOthers: "所有其他",
    allOtherGroups: "所有其他群組",
  },
  ja: {
    opinionsTitle: "主張",
    opinionsTitleLong: "代表的な主張",
    noOpinionsMessage: "このグループには主張がありません。",
    thisGroup: "このグループ",
    allOthers: "すべての他の",
    allOtherGroups: "すべての他のグループ",
  },
};
