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
      "These are statements all opinion groups agree to agree on.\n\nThis goes beyond a simple majority: even if most individuals approve, a single group's disapproval — no matter how small the group — is enough to exclude a statement.\n\nOnly statements that reflect true cross-group consensus appear here, not those based on majority rule alone.\n\nOnly the most statistically significant are shown first.",
    disagreementsTitle: "Rejected",
    disagreementsDescription:
      "These are statements all opinion groups agree to disagree on.\n\nThis goes beyond a simple majority: even if most individuals reject, a single group's approval — no matter how small the group — is enough to exclude a statement.\n\nOnly statements that reflect true cross-group consensus appear here, not those based on majority rule alone.\n\nOnly the most statistically significant are shown first.",
  },
  ar: {
    agreementsTitle: "معتمدة",
    agreementsDescription:
      "هذه المقترحات معتمدة بالإجماع من كل مجموعة رأي.\n\nهذا يتجاوز الأغلبية البسيطة: حتى لو وافق معظم الأفراد، فإن رفض مجموعة واحدة — مهما كان حجمها — يكفي لاستبعاد المقترح.\n\nلا تظهر هنا سوى المقترحات التي تعكس إجماعاً حقيقياً بين المجموعات، وليس تلك القائمة على حكم الأغلبية فقط.\n\nتُعرض الأكثر دلالة إحصائياً أولاً.",
    disagreementsTitle: "مرفوضة",
    disagreementsDescription:
      "هذه المقترحات مرفوضة بالإجماع من كل مجموعة رأي.\n\nهذا يتجاوز الأغلبية البسيطة: حتى لو رفض معظم الأفراد، فإن موافقة مجموعة واحدة — مهما كان حجمها — تكفي لاستبعاد المقترح.\n\nلا تظهر هنا سوى المقترحات التي تعكس إجماعاً حقيقياً بين المجموعات، وليس تلك القائمة على حكم الأغلبية فقط.\n\nتُعرض الأكثر دلالة إحصائياً أولاً.",
  },
  es: {
    agreementsTitle: "Aprobados",
    agreementsDescription:
      "Estas proposiciones son aprobadas por unanimidad por cada grupo de opinión.\n\nEsto va más allá de una simple mayoría: aunque una gran parte de los individuos las aprueben, el rechazo de un solo grupo — sin importar su tamaño — basta para excluirlas.\n\nAsí, solo se presentan aquí las proposiciones que son objeto de un verdadero consenso entre grupos, y no las que se basan únicamente en una regla mayoritaria.\n\nSolo se muestran las más estadísticamente significativas primero.",
    disagreementsTitle: "Rechazados",
    disagreementsDescription:
      "Estas proposiciones son rechazadas por unanimidad por cada grupo de opinión.\n\nEsto va más allá de una simple mayoría: aunque una gran parte de los individuos las rechacen, la aprobación de un solo grupo — sin importar su tamaño — basta para excluirlas.\n\nAsí, solo se presentan aquí las proposiciones que son objeto de un verdadero consenso entre grupos, y no las que se basan únicamente en una regla mayoritaria.\n\nSolo se muestran las más estadísticamente significativas primero.",
  },
  fr: {
    agreementsTitle: "Approuvés",
    agreementsDescription:
      "Ces propositions sont approuvées à l'unanimité par chaque groupe d'opinion.\n\nCela dépasse le cadre d'une simple majorité : même si une large part des individus les approuvent, le rejet d'un seul groupe — quelle que soit sa taille — suffit à les exclure.\n\nAinsi, seules les propositions faisant l'objet d'un véritable consensus inter-groupes sont présentées ici, et non celles qui ne reposent que sur une règle majoritaire.\n\nSeules les plus statistiquement significatives sont affichées en premier.",
    disagreementsTitle: "Rejetés",
    disagreementsDescription:
      "Ces propositions sont rejetées à l'unanimité par chaque groupe d'opinion.\n\nCela dépasse le cadre d'une simple majorité : même si une large part des individus les rejettent, l'approbation d'un seul groupe — quelle que soit sa taille — suffit à les exclure.\n\nAinsi, seules les propositions faisant l'objet d'un véritable consensus inter-groupes sont présentées ici, et non celles qui ne reposent que sur une règle majoritaire.\n\nSeules les plus statistiquement significatives sont affichées en premier.",
  },
  "zh-Hans": {
    agreementsTitle: "通过",
    agreementsDescription:
      "这些观点获得了每个意见群组的一致认可。\n\n这超越了简单多数：即使大多数个体认可，一个群组的反对——无论其规模多小——就足以排除该观点。\n\n只有反映真正跨群组共识的观点才会出现在这里，而非仅基于多数决定的观点。\n\n仅先显示统计上最显著的观点。",
    disagreementsTitle: "否决",
    disagreementsDescription:
      "这些观点被每个意见群组一致否决。\n\n这超越了简单多数：即使大多数个体否决，一个群组的认可——无论其规模多小——就足以排除该观点。\n\n只有反映真正跨群组共识的观点才会出现在这里，而非仅基于多数决定的观点。\n\n仅先显示统计上最显著的观点。",
  },
  "zh-Hant": {
    agreementsTitle: "通過",
    agreementsDescription:
      "這些觀點獲得了每個意見群組的一致認可。\n\n這超越了簡單多數：即使大多數個體認可，一個群組的反對——無論其規模多小——就足以排除該觀點。\n\n只有反映真正跨群組共識的觀點才會出現在這裡，而非僅基於多數決定的觀點。\n\n僅先顯示統計上最顯著的觀點。",
    disagreementsTitle: "否決",
    disagreementsDescription:
      "這些觀點被每個意見群組一致否決。\n\n這超越了簡單多數：即使大多數個體否決，一個群組的認可——無論其規模多小——就足以排除該觀點。\n\n只有反映真正跨群組共識的觀點才會出現在這裡，而非僅基於多數決定的觀點。\n\n僅先顯示統計上最顯著的觀點。",
  },
  ja: {
    agreementsTitle: "承認",
    agreementsDescription:
      "これらの意見はすべての意見グループに全会一致で承認されています。\n\n単純な多数決を超えたものです：大多数が承認しても、一つのグループの反対——その規模に関わらず——だけでその意見は除外されます。\n\n真のグループ間合意を反映する意見のみがここに表示され、多数決だけに基づく意見は表示されません。\n\n統計的に最も有意なものが最初に表示されます。",
    disagreementsTitle: "否決",
    disagreementsDescription:
      "これらの意見はすべての意見グループに全会一致で否決されています。\n\n単純な多数決を超えたものです：大多数が否決しても、一つのグループの承認——その規模に関わらず——だけでその意見は除外されます。\n\n真のグループ間合意を反映する意見のみがここに表示され、多数決だけに基づく意見は表示されません。\n\n統計的に最も有意なものが最初に表示されます。",
  },
};
