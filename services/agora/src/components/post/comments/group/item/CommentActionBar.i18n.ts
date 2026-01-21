import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentActionBarTranslations {
  disagree: string;
  pass: string;
  agree: string;
  voteFailed: string;
  conversationClosed: string;
  closedConversationTooltip: string;
  disagreeAriaLabel: string;
  passAriaLabel: string;
  agreeAriaLabel: string;
  // Vote unlock banner
  keepVotingToDiscoverGroup: string;
  keepVotingToRefineAnalysis: string;
  assignedGroup: string;
  viewAnalysis: string;
}

export const commentActionBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentActionBarTranslations
> = {
  en: {
    disagree: "Disagree",
    pass: "Unsure",
    agree: "Agree",
    voteFailed: "Failed to submit vote. Please try again.",
    conversationClosed:
      "Cannot vote because the conversation was closed by the author.",
    closedConversationTooltip:
      "Voting is disabled - conversation has been closed or locked",
    disagreeAriaLabel: "Disagree with comment. Current disagrees:",
    passAriaLabel: "Unsure about this comment. Current count:",
    agreeAriaLabel: "Agree with comment. Current agrees:",
    keepVotingToDiscoverGroup: "Keep voting to discover your group",
    keepVotingToRefineAnalysis: "Keep voting to refine the analysis",
    assignedGroup: "You have been assigned a group!",
    viewAnalysis: "View analysis",
  },
  ar: {
    disagree: "أرفض",
    pass: "غير متأكد",
    agree: "أوافق",
    voteFailed: "فشل في إرسال التصويت. يرجى المحاولة مرة أخرى.",
    conversationClosed: "لا يمكن التصويت لأن المحادثة تم إغلاقها من قبل المؤلف.",
    closedConversationTooltip:
      "التصويت معطل - تم إغلاق المحادثة أو قفلها",
    disagreeAriaLabel: "أرفض التعليق. عدد الرفض الحالي:",
    passAriaLabel: "لست متأكداً من هذا الرأي. العدد الحالي:",
    agreeAriaLabel: "أوافق على التعليق. عدد الموافقة الحالي:",
    keepVotingToDiscoverGroup: "استمر في التصويت لاكتشاف مجموعتك",
    keepVotingToRefineAnalysis: "استمر في التصويت لتحسين التحليل",
    assignedGroup: "تم تعيينك إلى مجموعة!",
    viewAnalysis: "عرض التحليل",
  },
  es: {
    disagree: "En desacuerdo",
    pass: "No seguro",
    agree: "De acuerdo",
    voteFailed: "Error al enviar el voto. Por favor, inténtelo de nuevo.",
    conversationClosed:
      "No se puede votar porque la conversación fue cerrada por el autor.",
    closedConversationTooltip:
      "La votación está deshabilitada - la conversación ha sido cerrada o bloqueada",
    disagreeAriaLabel: "En desacuerdo con el comentario. Desacuerdos actuales:",
    passAriaLabel: "Inseguro sobre esta opinión. Recuento actual:",
    agreeAriaLabel: "De acuerdo con el comentario. Acuerdos actuales:",
    keepVotingToDiscoverGroup: "Sigue votando para descubrir tu grupo",
    keepVotingToRefineAnalysis: "Sigue votando para refinar el análisis",
    assignedGroup: "¡Te han asignado un grupo!",
    viewAnalysis: "Ver análisis",
  },
  fr: {
    disagree: "Pas d'accord",
    pass: "Incertain",
    agree: "D'accord",
    voteFailed: "Échec de l'envoi du vote. Veuillez réessayer.",
    conversationClosed:
      "Impossible de voter car la conversation a été fermée par l'auteur.",
    closedConversationTooltip:
      "Le vote est désactivé - la conversation a été fermée ou verrouillée",
    disagreeAriaLabel: "Pas d'accord avec le commentaire. Désaccords actuels:",
    passAriaLabel: "Incertain à propos de cet avis. Nombre actuel :",
    agreeAriaLabel: "D'accord avec le commentaire. Accords actuels:",
    keepVotingToDiscoverGroup: "Continuez à voter pour découvrir votre groupe",
    keepVotingToRefineAnalysis: "Continuez à voter pour affiner l'analyse",
    assignedGroup: "Vous avez été assigné à un groupe !",
    viewAnalysis: "Voir l'analyse",
  },
  "zh-Hans": {
    disagree: "不同意",
    pass: "不确定",
    agree: "同意",
    voteFailed: "投票提交失败。请重试。",
    conversationClosed: "无法投票，因为对话已被作者关闭。",
    closedConversationTooltip: "投票已禁用 - 对话已被关闭或锁定",
    disagreeAriaLabel: "不同意此评论。当前不同意数：",
    passAriaLabel: "对该观点不确定。当前不确定数：",
    agreeAriaLabel: "同意此评论。当前同意数：",
    keepVotingToDiscoverGroup: "继续投票以发现您的群组",
    keepVotingToRefineAnalysis: "继续投票以完善分析",
    assignedGroup: "您已被分配到一个群组！",
    viewAnalysis: "查看分析",
  },
  "zh-Hant": {
    disagree: "不同意",
    pass: "不確定",
    agree: "同意",
    voteFailed: "投票提交失敗。請重試。",
    conversationClosed: "無法投票，因為對話已被作者關閉。",
    closedConversationTooltip: "投票已禁用 - 對話已被關閉或鎖定",
    disagreeAriaLabel: "不同意此評論。當前不同意數：",
    passAriaLabel: "對該觀點不確定。當前不確定數：",
    agreeAriaLabel: "同意此評論。當前同意數：",
    keepVotingToDiscoverGroup: "繼續投票以發現您的群組",
    keepVotingToRefineAnalysis: "繼續投票以完善分析",
    assignedGroup: "您已被分配到一個群組！",
    viewAnalysis: "查看分析",
  },
  ja: {
    disagree: "不同意",
    pass: "わからない",
    agree: "同意",
    voteFailed: "投票の送信に失敗しました。もう一度お試しください。",
    conversationClosed: "会話が作成者によって閉じられたため、投票できません。",
    closedConversationTooltip:
      "投票は無効です - 会話は閉じられたかロックされています",
    disagreeAriaLabel: "コメントに不同意。現在の不同意数：",
    passAriaLabel: "この意見について不確かです。現在の数：",
    agreeAriaLabel: "コメントに同意。現在の同意数：",
    keepVotingToDiscoverGroup: "投票を続けてグループを見つけましょう",
    keepVotingToRefineAnalysis: "投票を続けて分析を改善しましょう",
    assignedGroup: "グループに割り当てられました！",
    viewAnalysis: "分析を見る",
  },
};
