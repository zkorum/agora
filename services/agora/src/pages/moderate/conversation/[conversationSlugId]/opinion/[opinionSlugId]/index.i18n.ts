export interface OpinionModerationTranslations {
  title: string;
  actionLabel: string;
  reasonLabel: string;
  explanationLabel: string;
  moderateButton: string;
  modifyButton: string;
  withdrawButton: string;
}

export const opinionModerationTranslations: Record<
  string,
  OpinionModerationTranslations
> = {
  en: {
    title: "Moderate the opinion",
    actionLabel: "Action",
    reasonLabel: "Reason",
    explanationLabel: "Explanation (optional)",
    moderateButton: "Moderate",
    modifyButton: "Modify",
    withdrawButton: "Withdraw",
  },
  ar: {
    title: "إشراف على الرأي",
    actionLabel: "الإجراء",
    reasonLabel: "السبب",
    explanationLabel: "الشرح (اختياري)",
    moderateButton: "إشراف",
    modifyButton: "تعديل",
    withdrawButton: "سحب",
  },
  es: {
    title: "Moderar la opinión",
    actionLabel: "Acción",
    reasonLabel: "Razón",
    explanationLabel: "Explicación (opcional)",
    moderateButton: "Moderar",
    modifyButton: "Modificar",
    withdrawButton: "Retirar",
  },
  fr: {
    title: "Modérer l'opinion",
    actionLabel: "Action",
    reasonLabel: "Raison",
    explanationLabel: "Explication (facultatif)",
    moderateButton: "Modérer",
    modifyButton: "Modifier",
    withdrawButton: "Retirer",
  },
  "zh-Hans": {
    title: "管理意见",
    actionLabel: "操作",
    reasonLabel: "原因",
    explanationLabel: "解释（可选）",
    moderateButton: "管理",
    modifyButton: "修改",
    withdrawButton: "撤回",
  },
  "zh-Hant": {
    title: "管理意見",
    actionLabel: "操作",
    reasonLabel: "原因",
    explanationLabel: "解釋（可選）",
    moderateButton: "管理",
    modifyButton: "修改",
    withdrawButton: "撤回",
  },
  ja: {
    title: "意見を管理",
    actionLabel: "操作",
    reasonLabel: "理由",
    explanationLabel: "説明（任意）",
    moderateButton: "管理",
    modifyButton: "修正",
    withdrawButton: "取り下げ",
  },
};
