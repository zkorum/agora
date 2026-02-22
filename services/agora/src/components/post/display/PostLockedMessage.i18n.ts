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
    lockedMessage: 'Post locked as "{reason}". New statements cannot be posted.',
    closedMessage:
      "This conversation was closed by the owner. New statements and votes cannot be posted.",
    editButton: "Edit",
  },
  ar: {
    lockedMessage: 'تم قفل المنشور بسبب "{reason}". لا يمكن نشر مقترحات جديدة.',
    closedMessage:
      "تم إغلاق هذه المحادثة من قبل المالك. لا يمكن نشر مقترحات وتصويتات جديدة.",
    editButton: "تعديل",
  },
  es: {
    lockedMessage:
      'Publicación bloqueada como "{reason}". No se pueden publicar nuevas proposiciones.',
    closedMessage:
      "Esta conversación fue cerrada por el propietario. No se pueden publicar nuevas proposiciones ni votos.",
    editButton: "Editar",
  },
  fr: {
    lockedMessage:
      'Publication verrouillée en tant que "{reason}". De nouvelles propositions ne peuvent pas être publiées.',
    closedMessage:
      "Cette conversation a été fermée par le propriétaire. Les nouvelles propositions et votes ne peuvent pas être publiés.",
    editButton: "Modifier",
  },
  "zh-Hans": {
    lockedMessage: '帖子被锁定为"{reason}"。无法发布新观点。',
    closedMessage: "此对话已被所有者关闭。无法发布新观点和投票。",
    editButton: "编辑",
  },
  "zh-Hant": {
    lockedMessage: '帖子被鎖定為"{reason}"。無法發布新觀點。',
    closedMessage: "此對話已被所有者關閉。無法發布新觀點和投票。",
    editButton: "編輯",
  },
  ja: {
    lockedMessage:
      "投稿が「{reason}」によってロックされています。新しい主張を投稿できません。",
    closedMessage:
      "この会話はオーナーによって閉じられました。新しい主張や投票を投稿できません。",
    editButton: "編集",
  },
};
