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
};
