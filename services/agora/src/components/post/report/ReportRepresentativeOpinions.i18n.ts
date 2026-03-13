import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportRepresentativeOpinionsTranslations {
  title: string;
  groupSubtitle: string;
  participants: string;
  statement: string;
  overall: string;
  noStatements: string;
}

export const reportRepresentativeOpinionsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportRepresentativeOpinionsTranslations
> = {
  en: {
    title: "Representative Statements",
    groupSubtitle: "Statements which make this group unique, by their votes:",
    participants: "participants",
    statement: "Statement",
    overall: "Overall",
    noStatements: "No representative statements available.",
  },
  fr: {
    title: "Propositions représentatives",
    groupSubtitle:
      "Propositions qui rendent ce groupe unique, selon leurs votes :",
    participants: "participants",
    statement: "Proposition",
    overall: "Global",
    noStatements: "Aucune proposition représentative disponible.",
  },
  es: {
    title: "Proposiciones representativas",
    groupSubtitle:
      "Proposiciones que hacen único a este grupo, según sus votos:",
    participants: "participantes",
    statement: "Proposición",
    overall: "General",
    noStatements: "No hay proposiciones representativas disponibles.",
  },
  ar: {
    title: "البيانات الممثلة",
    groupSubtitle: "البيانات التي تميز هذه المجموعة، حسب تصويتاتهم:",
    participants: "مشاركين",
    statement: "البيان",
    overall: "الإجمالي",
    noStatements: "لا توجد بيانات ممثلة متاحة.",
  },
  "zh-Hans": {
    title: "代表性陈述",
    groupSubtitle: "使该群组独特的陈述，按其投票：",
    participants: "位参与者",
    statement: "陈述",
    overall: "总计",
    noStatements: "暂无代表性陈述。",
  },
  "zh-Hant": {
    title: "代表性陳述",
    groupSubtitle: "使該群組獨特的陳述，按其投票：",
    participants: "位參與者",
    statement: "陳述",
    overall: "總計",
    noStatements: "暫無代表性陳述。",
  },
  ja: {
    title: "代表的な意見",
    groupSubtitle: "このグループを特徴づける意見（投票結果）：",
    participants: "人の参加者",
    statement: "意見",
    overall: "全体",
    noStatements: "代表的な意見はありません。",
  },
  ky: {
    title: "Өкүлчүлүктүү пикирлер",
    groupSubtitle: "Бул топту уникалдуу кылган пикирлер, алардын добуштары боюнча:",
    participants: "катышуучу",
    statement: "Пикир",
    overall: "Жалпы",
    noStatements: "Өкүлчүлүктүү пикирлер жок.",
  },
  ru: {
    title: "Характерные высказывания",
    groupSubtitle: "Высказывания, которые делают эту группу уникальной, по их голосам:",
    participants: "участников",
    statement: "Высказывание",
    overall: "Общий",
    noStatements: "Характерные высказывания отсутствуют.",
  },
};
