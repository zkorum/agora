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
  "zh-Hans": {
    submitReportTitle: "提交报告",
    improveCommunityText:
      "感谢您帮助我们改善社区。这个{reportType}有什么问题？",
    thanksForFeedbackTitle: "感谢您的反馈！",
    flaggingReasonText: "您为什么将此{reportType}标记为{selectedReason}？",
    addExplanationLabel: "添加说明",
    skipButton: "跳过",
    submitButton: "提交",
    reportTypeConversation: "对话",
    reportTypeOpinion: "意见",
  },
  "zh-Hant": {
    submitReportTitle: "提交報告",
    improveCommunityText:
      "感謝您幫助我們改善社區。這個{reportType}有什麼問題？",
    thanksForFeedbackTitle: "感謝您的反饋！",
    flaggingReasonText: "您為什麼將此{reportType}標記為{selectedReason}？",
    addExplanationLabel: "新增說明",
    skipButton: "跳過",
    submitButton: "提交",
    reportTypeConversation: "對話",
    reportTypeOpinion: "意見",
  },
  ja: {
    submitReportTitle: "報告を送信",
    improveCommunityText:
      "コミュニティの改善にご協力いただき、ありがとうございます。この{reportType}にどのような問題がありますか？",
    thanksForFeedbackTitle: "フィードバックをありがとうございます！",
    flaggingReasonText:
      "なぜこの{reportType}を{selectedReason}としてフラグ付けしていますか？",
    addExplanationLabel: "説明を追加",
    skipButton: "スキップ",
    submitButton: "送信",
    reportTypeConversation: "会話",
    reportTypeOpinion: "意見",
  },
};
