import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationMutationsTranslations {
  closeSuccess: string;
  openSuccess: string;
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
    closeSuccess: "Conversation closed",
    openSuccess: "Conversation reopened",
    closeError: "Failed to close conversation. Please try again.",
    openError: "Failed to open conversation. Please try again.",
    closeNotAllowed: "You are not allowed to close this conversation",
    openNotAllowed: "You are not allowed to open this conversation",
    alreadyClosed: "This conversation is already closed",
    alreadyOpen: "This conversation is already open",
  },
  ar: {
    closeSuccess: "تم إغلاق المحادثة",
    openSuccess: "تمت إعادة فتح المحادثة",
    closeError: "فشل إغلاق المحادثة. يرجى المحاولة مرة أخرى.",
    openError: "فشل فتح المحادثة. يرجى المحاولة مرة أخرى.",
    closeNotAllowed: "غير مسموح لك بإغلاق هذه المحادثة",
    openNotAllowed: "غير مسموح لك بفتح هذه المحادثة",
    alreadyClosed: "هذه المحادثة مغلقة بالفعل",
    alreadyOpen: "هذه المحادثة مفتوحة بالفعل",
  },
  es: {
    closeSuccess: "Conversación cerrada",
    openSuccess: "Conversación reabierta",
    closeError: "No se pudo cerrar la conversación. Inténtalo de nuevo.",
    openError: "No se pudo abrir la conversación. Inténtalo de nuevo.",
    closeNotAllowed: "No tienes permiso para cerrar esta conversación",
    openNotAllowed: "No tienes permiso para abrir esta conversación",
    alreadyClosed: "Esta conversación ya está cerrada",
    alreadyOpen: "Esta conversación ya está abierta",
  },
  fa: {
    closeSuccess: "گفتگو بسته شد",
    openSuccess: "گفتگو دوباره باز شد",
    closeError: "بستن گفتگو ناموفق بود. لطفاً دوباره تلاش کنید.",
    openError: "باز کردن گفتگو ناموفق بود. لطفاً دوباره تلاش کنید.",
    closeNotAllowed: "شما مجاز به بستن این گفتگو نیستید",
    openNotAllowed: "شما مجاز به باز کردن این گفتگو نیستید",
    alreadyClosed: "این گفتگو قبلاً بسته شده است",
    alreadyOpen: "این گفتگو قبلاً باز است",
  },
  he: {
    closeSuccess: "השיחה נסגרה",
    openSuccess: "השיחה נפתחה מחדש",
    closeError: "סגירת השיחה נכשלה. אנא נסו שוב.",
    openError: "פתיחת השיחה נכשלה. אנא נסו שוב.",
    closeNotAllowed: "אינכם מורשים לסגור שיחה זו",
    openNotAllowed: "אינכם מורשים לפתוח שיחה זו",
    alreadyClosed: "שיחה זו כבר סגורה",
    alreadyOpen: "שיחה זו כבר פתוחה",
  },
  fr: {
    closeSuccess: "Conversation fermée",
    openSuccess: "Conversation rouverte",
    closeError:
      "Impossible de fermer la conversation. Veuillez réessayer.",
    openError: "Impossible d'ouvrir la conversation. Veuillez réessayer.",
    closeNotAllowed: "Vous n'êtes pas autorisé à fermer cette conversation",
    openNotAllowed: "Vous n'êtes pas autorisé à ouvrir cette conversation",
    alreadyClosed: "Cette conversation est déjà fermée",
    alreadyOpen: "Cette conversation est déjà ouverte",
  },
  "zh-Hans": {
    closeSuccess: "对话已关闭",
    openSuccess: "对话已重新打开",
    closeError: "关闭对话失败。请重试。",
    openError: "打开对话失败。请重试。",
    closeNotAllowed: "您无权关闭此对话",
    openNotAllowed: "您无权打开此对话",
    alreadyClosed: "此对话已关闭",
    alreadyOpen: "此对话已打开",
  },
  "zh-Hant": {
    closeSuccess: "對話已關閉",
    openSuccess: "對話已重新打開",
    closeError: "關閉對話失敗。請重試。",
    openError: "打開對話失敗。請重試。",
    closeNotAllowed: "您無權關閉此對話",
    openNotAllowed: "您無權打開此對話",
    alreadyClosed: "此對話已關閉",
    alreadyOpen: "此對話已打開",
  },
  ja: {
    closeSuccess: "会話を閉じました",
    openSuccess: "会話を再開しました",
    closeError: "会話を閉じることができませんでした。もう一度お試しください。",
    openError: "会話を開くことができませんでした。もう一度お試しください。",
    closeNotAllowed: "この会話を閉じる権限がありません",
    openNotAllowed: "この会話を開く権限がありません",
    alreadyClosed: "この会話はすでに閉じられています",
    alreadyOpen: "この会話はすでに開いています",
  },
  ky: {
    closeSuccess: "Талкуу жабылды",
    openSuccess: "Талкуу кайра ачылды",
    closeError: "Талкууну жабуу ишке ашкан жок. Кайра аракет кылыңыз.",
    openError: "Талкууну ачуу ишке ашкан жок. Кайра аракет кылыңыз.",
    closeNotAllowed: "Бул талкууну жабууга уруксатыңыз жок",
    openNotAllowed: "Бул талкууну ачууга уруксатыңыз жок",
    alreadyClosed: "Бул талкуу мурунтан эле жабылган",
    alreadyOpen: "Бул талкуу мурунтан эле ачык",
  },
  ru: {
    closeSuccess: "Обсуждение закрыто",
    openSuccess: "Обсуждение снова открыто",
    closeError:
      "Не удалось закрыть обсуждение. Пожалуйста, попробуйте снова.",
    openError:
      "Не удалось открыть обсуждение. Пожалуйста, попробуйте снова.",
    closeNotAllowed: "У вас нет разрешения закрыть это обсуждение",
    openNotAllowed: "У вас нет разрешения открыть это обсуждение",
    alreadyClosed: "Это обсуждение уже закрыто",
    alreadyOpen: "Это обсуждение уже открыто",
  },
};
