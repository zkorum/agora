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
  syncSuccess: string;
  syncError: string;
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
    syncSuccess: "Synced from GitHub successfully",
    syncError: "Failed to sync from GitHub",
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
    syncSuccess: "تمت المزامنة من GitHub بنجاح",
    syncError: "فشلت المزامنة من GitHub",
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
    syncSuccess: "Sincronización desde GitHub exitosa",
    syncError: "Error al sincronizar desde GitHub",
  },
  fa: {
    closeConfirmMessage: "آیا مطمئن هستید که می‌خواهید این گفتگو را ببندید؟ کاربران نمی‌توانند گزاره‌ها یا رأی‌های جدید ارسال کنند.",
    closeConfirmButton: "بستن گفتگو",
    reopenConfirmMessage: "گفتگو دوباره باز شود؟ کاربران دوباره می‌توانند گزاره ارسال کنند و رأی دهند.",
    reopenConfirmButton: "بازگشایی گفتگو",
    cancelButton: "لغو",
    closeSuccess: "گفتگو با موفقیت بسته شد",
    openSuccess: "گفتگو با موفقیت باز شد",
    closeNotAllowed: "شما مجاز به بستن این گفتگو نیستید",
    openNotAllowed: "شما مجاز به بازکردن این گفتگو نیستید",
    alreadyClosed: "این گفتگو قبلاً بسته شده است",
    alreadyOpen: "این گفتگو قبلاً باز است",
    syncSuccess: "همگام‌سازی از GitHub با موفقیت انجام شد",
    syncError: "همگام‌سازی از GitHub ناموفق بود",
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
    syncSuccess: "Synchronisation depuis GitHub réussie",
    syncError: "Échec de la synchronisation depuis GitHub",
  },
  "zh-Hans": {
    closeConfirmMessage: "您确定要关闭此对话吗？用户将无法发布新意见或投票。",
    closeConfirmButton: "关闭对话",
    reopenConfirmMessage: "重新打开此对话？用户将能够再次发布意见和投票。",
    reopenConfirmButton: "重新打开对话",
    cancelButton: "取消",
    closeSuccess: "成功关闭对话",
    openSuccess: "成功打开对话",
    closeNotAllowed: "您无权关闭此对话",
    openNotAllowed: "您无权打开此对话",
    alreadyClosed: "此对话已关闭",
    alreadyOpen: "此对话已打开",
    syncSuccess: "从 GitHub 同步成功",
    syncError: "从 GitHub 同步失败",
  },
  "zh-Hant": {
    closeConfirmMessage: "您確定要關閉此對話嗎？用戶將無法發布新意見或投票。",
    closeConfirmButton: "關閉對話",
    reopenConfirmMessage: "重新打開此對話？用戶將能夠再次發布意見和投票。",
    reopenConfirmButton: "重新打開對話",
    cancelButton: "取消",
    closeSuccess: "成功關閉對話",
    openSuccess: "成功打開對話",
    closeNotAllowed: "您無權關閉此對話",
    openNotAllowed: "您無權打開此對話",
    alreadyClosed: "此對話已關閉",
    alreadyOpen: "此對話已打開",
    syncSuccess: "從 GitHub 同步成功",
    syncError: "從 GitHub 同步失敗",
  },
  he: {
    closeConfirmMessage: "האם ברצונך לסגור שיחה זו? משתמשים לא יוכלו לפרסם הצהרות או הצבעות חדשות.",
    closeConfirmButton: "סגירת שיחה",
    reopenConfirmMessage: "לפתוח מחדש שיחה זו? משתמשים יוכלו שוב לפרסם הצהרות ולהצביע.",
    reopenConfirmButton: "פתיחה מחדש של שיחה",
    cancelButton: "ביטול",
    closeSuccess: "השיחה נסגרה בהצלחה",
    openSuccess: "השיחה נפתחה בהצלחה",
    closeNotAllowed: "אין לך הרשאה לסגור שיחה זו",
    openNotAllowed: "אין לך הרשאה לפתוח שיחה זו",
    alreadyClosed: "שיחה זו כבר סגורה",
    alreadyOpen: "שיחה זו כבר פתוחה",
    syncSuccess: "סנכרון מ-GitHub הצליח",
    syncError: "סנכרון מ-GitHub נכשל",
  },
  ja: {
    closeConfirmMessage:
      "この会話を閉じてもよろしいですか？ユーザーは新しい意見や投票を投稿できなくなります。",
    closeConfirmButton: "会話を閉じる",
    reopenConfirmMessage:
      "この会話を再開しますか？ユーザーは再び意見を投稿したり投票したりできるようになります。",
    reopenConfirmButton: "会話を再開する",
    cancelButton: "キャンセル",
    closeSuccess: "会話を正常に閉じました",
    openSuccess: "会話を正常に開きました",
    closeNotAllowed: "この会話を閉じる権限がありません",
    openNotAllowed: "この会話を開く権限がありません",
    alreadyClosed: "この会話はすでに閉じられています",
    alreadyOpen: "この会話はすでに開いています",
    syncSuccess: "GitHub からの同期に成功しました",
    syncError: "GitHub からの同期に失敗しました",
  },
  ky: {
    closeConfirmMessage:
      "Бул талкууну жабууну каалайсызбы? Колдонуучулар жаңы пикирлерди же добуштарды жарыялай алышпайт.",
    closeConfirmButton: "Талкууну жабуу",
    reopenConfirmMessage:
      "Бул талкууну кайра ачасызбы? Колдонуучулар кайра пикирлерин жарыялап жана добуш бере алышат.",
    reopenConfirmButton: "Талкууну кайра ачуу",
    cancelButton: "Жокко чыгаруу",
    closeSuccess: "Талкуу ийгиликтүү жабылды",
    openSuccess: "Талкуу ийгиликтүү ачылды",
    closeNotAllowed: "Сизге бул талкууну жабууга уруксат жок",
    openNotAllowed: "Сизге бул талкууну ачууга уруксат жок",
    alreadyClosed: "Бул талкуу мурунтан эле жабылган",
    alreadyOpen: "Бул талкуу мурунтан эле ачык",
    syncSuccess: "GitHub'тен синхрондоо ийгиликтүү болду",
    syncError: "GitHub'тен синхрондоо ишке ашпай калды",
  },
  ru: {
    closeConfirmMessage:
      "Вы уверены, что хотите закрыть это обсуждение? Пользователи не смогут публиковать новые высказывания или голосовать.",
    closeConfirmButton: "Закрыть обсуждение",
    reopenConfirmMessage:
      "Открыть это обсуждение заново? Пользователи снова смогут публиковать высказывания и голосовать.",
    reopenConfirmButton: "Открыть обсуждение заново",
    cancelButton: "Отмена",
    closeSuccess: "Обсуждение успешно закрыто",
    openSuccess: "Обсуждение успешно открыто",
    closeNotAllowed: "У вас нет прав для закрытия этого обсуждения",
    openNotAllowed: "У вас нет прав для открытия этого обсуждения",
    alreadyClosed: "Это обсуждение уже закрыто",
    alreadyOpen: "Это обсуждение уже открыто",
    syncSuccess: "Синхронизация с GitHub выполнена успешно",
    syncError: "Не удалось синхронизировать с GitHub",
  },
};
