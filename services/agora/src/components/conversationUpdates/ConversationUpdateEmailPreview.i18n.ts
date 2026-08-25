import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateEmailPreviewTranslations {
  emailPreview: string;
  defaultSubject: string;
  eligibleRecipientSingular: string;
  eligibleRecipientPlural: string;
  fromLabel: string;
  replyToLabel: string;
  messagePlaceholder: string;
  conversationPlaceholder: string;
  managePreferences: string;
  seeMore: string;
  unsubscribeFrom: string;
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
    fromLabel: "From",
    replyToLabel: "Reply to",
    messagePlaceholder: "Your message will appear here as you write.",
    conversationPlaceholder: "Select a conversation to continue.",
    managePreferences:
      "Manage preferences or unsubscribe from specific conversations",
    seeMore: "See more",
    unsubscribeFrom: "Unsubscribe from {name}",
  },
  ar: {
    emailPreview: "معاينة البريد الإلكتروني",
    defaultSubject: "موضوع تحديثك",
    eligibleRecipientSingular: "يوجد حاليًا {count} مستلم مؤهل",
    eligibleRecipientPlural: "يوجد حاليًا {count} مستلمين مؤهلين",
    fromLabel: "من",
    replyToLabel: "الرد إلى",
    messagePlaceholder: "ستظهر رسالتك هنا أثناء الكتابة.",
    conversationPlaceholder: "اختر محادثة للمتابعة.",
    managePreferences: "إدارة التفضيلات أو إلغاء الاشتراك في محادثات محددة",
    seeMore: "عرض المزيد",
    unsubscribeFrom: "إلغاء الاشتراك في {name}",
  },
  es: {
    emailPreview: "Vista previa del correo",
    defaultSubject: "Asunto de tu novedad",
    eligibleRecipientSingular: "Actualmente {count} destinatario elegible",
    eligibleRecipientPlural: "Actualmente {count} destinatarios elegibles",
    fromLabel: "De",
    replyToLabel: "Responder a",
    messagePlaceholder: "Tu mensaje aparecerá aquí mientras escribes.",
    conversationPlaceholder: "Selecciona una conversación para continuar.",
    managePreferences:
      "Gestionar tus preferencias de seguimiento por correo o dejar de seguir conversaciones concretas",
    seeMore: "Ver más",
    unsubscribeFrom: "Dejar de seguir {name} por correo",
  },
  fa: {
    emailPreview: "پیش‌نمایش ایمیل",
    defaultSubject: "موضوع به‌روزرسانی شما",
    eligibleRecipientSingular: "در حال حاضر {count} دریافت‌کننده واجد شرایط",
    eligibleRecipientPlural: "در حال حاضر {count} دریافت‌کننده واجد شرایط",
    fromLabel: "از",
    replyToLabel: "پاسخ به",
    messagePlaceholder: "هنگام نوشتن، پیام شما اینجا نمایش داده می‌شود.",
    conversationPlaceholder: "برای ادامه یک گفت‌وگو انتخاب کنید.",
    managePreferences: "مدیریت ترجیحات یا لغو اشتراک از گفت‌وگوهای خاص",
    seeMore: "مشاهده بیشتر",
    unsubscribeFrom: "لغو اشتراک از {name}",
  },
  fr: {
    emailPreview: "Aperçu de l’e-mail",
    defaultSubject: "Objet de votre nouvelle",
    eligibleRecipientSingular: "Actuellement {count} destinataire éligible",
    eligibleRecipientPlural: "Actuellement {count} destinataires éligibles",
    fromLabel: "De",
    replyToLabel: "Répondre à",
    messagePlaceholder: "Votre message apparaîtra ici pendant la rédaction.",
    conversationPlaceholder: "Sélectionnez une conversation pour continuer.",
    managePreferences:
      "Gérer vos préférences de suivi par e-mail ou ne plus suivre certaines conversations",
    seeMore: "Voir plus",
    unsubscribeFrom: "Ne plus suivre {name} par e-mail",
  },
  "zh-Hans": {
    emailPreview: "邮件预览",
    defaultSubject: "您的动态主题",
    eligibleRecipientSingular: "目前有 {count} 名合格收件人",
    eligibleRecipientPlural: "目前有 {count} 名合格收件人",
    fromLabel: "发件人",
    replyToLabel: "回复至",
    messagePlaceholder: "您输入的消息会显示在这里。",
    conversationPlaceholder: "选择一个对话以继续。",
    managePreferences: "管理偏好或取消订阅特定对话",
    seeMore: "查看更多",
    unsubscribeFrom: "取消订阅{name}",
  },
  "zh-Hant": {
    emailPreview: "郵件預覽",
    defaultSubject: "您的動態主旨",
    eligibleRecipientSingular: "目前有 {count} 名合資格收件人",
    eligibleRecipientPlural: "目前有 {count} 名合資格收件人",
    fromLabel: "寄件者",
    replyToLabel: "回覆至",
    messagePlaceholder: "您輸入的訊息會顯示在這裡。",
    conversationPlaceholder: "選擇一個對話以繼續。",
    managePreferences: "管理偏好或取消訂閱特定對話",
    seeMore: "查看更多",
    unsubscribeFrom: "取消訂閱{name}",
  },
  he: {
    emailPreview: "תצוגה מקדימה של הדוא״ל",
    defaultSubject: "נושא העדכון שלך",
    eligibleRecipientSingular: "כרגע נמען זכאי אחד ({count})",
    eligibleRecipientPlural: "כרגע {count} נמענים זכאים",
    fromLabel: "מאת",
    replyToLabel: "מענה אל",
    messagePlaceholder: "ההודעה שלך תופיע כאן במהלך הכתיבה.",
    conversationPlaceholder: "יש לבחור שיחה כדי להמשיך.",
    managePreferences: "ניהול העדפות או ביטול הרשמה משיחות מסוימות",
    seeMore: "הצגת עוד",
    unsubscribeFrom: "ביטול הרשמה מ-{name}",
  },
  ja: {
    emailPreview: "メールプレビュー",
    defaultSubject: "更新の件名",
    eligibleRecipientSingular: "現在の対象受信者：{count}人",
    eligibleRecipientPlural: "現在の対象受信者：{count}人",
    fromLabel: "送信元",
    replyToLabel: "返信先",
    messagePlaceholder: "入力したメッセージがここに表示されます。",
    conversationPlaceholder: "続行するには会話を選択してください。",
    managePreferences: "設定を管理するか、特定の会話の配信を停止",
    seeMore: "さらに表示",
    unsubscribeFrom: "{name}の配信を停止",
  },
  ky: {
    emailPreview: "Катты алдын ала көрүү",
    defaultSubject: "Жаңыртууңуздун темасы",
    eligibleRecipientSingular: "Учурда {count} жарамдуу алуучу",
    eligibleRecipientPlural: "Учурда {count} жарамдуу алуучу",
    fromLabel: "Кимден",
    replyToLabel: "Жооп берүү",
    messagePlaceholder: "Жазып жатканыңызда билдирүүңүз бул жерде көрүнөт.",
    conversationPlaceholder: "Улантуу үчүн талкуу тандаңыз.",
    managePreferences: "Жөндөөлөрдү башкаруу же айрым талкуулардан баш тартуу",
    seeMore: "Көбүрөөк көрүү",
    unsubscribeFrom: "{name} жаңыртууларынан баш тартуу",
  },
  ru: {
    emailPreview: "Предпросмотр письма",
    defaultSubject: "Тема вашего обновления",
    eligibleRecipientSingular: "Сейчас {count} подходящий получатель",
    eligibleRecipientPlural: "Сейчас {count} подходящих получателя",
    fromLabel: "От",
    replyToLabel: "Ответить на",
    messagePlaceholder: "Ваше сообщение появится здесь по мере ввода.",
    conversationPlaceholder: "Выберите обсуждение, чтобы продолжить.",
    managePreferences:
      "Управлять настройками или отписаться от отдельных обсуждений",
    seeMore: "Показать ещё",
    unsubscribeFrom: "Отписаться от обновлений «{name}»",
  },
};
