import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostMetadataTranslations {
  closeConfirmMessage: string;
  closeConfirmButton: string;
  reopenConfirmMessage: string;
  reopenConfirmButton: string;
  cancelButton: string;
  closeSuccess: string;
  openSuccess: string;
  closeNotAllowed: string;
  openNotAllowed: string;
  alreadyClosed: string;
  alreadyOpen: string;
}

export const postMetadataTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostMetadataTranslations
> = {
  en: {
    closeConfirmMessage:
      "Are you sure you want to close this conversation? Users will not be able to post new statements or votes.",
    closeConfirmButton: "Close conversation",
    reopenConfirmMessage:
      "Reopen this conversation? Users will be able to post statements and vote again.",
    reopenConfirmButton: "Reopen conversation",
    cancelButton: "Cancel",
    closeSuccess: "Conversation closed successfully",
    openSuccess: "Conversation opened successfully",
    closeNotAllowed: "You are not allowed to close this conversation",
    openNotAllowed: "You are not allowed to open this conversation",
    alreadyClosed: "This conversation is already closed",
    alreadyOpen: "This conversation is already open",
  },
  ar: {
    closeConfirmMessage:
      "هل أنت متأكد أنك تريد إغلاق هذه المحادثة؟ لن يتمكن المستخدمون من نشر مقترحات أو تصويتات جديدة.",
    closeConfirmButton: "إغلاق المحادثة",
    reopenConfirmMessage:
      "إعادة فتح هذه المحادثة؟ سيتمكن المستخدمون من نشر المقترحات والتصويت مرة أخرى.",
    reopenConfirmButton: "إعادة فتح المحادثة",
    cancelButton: "إلغاء",
    closeSuccess: "تم إغلاق المحادثة بنجاح",
    openSuccess: "تم فتح المحادثة بنجاح",
    closeNotAllowed: "غير مسموح لك بإغلاق هذه المحادثة",
    openNotAllowed: "غير مسموح لك بفتح هذه المحادثة",
    alreadyClosed: "هذه المحادثة مغلقة بالفعل",
    alreadyOpen: "هذه المحادثة مفتوحة بالفعل",
  },
  es: {
    closeConfirmMessage:
      "¿Estás seguro de que quieres cerrar esta conversación? Los usuarios no podrán publicar nuevas proposiciones o votos.",
    closeConfirmButton: "Cerrar conversación",
    reopenConfirmMessage:
      "¿Reabrir esta conversación? Los usuarios podrán publicar proposiciones y votar de nuevo.",
    reopenConfirmButton: "Reabrir conversación",
    cancelButton: "Cancelar",
    closeSuccess: "Conversación cerrada exitosamente",
    openSuccess: "Conversación abierta exitosamente",
    closeNotAllowed: "No tienes permiso para cerrar esta conversación",
    openNotAllowed: "No tienes permiso para abrir esta conversación",
    alreadyClosed: "Esta conversación ya está cerrada",
    alreadyOpen: "Esta conversación ya está abierta",
  },
  fr: {
    closeConfirmMessage:
      "Êtes-vous sûr de vouloir fermer cette conversation ? Les utilisateurs ne pourront pas publier de nouvelles propositions ou votes.",
    closeConfirmButton: "Fermer la conversation",
    reopenConfirmMessage:
      "Rouvrir cette conversation ? Les utilisateurs pourront à nouveau publier des propositions et voter.",
    reopenConfirmButton: "Rouvrir la conversation",
    cancelButton: "Annuler",
    closeSuccess: "Conversation fermée avec succès",
    openSuccess: "Conversation ouverte avec succès",
    closeNotAllowed: "Vous n'êtes pas autorisé à fermer cette conversation",
    openNotAllowed: "Vous n'êtes pas autorisé à ouvrir cette conversation",
    alreadyClosed: "Cette conversation est déjà fermée",
    alreadyOpen: "Cette conversation est déjà ouverte",
  },
  "zh-Hans": {
    closeConfirmMessage: "您确定要关闭此对话吗？用户将无法发布新观点或投票。",
    closeConfirmButton: "关闭对话",
    reopenConfirmMessage: "重新打开此对话？用户将能够再次发布观点和投票。",
    reopenConfirmButton: "重新打开对话",
    cancelButton: "取消",
    closeSuccess: "成功关闭对话",
    openSuccess: "成功打开对话",
    closeNotAllowed: "您无权关闭此对话",
    openNotAllowed: "您无权打开此对话",
    alreadyClosed: "此对话已关闭",
    alreadyOpen: "此对话已打开",
  },
  "zh-Hant": {
    closeConfirmMessage: "您確定要關閉此對話嗎？用戶將無法發布新觀點或投票。",
    closeConfirmButton: "關閉對話",
    reopenConfirmMessage: "重新打開此對話？用戶將能夠再次發布觀點和投票。",
    reopenConfirmButton: "重新打開對話",
    cancelButton: "取消",
    closeSuccess: "成功關閉對話",
    openSuccess: "成功打開對話",
    closeNotAllowed: "您無權關閉此對話",
    openNotAllowed: "您無權打開此對話",
    alreadyClosed: "此對話已關閉",
    alreadyOpen: "此對話已打開",
  },
  ja: {
    closeConfirmMessage:
      "この会話を閉じてもよろしいですか？ユーザーは新しい主張や投票を投稿できなくなります。",
    closeConfirmButton: "会話を閉じる",
    reopenConfirmMessage:
      "この会話を再開しますか？ユーザーは再び主張を投稿したり投票したりできるようになります。",
    reopenConfirmButton: "会話を再開する",
    cancelButton: "キャンセル",
    closeSuccess: "会話を正常に閉じました",
    openSuccess: "会話を正常に開きました",
    closeNotAllowed: "この会話を閉じる権限がありません",
    openNotAllowed: "この会話を開く権限がありません",
    alreadyClosed: "この会話はすでに閉じられています",
    alreadyOpen: "この会話はすでに開いています",
  },
};
