import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportGroupsTableTranslations {
  title: string;
  groupName: string;
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
    groupName: "Group",
    label: "Label",
    participants: "Participants",
    aiSummary: "Summary",
    notEnoughGroups:
      "Not enough participation yet to form distinct opinion groups.",
    noSummary: "Summary not yet available.",
    noGroup: "No group",
  },
  ar: {
    title: "مجموعات الرأي",
    groupName: "المجموعة",
    label: "التسمية",
    participants: "المشاركون",
    aiSummary: "الملخص",
    notEnoughGroups:
      "لا توجد مشاركة كافية بعد لتشكيل مجموعات رأي متميزة.",
    noSummary: "الملخص غير متاح بعد.",
    noGroup: "بدون مجموعة",
  },
  es: {
    title: "Grupos de opinión",
    groupName: "Grupo",
    label: "Etiqueta",
    participants: "Participantes",
    aiSummary: "Resumen",
    notEnoughGroups:
      "Aún no hay suficiente participación para formar grupos de opinión distintos.",
    noSummary: "Resumen aún no disponible.",
    noGroup: "Sin grupo",
  },
  fr: {
    title: "Groupes d'opinion",
    groupName: "Groupe",
    label: "Libellé",
    participants: "Participants",
    aiSummary: "Résumé",
    notEnoughGroups:
      "Pas assez de participation pour former des groupes d'opinion distincts.",
    noSummary: "Résumé pas encore disponible.",
    noGroup: "Aucun groupe",
  },
  "zh-Hans": {
    title: "意见群体",
    groupName: "群体",
    label: "标签",
    participants: "参与者",
    aiSummary: "摘要",
    notEnoughGroups: "参与人数不足，无法形成不同的意见群体。",
    noSummary: "摘要尚不可用。",
    noGroup: "无群体",
  },
  "zh-Hant": {
    title: "意見群體",
    groupName: "群體",
    label: "標籤",
    participants: "參與者",
    aiSummary: "摘要",
    notEnoughGroups: "參與人數不足，無法形成不同的意見群體。",
    noSummary: "摘要尚不可用。",
    noGroup: "無群體",
  },
  ja: {
    title: "意見グループ",
    groupName: "グループ",
    label: "ラベル",
    participants: "参加者",
    aiSummary: "要約",
    notEnoughGroups:
      "異なる意見グループを形成するための十分な参加がまだありません。",
    noSummary: "要約はまだ利用できません。",
    noGroup: "グループなし",
  },
};
