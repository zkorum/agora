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
  fa: { title: "گزاره‌های شاخص", groupSubtitle: "گزاره‌هایی که این گروه را منحصربه‌فرد می‌کنند، بر اساس رأی‌هایشان:", participants: "شرکت‌کننده", statement: "گزاره", overall: "کلی", noStatements: "گزاره شاخصی موجود نیست." },
  ar: {
    title: "البيانات الممثلة",
    groupSubtitle: "البيانات التي تميز هذه المجموعة، حسب تصويتاتهم:",
    participants: "مشاركين",
    statement: "البيان",
    overall: "الإجمالي",
    noStatements: "لا توجد بيانات ممثلة متاحة.",
  },
  "zh-Hans": {
    title: "代表性意见",
    groupSubtitle: "使该群组独特的意见，按其投票：",
    participants: "位参与者",
    statement: "意见",
    overall: "总计",
    noStatements: "暂无代表性意见。",
  },
  "zh-Hant": {
    title: "代表性意見",
    groupSubtitle: "使該群組獨特的意見，按其投票：",
    participants: "位參與者",
    statement: "意見",
    overall: "總計",
    noStatements: "暫無代表性意見。",
  },
  he: { title: "הצהרות מייצגות", groupSubtitle: "הצהרות שהופכות קבוצה זו לייחודית, לפי ההצבעות שלהם:", participants: "משתתפים", statement: "הצהרה", overall: "כולל", noStatements: "אין הצהרות מייצגות זמינות." },
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
