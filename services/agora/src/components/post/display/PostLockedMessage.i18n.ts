import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostLockedMessageTranslations {
  lockedMessage: string;
  closedMessage: string;
  editButton: string;
}

export const postLockedMessageTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostLockedMessageTranslations
> = {
  en: {
    lockedMessage: 'Post locked as "{reason}". New opinions cannot be posted.',
    closedMessage:
      "This conversation was closed by the owner. New opinions and votes cannot be posted.",
    editButton: "Edit",
  },
  ar: {
    lockedMessage: 'تم قفل المنشور بسبب "{reason}". لا يمكن نشر آراء جديدة.',
    closedMessage:
      "تم إغلاق هذه المحادثة من قبل المالك. لا يمكن نشر آراء وتصويتات جديدة.",
    editButton: "تعديل",
  },
  es: {
    lockedMessage:
      'Publicación bloqueada como "{reason}". No se pueden publicar nuevas opiniones.',
    closedMessage:
      "Esta conversación fue cerrada por el propietario. No se pueden publicar nuevas opiniones ni votos.",
    editButton: "Editar",
  },
  fr: {
    lockedMessage:
      'Publication verrouillée en tant que "{reason}". De nouvelles opinions ne peuvent pas être publiées.',
    closedMessage:
      "Cette conversation a été fermée par le propriétaire. Les nouvelles opinions et votes ne peuvent pas être publiés.",
    editButton: "Modifier",
  },
  "zh-Hans": {
    lockedMessage: '帖子被锁定为"{reason}"。无法发布新意见。',
    closedMessage: "此对话已被所有者关闭。无法发布新意见和投票。",
    editButton: "编辑",
  },
  "zh-Hant": {
    lockedMessage: '帖子被鎖定為"{reason}"。無法發布新意見。',
    closedMessage: "此對話已被所有者關閉。無法發布新意見和投票。",
    editButton: "編輯",
  },
  ja: {
    lockedMessage:
      "投稿が「{reason}」によってロックされています。新しい意見を投稿できません。",
    closedMessage:
      "この会話はオーナーによって閉じられました。新しい意見や投票を投稿できません。",
    editButton: "編集",
  },
};
