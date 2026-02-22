import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

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
  SupportedDisplayLanguageCodes,
  OpinionModerationTranslations
> = {
  en: {
    title: "Moderate the statement",
    actionLabel: "Action",
    reasonLabel: "Reason",
    explanationLabel: "Explanation (optional)",
    moderateButton: "Moderate",
    modifyButton: "Modify",
    withdrawButton: "Withdraw",
  },
  ar: {
    title: "إشراف على المقترح",
    actionLabel: "الإجراء",
    reasonLabel: "السبب",
    explanationLabel: "الشرح (اختياري)",
    moderateButton: "إشراف",
    modifyButton: "تعديل",
    withdrawButton: "سحب",
  },
  es: {
    title: "Moderar la proposición",
    actionLabel: "Acción",
    reasonLabel: "Razón",
    explanationLabel: "Explicación (opcional)",
    moderateButton: "Moderar",
    modifyButton: "Modificar",
    withdrawButton: "Retirar",
  },
  fr: {
    title: "Modérer la proposition",
    actionLabel: "Action",
    reasonLabel: "Raison",
    explanationLabel: "Explication (facultatif)",
    moderateButton: "Modérer",
    modifyButton: "Modifier",
    withdrawButton: "Retirer",
  },
  "zh-Hans": {
    title: "管理观点",
    actionLabel: "操作",
    reasonLabel: "原因",
    explanationLabel: "解释（可选）",
    moderateButton: "管理",
    modifyButton: "修改",
    withdrawButton: "撤回",
  },
  "zh-Hant": {
    title: "管理觀點",
    actionLabel: "操作",
    reasonLabel: "原因",
    explanationLabel: "解釋（可選）",
    moderateButton: "管理",
    modifyButton: "修改",
    withdrawButton: "撤回",
  },
  ja: {
    title: "主張を管理",
    actionLabel: "操作",
    reasonLabel: "理由",
    explanationLabel: "説明（任意）",
    moderateButton: "管理",
    modifyButton: "修正",
    withdrawButton: "取り下げ",
  },
};
