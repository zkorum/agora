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
    agreementsTitle: "Agreements",
    agreementsDescription:
      "Statements that every opinion group tends to agree with. Unlike a majority vote, even a small group's disagreement means a statement won't appear here. True common ground requires agreement across all groups. Ranked by cross-group agreement strength.",
    disagreementsTitle: "Disagreements",
    disagreementsDescription:
      "Statements that every opinion group tends to disagree with. Unlike a majority vote, even a small group's agreement means a statement won't appear here. True shared disagreement requires all groups to reject it. Ranked by cross-group disagreement strength.",
  },
  ar: {
    agreementsTitle: "الاتفاقات",
    agreementsDescription:
      "مقترحات تميل جميع مجموعات الرأي إلى الموافقة عليها. على عكس تصويت الأغلبية، حتى اعتراض مجموعة صغيرة يعني عدم ظهور المقترح هنا. الإجماع الحقيقي يتطلب اتفاق جميع المجموعات. مرتبة حسب قوة الاتفاق بين المجموعات.",
    disagreementsTitle: "الخلافات",
    disagreementsDescription:
      "مقترحات تميل جميع مجموعات الرأي إلى رفضها. على عكس تصويت الأغلبية، حتى موافقة مجموعة صغيرة تعني عدم ظهور المقترح هنا. الخلاف المشترك الحقيقي يتطلب رفض جميع المجموعات. مرتبة حسب قوة الخلاف بين المجموعات.",
  },
  es: {
    agreementsTitle: "Acuerdos",
    agreementsDescription:
      "Afirmaciones con las que todos los grupos de opinión tienden a estar de acuerdo. A diferencia de un voto mayoritario, incluso el desacuerdo de un grupo pequeño impide que aparezca aquí. El verdadero terreno común requiere acuerdo de todos los grupos. Clasificadas por fuerza del acuerdo entre grupos.",
    disagreementsTitle: "Desacuerdos",
    disagreementsDescription:
      "Afirmaciones con las que todos los grupos de opinión tienden a no estar de acuerdo. A diferencia de un voto mayoritario, incluso el acuerdo de un grupo pequeño impide que aparezca aquí. El verdadero desacuerdo compartido requiere el rechazo de todos los grupos. Clasificadas por fuerza del desacuerdo entre grupos.",
  },
  fr: {
    agreementsTitle: "Accords",
    agreementsDescription:
      "Propositions avec lesquelles tous les groupes d'opinion tendent à être d'accord. Contrairement à un vote majoritaire, même le désaccord d'un petit groupe empêche une proposition d'apparaître ici. Un véritable terrain d'entente nécessite l'accord de tous les groupes. Classées par force de l'accord entre groupes.",
    disagreementsTitle: "Désaccords",
    disagreementsDescription:
      "Propositions avec lesquelles tous les groupes d'opinion tendent à être en désaccord. Contrairement à un vote majoritaire, même l'accord d'un petit groupe empêche une proposition d'apparaître ici. Un véritable désaccord partagé nécessite le rejet de tous les groupes. Classées par force du désaccord entre groupes.",
  },
  "zh-Hans": {
    agreementsTitle: "共识",
    agreementsDescription:
      "所有意见群组都倾向于同意的观点。与多数投票不同，即使一个小群组不同意，该观点也不会出现在这里。真正的共识需要所有群组都同意。按跨群组共识强度排名。",
    disagreementsTitle: "分歧",
    disagreementsDescription:
      "所有意见群组都倾向于反对的观点。与多数投票不同，即使一个小群组同意，该观点也不会出现在这里。真正的共同反对需要所有群组都拒绝。按跨群组反对强度排名。",
  },
  "zh-Hant": {
    agreementsTitle: "共識",
    agreementsDescription:
      "所有意見群組都傾向於同意的觀點。與多數投票不同，即使一個小群組不同意，該觀點也不會出現在這裡。真正的共識需要所有群組都同意。按跨群組共識強度排名。",
    disagreementsTitle: "分歧",
    disagreementsDescription:
      "所有意見群組都傾向於反對的觀點。與多數投票不同，即使一個小群組同意，該觀點也不會出現在這裡。真正的共同反對需要所有群組都拒絕。按跨群組反對強度排名。",
  },
  ja: {
    agreementsTitle: "合意",
    agreementsDescription:
      "すべての意見グループが同意する傾向がある意見です。多数決とは異なり、小さなグループでも反対すればここには表示されません。本当の共通認識にはすべてのグループの同意が必要です。グループ間の合意の強さで順位付け。",
    disagreementsTitle: "不一致",
    disagreementsDescription:
      "すべての意見グループが反対する傾向がある意見です。多数決とは異なり、小さなグループでも賛成すればここには表示されません。本当の共通の反対にはすべてのグループの拒否が必要です。グループ間の反対の強さで順位付け。",
  },
};
