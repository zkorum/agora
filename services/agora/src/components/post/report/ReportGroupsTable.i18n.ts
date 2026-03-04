import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportGroupsTableTranslations {
  title: string;
  label: string;
  participants: string;
  aiSummary: string;
  notEnoughGroups: string;
  noSummary: string;
  noGroup: string;
}

export const reportGroupsTableTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportGroupsTableTranslations
> = {
  en: {
    title: "Opinion Groups",
    label: "Group",
    participants: "Participants",
    aiSummary: "Summary",
    notEnoughGroups:
      "Not enough participation yet to form distinct opinion groups.",
    noSummary: "Summary not yet available.",
    noGroup: "No group",
  },
  ar: {
    title: "مجموعات الرأي",
    label: "المجموعة",
    participants: "المشاركون",
    aiSummary: "الملخص",
    notEnoughGroups:
      "لا توجد مشاركة كافية بعد لتشكيل مجموعات رأي متميزة.",
    noSummary: "الملخص غير متاح بعد.",
    noGroup: "بدون مجموعة",
  },
  es: {
    title: "Grupos de opinión",
    label: "Grupo",
    participants: "Participantes",
    aiSummary: "Resumen",
    notEnoughGroups:
      "Aún no hay suficiente participación para formar grupos de opinión distintos.",
    noSummary: "Resumen aún no disponible.",
    noGroup: "Sin grupo",
  },
  fr: {
    title: "Groupes d'opinion",
    label: "Groupe",
    participants: "Participants",
    aiSummary: "Résumé",
    notEnoughGroups:
      "Pas assez de participation pour former des groupes d'opinion distincts.",
    noSummary: "Résumé pas encore disponible.",
    noGroup: "Aucun groupe",
  },
  "zh-Hans": {
    title: "意见群体",
    label: "群体",
    participants: "参与者",
    aiSummary: "摘要",
    notEnoughGroups: "参与人数不足，无法形成不同的意见群体。",
    noSummary: "摘要尚不可用。",
    noGroup: "无群体",
  },
  "zh-Hant": {
    title: "意見群體",
    label: "群體",
    participants: "參與者",
    aiSummary: "摘要",
    notEnoughGroups: "參與人數不足，無法形成不同的意見群體。",
    noSummary: "摘要尚不可用。",
    noGroup: "無群體",
  },
  ja: {
    title: "意見グループ",
    label: "グループ",
    participants: "参加者",
    aiSummary: "要約",
    notEnoughGroups:
      "異なる意見グループを形成するための十分な参加がまだありません。",
    noSummary: "要約はまだ利用できません。",
    noGroup: "グループなし",
  },
};
