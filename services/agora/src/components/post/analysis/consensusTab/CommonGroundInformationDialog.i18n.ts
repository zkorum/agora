import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommonGroundInformationDialogTranslations {
  agreementsTitle: string;
  agreementsDescription: string;
  disagreementsTitle: string;
  disagreementsDescription: string;
}

export const commonGroundInformationDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommonGroundInformationDialogTranslations
> = {
  en: {
    agreementsTitle: "Approved",
    agreementsDescription:
      "Statements that every opinion group tends to approve. Unlike a majority vote, even a small group's disapproval means a statement won't appear here. Only the most representative are shown first. Load more to see the rest, ranked by cross-group agreement strength.",
    disagreementsTitle: "Rejected",
    disagreementsDescription:
      "Statements that every opinion group tends to reject. Unlike a majority vote, even a small group's approval means a statement won't appear here. Only the most representative are shown first. Load more to see the rest, ranked by cross-group rejection strength.",
  },
  ar: {
    agreementsTitle: "معتمدة",
    agreementsDescription:
      "مقترحات تميل جميع مجموعات الرأي إلى اعتمادها. على عكس تصويت الأغلبية، حتى رفض مجموعة صغيرة يعني عدم ظهور المقترح هنا. تُعرض الأكثر تمثيلاً أولاً. حمّل المزيد لرؤية البقية، مرتبة حسب قوة الاتفاق بين المجموعات.",
    disagreementsTitle: "مرفوضة",
    disagreementsDescription:
      "مقترحات تميل جميع مجموعات الرأي إلى رفضها. على عكس تصويت الأغلبية، حتى موافقة مجموعة صغيرة تعني عدم ظهور المقترح هنا. تُعرض الأكثر تمثيلاً أولاً. حمّل المزيد لرؤية البقية، مرتبة حسب قوة الرفض بين المجموعات.",
  },
  es: {
    agreementsTitle: "Aprobados",
    agreementsDescription:
      "Afirmaciones que todos los grupos de opinión tienden a aprobar. A diferencia de un voto mayoritario, incluso la desaprobación de un grupo pequeño impide que aparezca aquí. Solo se muestran las más representativas primero. Cargue más para ver el resto, clasificadas por fuerza del acuerdo entre grupos.",
    disagreementsTitle: "Rechazados",
    disagreementsDescription:
      "Afirmaciones que todos los grupos de opinión tienden a rechazar. A diferencia de un voto mayoritario, incluso la aprobación de un grupo pequeño impide que aparezca aquí. Solo se muestran las más representativas primero. Cargue más para ver el resto, clasificadas por fuerza del rechazo entre grupos.",
  },
  fr: {
    agreementsTitle: "Approuvés",
    agreementsDescription:
      "Propositions que tous les groupes d'opinion tendent à approuver. Contrairement à un vote majoritaire, même le rejet d'un petit groupe empêche une proposition d'apparaître ici. Seules les plus représentatives sont affichées en premier. Chargez plus pour voir les suivantes, classées par force de l'accord entre groupes.",
    disagreementsTitle: "Rejetés",
    disagreementsDescription:
      "Propositions que tous les groupes d'opinion tendent à rejeter. Contrairement à un vote majoritaire, même l'approbation d'un petit groupe empêche une proposition d'apparaître ici. Seules les plus représentatives sont affichées en premier. Chargez plus pour voir les suivantes, classées par force du rejet entre groupes.",
  },
  "zh-Hans": {
    agreementsTitle: "通过",
    agreementsDescription:
      "所有意见群组都倾向于认可的观点。与多数投票不同，即使一个小群组不认可，该观点也不会出现在这里。仅先显示最具代表性的观点。加载更多以查看其余，按跨群组认可强度排列。",
    disagreementsTitle: "否决",
    disagreementsDescription:
      "所有意见群组都倾向于否决的观点。与多数投票不同，即使一个小群组认可，该观点也不会出现在这里。仅先显示最具代表性的观点。加载更多以查看其余，按跨群组否决强度排列。",
  },
  "zh-Hant": {
    agreementsTitle: "通過",
    agreementsDescription:
      "所有意見群組都傾向於認可的觀點。與多數投票不同，即使一個小群組不認可，該觀點也不會出現在這裡。僅先顯示最具代表性的觀點。載入更多以查看其餘，按跨群組認可強度排列。",
    disagreementsTitle: "否決",
    disagreementsDescription:
      "所有意見群組都傾向於否決的觀點。與多數投票不同，即使一個小群組認可，該觀點也不會出現在這裡。僅先顯示最具代表性的觀點。載入更多以查看其餘，按跨群組否決強度排列。",
  },
  ja: {
    agreementsTitle: "承認",
    agreementsDescription:
      "すべての意見グループが承認する傾向がある意見です。多数決とは異なり、小さなグループでも不承認ならここには表示されません。最も代表的なものが最初に表示されます。残りを見るにはもっと読み込んでください。グループ間の承認の強さで順位付け。",
    disagreementsTitle: "否決",
    disagreementsDescription:
      "すべての意見グループが否決する傾向がある意見です。多数決とは異なり、小さなグループでも承認すればここには表示されません。最も代表的なものが最初に表示されます。残りを見るにはもっと読み込んでください。グループ間の否決の強さで順位付け。",
  },
};
