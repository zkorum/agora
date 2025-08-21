export interface ReportContentDialogTranslations {
  submitReportTitle: string;
  improveCommunityText: string;
  thanksForFeedbackTitle: string;
  flaggingReasonText: string;
  addExplanationLabel: string;
  skipButton: string;
  submitButton: string;
  reportTypeConversation: string;
  reportTypeOpinion: string;
  [key: string]: string;
}

export const reportContentDialogTranslations: Record<
  string,
  ReportContentDialogTranslations
> = {
  en: {
    submitReportTitle: "Submit a report",
    improveCommunityText:
      "Thank you for helping us improve the community. What is the problem with this {reportType}?",
    thanksForFeedbackTitle: "Thanks for your feedback!",
    flaggingReasonText:
      "Why are you flagging this {reportType} as {selectedReason}?",
    addExplanationLabel: "Add explanation",
    skipButton: "Skip",
    submitButton: "Submit",
    reportTypeConversation: "conversation",
    reportTypeOpinion: "opinion",
  },
  es: {
    submitReportTitle: "Enviar un reporte",
    improveCommunityText:
      "Gracias por ayudarnos a mejorar la comunidad. ¿Cuál es el problema con esta {reportType}?",
    thanksForFeedbackTitle: "¡Gracias por tu comentario!",
    flaggingReasonText:
      "¿Por qué estás marcando esta {reportType} como {selectedReason}?",
    addExplanationLabel: "Añadir explicación",
    skipButton: "Omitir",
    submitButton: "Enviar",
    reportTypeConversation: "conversación",
    reportTypeOpinion: "opinión",
  },
  fr: {
    submitReportTitle: "Soumettre un rapport",
    improveCommunityText:
      "Merci de nous aider à améliorer la communauté. Quel est le problème avec cette {reportType} ?",
    thanksForFeedbackTitle: "Merci pour votre commentaire !",
    flaggingReasonText:
      "Pourquoi signalez-vous cette {reportType} comme {selectedReason} ?",
    addExplanationLabel: "Ajouter une explication",
    skipButton: "Ignorer",
    submitButton: "Soumettre",
    reportTypeConversation: "conversation",
    reportTypeOpinion: "opinion",
  },
};
