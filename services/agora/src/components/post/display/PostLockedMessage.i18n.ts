export interface PostLockedMessageTranslations {
  lockedMessage: string;
  editButton: string;
}

export const postLockedMessageTranslations: Record<
  string,
  PostLockedMessageTranslations
> = {
  en: {
    lockedMessage: 'Post locked as "{reason}". New opinions cannot be posted.',
    editButton: "Edit",
  },
  es: {
    lockedMessage:
      'Publicación bloqueada como "{reason}". No se pueden publicar nuevas opiniones.',
    editButton: "Editar",
  },
  fr: {
    lockedMessage:
      'Publication verrouillée en tant que "{reason}". De nouvelles opinions ne peuvent pas être publiées.',
    editButton: "Modifier",
  },
  "zh-Hans": {
    lockedMessage: "帖子被锁定为“{reason}”。无法发布新意见。",
    editButton: "编辑",
  },
  "zh-Hant": {
    lockedMessage: "帖子被鎖定為“{reason}”。無法發布新意見。",
    editButton: "編輯",
  },
  ja: {
    lockedMessage:
      "投稿が「{reason}」によってロックされています。新しい意見を投稿できません。",
    editButton: "編集",
  },
};
