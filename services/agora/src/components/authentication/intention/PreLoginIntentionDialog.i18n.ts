import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PreLoginIntentionDialogTranslations {
  title: string;
  titleZupassOnly: string;
  titleEmailRequired: string;
  titleStrongRequired: string;
  message: string;
  messageBothRequired: string;
  messageZupassOnly: string;
  messageEmailRequired: string;
  messageStrongRequired: string;
  labelOk: string;
  labelOkZupass: string;
  labelOkEmail: string;
  labelOkStrong: string;
  labelCancel: string;
  subMessageStatementDraft: string;
  subMessageConversationDraft: string;
  subMessageReturnToStatement: string;
  subMessageReturnToConversation: string;
  subMessageReportRequired: string;
}

export const preLoginIntentionDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  PreLoginIntentionDialogTranslations
> = {
  en: {
    title: "Log in to Agora",
    titleZupassOnly: "Verify Event Ticket",
    titleEmailRequired: "Verify Email",
    titleStrongRequired: "Verify your identity",
    message: "Log in to participate in the discussions",
    messageBothRequired: "This conversation requires login and event ticket verification to participate",
    messageZupassOnly: "This conversation requires event ticket verification to participate",
    messageEmailRequired: "Verify your email to participate in this conversation",
    messageStrongRequired: "Verify your phone or identity to participate in this conversation",
    labelOk: "Log In",
    labelOkZupass: "Verify Ticket",
    labelOkEmail: "Verify Email",
    labelOkStrong: "Verify",
    labelCancel: "Cancel",
    subMessageStatementDraft: "Your statement draft will be saved.",
    subMessageConversationDraft: "Your conversation draft will be saved.",
    subMessageReturnToStatement: "You'll be returned to this statement.",
    subMessageReturnToConversation: "You'll be returned to this conversation.",
    subMessageReportRequired: "A user account is required to report user content.",
  },
  ar: {
    title: "تسجيل الدخول إلى أغورا",
    titleZupassOnly: "التحقق من تذكرة الحدث",
    titleEmailRequired: "تحقق من بريدك الإلكتروني",
    titleStrongRequired: "تحقق من هويتك",
    message: "سجّل دخولك للمشاركة في النقاشات",
    messageBothRequired: "تتطلب هذه المحادثة تسجيل الدخول والتحقق من تذكرة الحدث للمشاركة",
    messageZupassOnly: "تتطلب هذه المحادثة التحقق من تذكرة الحدث للمشاركة",
    messageEmailRequired: "تحقق من بريدك الإلكتروني للمشاركة في هذه المحادثة",
    messageStrongRequired: "تحقق من هاتفك أو هويتك للمشاركة في هذه المحادثة",
    labelOk: "تسجيل الدخول",
    labelOkZupass: "التحقق من التذكرة",
    labelOkEmail: "تحقق من البريد",
    labelOkStrong: "تحقق",
    labelCancel: "إلغاء",
    subMessageStatementDraft: "سيتم حفظ مسودة الاقتراح الخاص بك.",
    subMessageConversationDraft: "سيتم حفظ مسودة المحادثة الخاصة بك.",
    subMessageReturnToStatement: "ستتم إعادتك إلى هذا الاقتراح.",
    subMessageReturnToConversation: "ستتم إعادتك إلى هذه المحادثة.",
    subMessageReportRequired: "يلزم حساب مستخدم للإبلاغ عن محتوى المستخدم.",
  },
  es: {
    title: "Iniciar sesión en Ágora",
    titleZupassOnly: "Verificar Boleto del Evento",
    titleEmailRequired: "Verifica tu correo",
    titleStrongRequired: "Verifica tu identidad",
    message: "Inicia sesión para participar en las discusiones",
    messageBothRequired: "Esta conversación requiere inicio de sesión y verificación de boleto del evento para participar",
    messageZupassOnly: "Esta conversación requiere verificación de boleto del evento para participar",
    messageEmailRequired: "Verifica tu correo electrónico para participar en esta conversación",
    messageStrongRequired: "Verifica tu teléfono o identidad para participar en esta conversación",
    labelOk: "Iniciar Sesión",
    labelOkZupass: "Verificar Boleto",
    labelOkEmail: "Verificar correo",
    labelOkStrong: "Verificar",
    labelCancel: "Cancelar",
    subMessageStatementDraft: "Tu borrador de proposición se guardará.",
    subMessageConversationDraft: "Tu borrador de conversación se guardará.",
    subMessageReturnToStatement: "Volverás a esta proposición.",
    subMessageReturnToConversation: "Volverás a esta conversación.",
    subMessageReportRequired: "Se requiere una cuenta de usuario para reportar contenido.",
  },
  fr: {
    title: "Se connecter à Agora",
    titleZupassOnly: "Vérifier le Billet d'Événement",
    titleEmailRequired: "Vérifiez votre e-mail",
    titleStrongRequired: "Vérifiez votre identité",
    message: "Connectez-vous pour participer aux discussions",
    messageBothRequired: "Cette conversation nécessite une connexion et une vérification de billet d'événement pour participer",
    messageZupassOnly: "Cette conversation nécessite une vérification de billet d'événement pour participer",
    messageEmailRequired: "Vérifiez votre e-mail pour participer à cette conversation",
    messageStrongRequired: "Vérifiez votre téléphone ou identité pour participer à cette conversation",
    labelOk: "Se Connecter",
    labelOkZupass: "Vérifier le Billet",
    labelOkEmail: "Vérifier l'e-mail",
    labelOkStrong: "Vérifier",
    labelCancel: "Annuler",
    subMessageStatementDraft: "Votre brouillon de proposition sera sauvegardé.",
    subMessageConversationDraft: "Votre brouillon de conversation sera sauvegardé.",
    subMessageReturnToStatement: "Vous serez redirigé vers cette proposition.",
    subMessageReturnToConversation: "Vous serez redirigé vers cette conversation.",
    subMessageReportRequired: "Un compte utilisateur est nécessaire pour signaler du contenu.",
  },
  "zh-Hans": {
    title: "登录 Agora",
    titleZupassOnly: "验证活动门票",
    titleEmailRequired: "验证您的电子邮箱",
    titleStrongRequired: "验证您的身份",
    message: "登录以参与讨论",
    messageBothRequired: "此对话需要登录和活动门票验证才能参与",
    messageZupassOnly: "此对话需要活动门票验证才能参与",
    messageEmailRequired: "验证您的电子邮箱以参与此对话",
    messageStrongRequired: "验证您的手机或身份以参与此对话",
    labelOk: "登录",
    labelOkZupass: "验证门票",
    labelOkEmail: "验证邮箱",
    labelOkStrong: "验证",
    labelCancel: "取消",
    subMessageStatementDraft: "您的观点草稿将被保存。",
    subMessageConversationDraft: "您的对话草稿将被保存。",
    subMessageReturnToStatement: "您将返回到该观点。",
    subMessageReturnToConversation: "您将返回到该对话。",
    subMessageReportRequired: "举报用户内容需要用户账户。",
  },
  "zh-Hant": {
    title: "登入 Agora",
    titleZupassOnly: "驗證活動門票",
    titleEmailRequired: "驗證您的電子郵件",
    titleStrongRequired: "驗證您的身分",
    message: "登入以參與討論",
    messageBothRequired: "此對話需要登入和活動門票驗證才能參與",
    messageZupassOnly: "此對話需要活動門票驗證才能參與",
    messageEmailRequired: "驗證您的電子郵件以參與此對話",
    messageStrongRequired: "驗證您的手機或身分以參與此對話",
    labelOk: "登入",
    labelOkZupass: "驗證門票",
    labelOkEmail: "驗證郵件",
    labelOkStrong: "驗證",
    labelCancel: "取消",
    subMessageStatementDraft: "您的觀點草稿將被儲存。",
    subMessageConversationDraft: "您的對話草稿將被儲存。",
    subMessageReturnToStatement: "您將返回到該觀點。",
    subMessageReturnToConversation: "您將返回到該對話。",
    subMessageReportRequired: "檢舉用戶內容需要用戶帳戶。",
  },
  ja: {
    title: "Agora にログイン",
    titleZupassOnly: "イベントチケットの確認",
    titleEmailRequired: "メールアドレスを確認",
    titleStrongRequired: "本人確認",
    message: "ログインして議論に参加",
    messageBothRequired: "この会話に参加するにはログインとイベントチケットの確認が必要です",
    messageZupassOnly: "この会話に参加するにはイベントチケットの確認が必要です",
    messageEmailRequired: "この会話に参加するにはメールアドレスの確認が必要です",
    messageStrongRequired: "この会話に参加するには電話番号または本人確認が必要です",
    labelOk: "ログイン",
    labelOkZupass: "チケット確認",
    labelOkEmail: "メール確認",
    labelOkStrong: "確認",
    labelCancel: "キャンセル",
    subMessageStatementDraft: "あなたの意見の下書きは保存されます。",
    subMessageConversationDraft: "あなたの会話の下書きは保存されます。",
    subMessageReturnToStatement: "この意見に戻ります。",
    subMessageReturnToConversation: "この会話に戻ります。",
    subMessageReportRequired: "コンテンツの報告にはユーザーアカウントが必要です。",
  },
};
