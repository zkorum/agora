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
};
