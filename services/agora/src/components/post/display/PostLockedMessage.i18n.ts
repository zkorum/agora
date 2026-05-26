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
      "This conversation was closed by the facilitator. New statements and votes cannot be posted.",
    editButton: "Edit",
  },
  ar: {
    lockedMessage: 'تم قفل المنشور بسبب "{reason}". لا يمكن نشر مقترحات جديدة.',
    closedMessage:
      "تم إغلاق هذه المحادثة من قبل الميسر. لا يمكن نشر مقترحات وتصويتات جديدة.",
    editButton: "تعديل",
  },
  es: {
    lockedMessage:
      'Publicación bloqueada como "{reason}". No se pueden publicar nuevas proposiciones.',
    closedMessage:
      "Esta conversación fue cerrada por el facilitador. No se pueden publicar nuevas proposiciones ni votos.",
    editButton: "Editar",
  },
  fa: {
    lockedMessage: "پست به عنوان «{reason}» قفل شده است. گزاره‌های جدید قابل ارسال نیستند.",
    closedMessage: "این گفتگو توسط تسهیل‌گر بسته شده است. گزاره‌ها و رأی‌های جدید قابل ارسال نیستند.",
    editButton: "ویرایش",
  },
  fr: {
    lockedMessage:
      'Publication verrouillée en tant que "{reason}". De nouvelles propositions ne peuvent pas être publiées.',
    closedMessage:
      "Cette conversation a été fermée par le facilitateur. Les nouvelles propositions et votes ne peuvent pas être publiés.",
    editButton: "Modifier",
  },
  "zh-Hans": {
    lockedMessage: '帖子被锁定为"{reason}"。无法发布新意见。',
    closedMessage: "此对话已被主持人关闭。无法发布新意见和投票。",
    editButton: "编辑",
  },
  "zh-Hant": {
    lockedMessage: '帖子被鎖定為"{reason}"。無法發布新意見。',
    closedMessage: "此對話已被主持人關閉。無法發布新意見和投票。",
    editButton: "編輯",
  },
  he: {
    lockedMessage: "הפוסט ננעל כ-\"{reason}\". לא ניתן לפרסם הצהרות חדשות.",
    closedMessage: "שיחה זו נסגרה על ידי המנחה. לא ניתן לפרסם הצהרות והצבעות חדשות.",
    editButton: "עריכה",
  },
  ja: {
    lockedMessage:
      "投稿が「{reason}」によってロックされています。新しい意見を投稿できません。",
    closedMessage:
      "この会話はファシリテーターによって閉じられました。新しい意見や投票を投稿できません。",
    editButton: "編集",
  },
  ky: {
    lockedMessage: "Жазуу \"{reason}\" катары кулпуланган. Жаңы пикирлерди жарыялоого болбойт.",
    closedMessage:
      "Бул талкуу фасилитатор тарабынан жабылган. Жаңы пикирлерди жана добуштарды жарыялоого болбойт.",
    editButton: "Түзөтүү",
  },
  ru: {
    lockedMessage: "Публикация заблокирована: \"{reason}\". Новые высказывания не могут быть опубликованы.",
    closedMessage:
      "Это обсуждение закрыто фасилитатором. Новые высказывания и голоса не могут быть опубликованы.",
    editButton: "Редактировать",
  },
};
