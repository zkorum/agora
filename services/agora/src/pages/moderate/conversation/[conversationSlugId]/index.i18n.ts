export interface ConversationModerationTranslations {
  moderateConversation: string;
  action: string;
  reason: string;
  explanationOptional: string;
  modify: string;
  moderate: string;
  withdraw: string;
  [key: string]: string;
}

export const conversationModerationTranslations: Record<
  string,
  ConversationModerationTranslations
> = {
  en: {
    moderateConversation: "Moderate the conversation",
    action: "Action",
    reason: "Reason",
    explanationOptional: "Explanation (optional)",
    modify: "Modify",
    moderate: "Moderate",
    withdraw: "Withdraw",
  },
  es: {
    moderateConversation: "Moderar la conversación",
    action: "Acción",
    reason: "Razón",
    explanationOptional: "Explicación (opcional)",
    modify: "Modificar",
    moderate: "Moderar",
    withdraw: "Retirar",
  },
  fr: {
    moderateConversation: "Modérer la conversation",
    action: "Action",
    reason: "Raison",
    explanationOptional: "Explication (optionnelle)",
    modify: "Modifier",
    moderate: "Modérer",
    withdraw: "Retirer",
  },
  "zh-Hans": {
    moderateConversation: "管理对话",
    action: "操作",
    reason: "原因",
    explanationOptional: "解释（可选）",
    modify: "修改",
    moderate: "管理",
    withdraw: "撤回",
  },
  "zh-Hant": {
    moderateConversation: "管理對話",
    action: "操作",
    reason: "原因",
    explanationOptional: "解釋（可選）",
    modify: "修改",
    moderate: "管理",
    withdraw: "撤回",
  },
  ja: {
    moderateConversation: "会話を管理",
    action: "操作",
    reason: "理由",
    explanationOptional: "説明（任意）",
    modify: "修正",
    moderate: "管理",
    withdraw: "取り下げ",
  },
};
