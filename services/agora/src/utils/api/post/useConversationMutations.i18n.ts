import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationMutationsTranslations {
  closeError: string;
  openError: string;
  closeNotAllowed: string;
  openNotAllowed: string;
  alreadyClosed: string;
  alreadyOpen: string;
}

export const conversationMutationsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationMutationsTranslations
> = {
  en: {
    closeError: "Failed to close conversation. Please try again.",
    openError: "Failed to open conversation. Please try again.",
    closeNotAllowed: "You are not allowed to close this conversation",
    openNotAllowed: "You are not allowed to open this conversation",
    alreadyClosed: "This conversation is already closed",
    alreadyOpen: "This conversation is already open",
  },
  ar: {
    closeError: "فشل إغلاق المحادثة. يرجى المحاولة مرة أخرى.",
    openError: "فشل فتح المحادثة. يرجى المحاولة مرة أخرى.",
    closeNotAllowed: "غير مسموح لك بإغلاق هذه المحادثة",
    openNotAllowed: "غير مسموح لك بفتح هذه المحادثة",
    alreadyClosed: "هذه المحادثة مغلقة بالفعل",
    alreadyOpen: "هذه المحادثة مفتوحة بالفعل",
  },
  es: {
    closeError: "No se pudo cerrar la conversación. Inténtalo de nuevo.",
    openError: "No se pudo abrir la conversación. Inténtalo de nuevo.",
    closeNotAllowed: "No tienes permiso para cerrar esta conversación",
    openNotAllowed: "No tienes permiso para abrir esta conversación",
    alreadyClosed: "Esta conversación ya está cerrada",
    alreadyOpen: "Esta conversación ya está abierta",
  },
  fr: {
    closeError:
      "Impossible de fermer la conversation. Veuillez réessayer.",
    openError: "Impossible d'ouvrir la conversation. Veuillez réessayer.",
    closeNotAllowed: "Vous n'êtes pas autorisé à fermer cette conversation",
    openNotAllowed: "Vous n'êtes pas autorisé à ouvrir cette conversation",
    alreadyClosed: "Cette conversation est déjà fermée",
    alreadyOpen: "Cette conversation est déjà ouverte",
  },
  "zh-Hans": {
    closeError: "关闭对话失败。请重试。",
    openError: "打开对话失败。请重试。",
    closeNotAllowed: "您无权关闭此对话",
    openNotAllowed: "您无权打开此对话",
    alreadyClosed: "此对话已关闭",
    alreadyOpen: "此对话已打开",
  },
  "zh-Hant": {
    closeError: "關閉對話失敗。請重試。",
    openError: "打開對話失敗。請重試。",
    closeNotAllowed: "您無權關閉此對話",
    openNotAllowed: "您無權打開此對話",
    alreadyClosed: "此對話已關閉",
    alreadyOpen: "此對話已打開",
  },
  ja: {
    closeError: "会話を閉じることができませんでした。もう一度お試しください。",
    openError: "会話を開くことができませんでした。もう一度お試しください。",
    closeNotAllowed: "この会話を閉じる権限がありません",
    openNotAllowed: "この会話を開く権限がありません",
    alreadyClosed: "この会話はすでに閉じられています",
    alreadyOpen: "この会話はすでに開いています",
  },
};
