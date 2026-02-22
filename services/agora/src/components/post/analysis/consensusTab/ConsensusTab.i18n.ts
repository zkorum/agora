import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConsensusTabTranslations {
  agreementsTitle: string;
  disagreementsTitle: string;
  agreementsLongTitle: string;
  disagreementsLongTitle: string;
  agreementsKeyword: string;
  disagreementsKeyword: string;
  statisticalSubtitleAgree: string;
  statisticalSubtitleDisagree: string;
  loadMore: string;
  noAgreementsMessage: string;
  noDisagreementsMessage: string;
  lowerRankedDivider: string;
}

export const consensusTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConsensusTabTranslations
> = {
  en: {
    agreementsTitle: "Agreements",
    disagreementsTitle: "Disagreements",
    agreementsLongTitle:
      "What do people across all groups {keyword} with?",
    disagreementsLongTitle:
      "What do people across all groups {keyword} with?",
    agreementsKeyword: "agree",
    disagreementsKeyword: "disagree",
    statisticalSubtitleAgree:
      "Statements every opinion group agrees with, not just the overall majority. Ranked by cross-group agreement strength.",
    statisticalSubtitleDisagree:
      "Statements every opinion group disagrees with, not just the overall majority. Ranked by cross-group disagreement strength.",
    loadMore: "Load more",
    noAgreementsMessage: "No significant agreements found yet.",
    noDisagreementsMessage: "No significant disagreements found yet.",
    lowerRankedDivider: "Lower-ranked",
  },
  ar: {
    agreementsTitle: "اتفاقات",
    disagreementsTitle: "خلافات",
    agreementsLongTitle:
      "على ماذا {keyword} المشاركون عبر مجموعات الرأي؟",
    disagreementsLongTitle:
      "على ماذا {keyword} المشاركون عبر مجموعات الرأي؟",
    agreementsKeyword: "يتفق",
    disagreementsKeyword: "يختلف",
    statisticalSubtitleAgree:
      "مقترحات تتفق عليها جميع مجموعات الرأي، وليس فقط الأغلبية. مرتبة حسب قوة الاتفاق بين المجموعات.",
    statisticalSubtitleDisagree:
      "مقترحات تختلف عليها جميع مجموعات الرأي، وليس فقط الأغلبية. مرتبة حسب قوة الخلاف بين المجموعات.",
    loadMore: "تحميل المزيد",
    noAgreementsMessage: "لم يتم العثور على اتفاقات ذات دلالة بعد.",
    noDisagreementsMessage: "لم يتم العثور على خلافات ذات دلالة بعد.",
    lowerRankedDivider: "أقل ترتيبًا",
  },
  es: {
    agreementsTitle: "Acuerdos",
    disagreementsTitle: "Desacuerdos",
    agreementsLongTitle:
      "¿En qué están {keyword} los participantes entre los grupos de opinión?",
    disagreementsLongTitle:
      "¿En qué no están {keyword} los participantes entre los grupos de opinión?",
    agreementsKeyword: "de acuerdo",
    disagreementsKeyword: "de acuerdo",
    statisticalSubtitleAgree:
      "Afirmaciones con las que todos los grupos de opinión están de acuerdo, no solo la mayoría. Clasificadas por fuerza del acuerdo entre grupos.",
    statisticalSubtitleDisagree:
      "Afirmaciones con las que todos los grupos de opinión están en desacuerdo, no solo la mayoría. Clasificadas por fuerza del desacuerdo entre grupos.",
    loadMore: "Cargar más",
    noAgreementsMessage: "Aún no se encontraron acuerdos significativos.",
    noDisagreementsMessage: "Aún no se encontraron desacuerdos significativos.",
    lowerRankedDivider: "Menor clasificación",
  },
  fr: {
    agreementsTitle: "Accords",
    disagreementsTitle: "Désaccords",
    agreementsLongTitle:
      "Sur quoi les participants sont-ils {keyword} à travers les groupes d'opinion ?",
    disagreementsLongTitle:
      "Sur quoi les participants sont-ils en {keyword} à travers les groupes d'opinion ?",
    agreementsKeyword: "d'accord",
    disagreementsKeyword: "désaccord",
    statisticalSubtitleAgree:
      "Propositions sur lesquelles tous les groupes d'opinion sont d'accord, pas seulement la majorité. Classées par force de l'accord entre groupes.",
    statisticalSubtitleDisagree:
      "Propositions sur lesquelles tous les groupes d'opinion sont en désaccord, pas seulement la majorité. Classées par force du désaccord entre groupes.",
    loadMore: "Charger plus",
    noAgreementsMessage: "Aucun accord significatif trouvé pour le moment.",
    noDisagreementsMessage: "Aucun désaccord significatif trouvé pour le moment.",
    lowerRankedDivider: "Classement inférieur",
  },
  "zh-Hans": {
    agreementsTitle: "共识",
    disagreementsTitle: "分歧",
    agreementsLongTitle: "参与者在各意见群组之间对什么达成{keyword}？",
    disagreementsLongTitle: "参与者在各意见群组之间对什么表示{keyword}？",
    agreementsKeyword: "共识",
    disagreementsKeyword: "反对",
    statisticalSubtitleAgree:
      "所有意见群组都同意的观点，而非仅仅是多数人的意见。按跨群组共识强度排名。",
    statisticalSubtitleDisagree:
      "所有意见群组都反对的观点，而非仅仅是多数人的意见。按跨群组反对强度排名。",
    loadMore: "加载更多",
    noAgreementsMessage: "尚未找到显著的共识。",
    noDisagreementsMessage: "尚未找到显著的分歧。",
    lowerRankedDivider: "排名较低",
  },
  "zh-Hant": {
    agreementsTitle: "共識",
    disagreementsTitle: "分歧",
    agreementsLongTitle: "參與者在各意見群組之間對什麼達成{keyword}？",
    disagreementsLongTitle: "參與者在各意見群組之間對什麼表示{keyword}？",
    agreementsKeyword: "共識",
    disagreementsKeyword: "反對",
    statisticalSubtitleAgree:
      "所有意見群組都同意的觀點，而非僅僅是多數人的意見。按跨群組共識強度排名。",
    statisticalSubtitleDisagree:
      "所有意見群組都反對的觀點，而非僅僅是多數人的意見。按跨群組反對強度排名。",
    loadMore: "載入更多",
    noAgreementsMessage: "尚未找到顯著的共識。",
    noDisagreementsMessage: "尚未找到顯著的分歧。",
    lowerRankedDivider: "排名較低",
  },
  ja: {
    agreementsTitle: "合意",
    disagreementsTitle: "不一致",
    agreementsLongTitle:
      "意見グループを超えて参加者が{keyword}していることは何ですか？",
    disagreementsLongTitle:
      "意見グループを超えて参加者が{keyword}していることは何ですか？",
    agreementsKeyword: "同意",
    disagreementsKeyword: "反対",
    statisticalSubtitleAgree:
      "単なる多数派ではなく、すべての意見グループが同意している意見です。グループ間の合意の強さで順位付け。",
    statisticalSubtitleDisagree:
      "単なる多数派ではなく、すべての意見グループが反対している意見です。グループ間の反対の強さで順位付け。",
    loadMore: "もっと読み込む",
    noAgreementsMessage: "有意な合意はまだ見つかりません。",
    noDisagreementsMessage: "有意な不一致はまだ見つかりません。",
    lowerRankedDivider: "順位が低い",
  },
};
