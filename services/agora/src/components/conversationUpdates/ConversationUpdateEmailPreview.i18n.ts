import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateEmailPreviewTranslations {
  emailPreview: string;
  defaultSubject: string;
  eligibleRecipientSingular: string;
  eligibleRecipientPlural: string;
  replyToLabel: string;
  emptySelection: string;
}

export const conversationUpdateEmailPreviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateEmailPreviewTranslations
> = {
  en: {
    emailPreview: "Email preview",
    defaultSubject: "Your update subject",
    eligibleRecipientSingular: "Currently {count} eligible recipient",
    eligibleRecipientPlural: "Currently {count} eligible recipients",
    replyToLabel: "Reply to",
    emptySelection:
      "Select a scope and at least one conversation to preview the email.",
  },
  ar: {
    emailPreview: "معاينة البريد الإلكتروني",
    defaultSubject: "موضوع تحديثك",
    eligibleRecipientSingular: "يوجد حاليًا {count} مستلم مؤهل",
    eligibleRecipientPlural: "يوجد حاليًا {count} مستلمين مؤهلين",
    replyToLabel: "الرد إلى",
    emptySelection:
      "اختر نطاقًا ومحادثة واحدة على الأقل لمعاينة البريد الإلكتروني.",
  },
  es: {
    emailPreview: "Vista previa del correo",
    defaultSubject: "Asunto de su novedad",
    eligibleRecipientSingular: "Actualmente {count} destinatario elegible",
    eligibleRecipientPlural: "Actualmente {count} destinatarios elegibles",
    replyToLabel: "Responder a",
    emptySelection:
      "Seleccione un ámbito y al menos una conversación para ver el correo.",
  },
  fa: {
    emailPreview: "پیش‌نمایش ایمیل",
    defaultSubject: "موضوع به‌روزرسانی شما",
    eligibleRecipientSingular: "در حال حاضر {count} دریافت‌کننده واجد شرایط",
    eligibleRecipientPlural: "در حال حاضر {count} دریافت‌کننده واجد شرایط",
    replyToLabel: "پاسخ به",
    emptySelection:
      "برای پیش‌نمایش ایمیل، یک محدوده و حداقل یک گفت‌وگو انتخاب کنید.",
  },
  fr: {
    emailPreview: "Aperçu de l’e-mail",
    defaultSubject: "Objet de votre nouvelle",
    eligibleRecipientSingular: "Actuellement {count} destinataire éligible",
    eligibleRecipientPlural: "Actuellement {count} destinataires éligibles",
    replyToLabel: "Répondre à",
    emptySelection:
      "Sélectionnez un périmètre et au moins une conversation pour prévisualiser l’e-mail.",
  },
  "zh-Hans": {
    emailPreview: "邮件预览",
    defaultSubject: "您的动态主题",
    eligibleRecipientSingular: "目前有 {count} 名合格收件人",
    eligibleRecipientPlural: "目前有 {count} 名合格收件人",
    replyToLabel: "回复至",
    emptySelection: "请选择一个范围和至少一个对话以预览邮件。",
  },
  "zh-Hant": {
    emailPreview: "郵件預覽",
    defaultSubject: "您的動態主旨",
    eligibleRecipientSingular: "目前有 {count} 名合資格收件人",
    eligibleRecipientPlural: "目前有 {count} 名合資格收件人",
    replyToLabel: "回覆至",
    emptySelection: "請選擇一個範圍和至少一個對話以預覽郵件。",
  },
  he: {
    emailPreview: "תצוגה מקדימה של הדוא״ל",
    defaultSubject: "נושא העדכון שלך",
    eligibleRecipientSingular: "כרגע נמען זכאי אחד ({count})",
    eligibleRecipientPlural: "כרגע {count} נמענים זכאים",
    replyToLabel: "מענה אל",
    emptySelection:
      "בחרו תחום ולפחות שיחה אחת כדי להציג תצוגה מקדימה של הדוא״ל.",
  },
  ja: {
    emailPreview: "メールプレビュー",
    defaultSubject: "更新の件名",
    eligibleRecipientSingular: "現在の対象受信者：{count}人",
    eligibleRecipientPlural: "現在の対象受信者：{count}人",
    replyToLabel: "返信先",
    emptySelection:
      "メールをプレビューするには、範囲と少なくとも1つの会話を選択してください。",
  },
  ky: {
    emailPreview: "Катты алдын ала көрүү",
    defaultSubject: "Жаңыртууңуздун темасы",
    eligibleRecipientSingular: "Учурда {count} жарамдуу алуучу",
    eligibleRecipientPlural: "Учурда {count} жарамдуу алуучу",
    replyToLabel: "Жооп берүү",
    emptySelection:
      "Катты алдын ала көрүү үчүн чөйрөнү жана кеминде бир талкууну тандаңыз.",
  },
  ru: {
    emailPreview: "Предпросмотр письма",
    defaultSubject: "Тема вашего обновления",
    eligibleRecipientSingular: "Сейчас {count} подходящий получатель",
    eligibleRecipientPlural: "Сейчас {count} подходящих получателя",
    replyToLabel: "Ответить на",
    emptySelection:
      "Выберите область и хотя бы одно обсуждение для предпросмотра письма.",
  },
};
