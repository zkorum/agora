import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentActionBarTranslations {
  disagree: string;
  pass: string;
  agree: string;
  voteChangeDisabled: string;
  voteFailed: string;
  disagreeAriaLabel: string;
  passAriaLabel: string;
  agreeAriaLabel: string;
}

export const commentActionBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentActionBarTranslations
> = {
  en: {
    disagree: "Disagree",
    pass: "Unsure",
    agree: "Agree",
    voteChangeDisabled: "Vote change temporarily disabled",
    voteFailed: "Failed to submit vote. Please try again.",
    disagreeAriaLabel: "Disagree with comment. Current disagrees:",
    passAriaLabel: "Unsure about this comment. Current count:",
    agreeAriaLabel: "Agree with comment. Current agrees:",
  },
  ar: {
    disagree: "أرفض",
    pass: "غير متأكد",
    agree: "أوافق",
    voteChangeDisabled: "تغيير التصويت معطل مؤقتاً",
    voteFailed: "فشل في إرسال التصويت. يرجى المحاولة مرة أخرى.",
    disagreeAriaLabel: "أرفض التعليق. عدد الرفض الحالي:",
    passAriaLabel: "لست متأكداً من هذا الرأي. العدد الحالي:",
    agreeAriaLabel: "أوافق على التعليق. عدد الموافقة الحالي:",
  },
  es: {
    disagree: "En desacuerdo",
    pass: "No seguro",
    agree: "De acuerdo",
    voteChangeDisabled: "Cambio de voto temporalmente deshabilitado",
    voteFailed: "Error al enviar el voto. Por favor, inténtelo de nuevo.",
    disagreeAriaLabel: "En desacuerdo con el comentario. Desacuerdos actuales:",
    passAriaLabel: "Inseguro sobre esta opinión. Recuento actual:",
    agreeAriaLabel: "De acuerdo con el comentario. Acuerdos actuales:",
  },
  fr: {
    disagree: "Pas d'accord",
    pass: "Incertain",
    agree: "D'accord",
    voteChangeDisabled: "Changement de vote temporairement désactivé",
    voteFailed: "Échec de l'envoi du vote. Veuillez réessayer.",
    disagreeAriaLabel: "Pas d'accord avec le commentaire. Désaccords actuels:",
    passAriaLabel: "Incertain à propos de cet avis. Nombre actuel :",
    agreeAriaLabel: "D'accord avec le commentaire. Accords actuels:",
  },
  "zh-Hans": {
    disagree: "不同意",
    pass: "不确定",
    agree: "同意",
    voteChangeDisabled: "投票更改暂时禁用",
    voteFailed: "投票提交失败。请重试。",
    disagreeAriaLabel: "不同意此评论。当前不同意数：",
    passAriaLabel: "对该观点不确定。当前不确定数：",
    agreeAriaLabel: "同意此评论。当前同意数：",
  },
  "zh-Hant": {
    disagree: "不同意",
    pass: "不確定",
    agree: "同意",
    voteChangeDisabled: "投票更改暫時禁用",
    voteFailed: "投票提交失敗。請重試。",
    disagreeAriaLabel: "不同意此評論。當前不同意數：",
    passAriaLabel: "對該觀點不確定。當前不確定數：",
    agreeAriaLabel: "同意此評論。當前同意數：",
  },
  ja: {
    disagree: "不同意",
    pass: "わからない",
    agree: "同意",
    voteChangeDisabled: "投票変更が一時的に無効化されています",
    voteFailed: "投票の送信に失敗しました。もう一度お試しください。",
    disagreeAriaLabel: "コメントに不同意。現在の不同意数：",
    passAriaLabel: "この意見について不確かです。現在の数：",
    agreeAriaLabel: "コメントに同意。現在の同意数：",
  },
};
