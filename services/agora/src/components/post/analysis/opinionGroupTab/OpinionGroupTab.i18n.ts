import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupTabTranslations {
  groupsTitle: string;
  groupsSubtitle: string;
  groupsSubtitleNoAi: string;
  notEnoughGroupsMessage: string;
  imbalanceNotice: string;
}

export const opinionGroupTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupTabTranslations
> = {
  en: {
    groupsTitle: "Opinion groups",
    groupsSubtitle: "Groups are formed based on voting behavior, regardless of language. An AI model then reads each group's statements to generate a name and summary.",
    groupsSubtitleNoAi: "Groups are formed based on voting behavior, regardless of language.",
    notEnoughGroupsMessage: "Not enough groups to display.",
    imbalanceNotice: "Most participants are in the same group because they voted almost identically.",
  },
  ar: {
    groupsTitle: "مجموعات الرأي",
    groupsSubtitle: "تُنشأ المجموعات بناءً على سلوك التصويت، بغض النظر عن اللغة. ثم يقرأ نموذج ذكاء اصطناعي مقترحات كل مجموعة لمنحها اسمًا وملخصًا.",
    groupsSubtitleNoAi: "تُنشأ المجموعات بناءً على سلوك التصويت، بغض النظر عن اللغة.",
    notEnoughGroupsMessage: "لا توجد مجموعات كافية للعرض.",
    imbalanceNotice: "معظم المشاركين في نفس المجموعة لأنهم صوّتوا بشكل شبه متطابق.",
  },
  es: {
    groupsTitle: "Grupos de opinión",
    groupsSubtitle: "Los grupos se crean en función del comportamiento de voto, sin tener en cuenta el idioma. Luego, un modelo de inteligencia artificial lee las proposiciones de cada grupo para darles un nombre y un resumen.",
    groupsSubtitleNoAi: "Los grupos se crean en función del comportamiento de voto, sin tener en cuenta el idioma.",
    notEnoughGroupsMessage: "No hay suficientes grupos para mostrar.",
    imbalanceNotice: "La mayoría de los participantes están en el mismo grupo porque votaron de manera casi idéntica.",
  },
  fr: {
    groupsTitle: "Groupes d'opinion",
    groupsSubtitle: "Les groupes sont créés en fonction des comportements de vote, sans tenir compte de la langue. Ensuite, un modèle d'intelligence artificielle lit les propositions de chaque groupe pour leur donner un nom et un résumé.",
    groupsSubtitleNoAi: "Les groupes sont créés en fonction des comportements de vote, sans tenir compte de la langue.",
    notEnoughGroupsMessage: "Pas assez de groupes à afficher.",
    imbalanceNotice: "La plupart des participants sont dans le même groupe car ils ont voté de manière quasi identique.",
  },
  "zh-Hans": {
    groupsTitle: "意见群组",
    groupsSubtitle: "群组根据投票行为创建，与语言无关。然后由人工智能模型阅读各群组的观点，为其生成名称和摘要。",
    groupsSubtitleNoAi: "群组根据投票行为创建，与语言无关。",
    notEnoughGroupsMessage: "群组数量不足以显示。",
    imbalanceNotice: "大多数参与者在同一群组中，因为他们的投票几乎完全相同。",
  },
  "zh-Hant": {
    groupsTitle: "意見群組",
    groupsSubtitle: "群組根據投票行為建立，與語言無關。然後由人工智慧模型閱讀各群組的觀點，為其產生名稱和摘要。",
    groupsSubtitleNoAi: "群組根據投票行為建立，與語言無關。",
    notEnoughGroupsMessage: "群組數量不足以顯示。",
    imbalanceNotice: "大多數參與者在同一群組中，因為他們的投票幾乎完全相同。",
  },
  ja: {
    groupsTitle: "意見グループ",
    groupsSubtitle: "グループは投票行動に基づいて作成され、言語は考慮されません。その後、AIモデルが各グループの意見を読み取り、名前と要約を生成します。",
    groupsSubtitleNoAi: "グループは投票行動に基づいて作成され、言語は考慮されません。",
    notEnoughGroupsMessage: "表示するグループが不足しています。",
    imbalanceNotice: "ほとんどの参加者はほぼ同じ投票をしたため、同じグループに属しています。",
  },
};
