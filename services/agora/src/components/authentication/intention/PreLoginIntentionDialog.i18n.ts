import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PreLoginIntentionDialogTranslations {
  title: string;
  titleZupassOnly: string;
  message: string;
  messageBothRequired: string;
  messageZupassOnly: string;
  labelOk: string;
  labelOkZupass: string;
  labelCancel: string;
}

export const preLoginIntentionDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  PreLoginIntentionDialogTranslations
> = {
  en: {
    title: "Log in to Agora",
    titleZupassOnly: "Verify Event Ticket",
    message: "Log in to participate in the discussions",
    messageBothRequired: "This conversation requires login and event ticket verification to participate",
    messageZupassOnly: "This conversation requires event ticket verification to participate",
    labelOk: "Log In",
    labelOkZupass: "Verify Ticket",
    labelCancel: "Cancel",
  },
  ar: {
    title: "تسجيل الدخول إلى أغورا",
    titleZupassOnly: "التحقق من تذكرة الحدث",
    message: "سجّل دخولك للمشاركة في النقاشات",
    messageBothRequired: "تتطلب هذه المحادثة تسجيل الدخول والتحقق من تذكرة الحدث للمشاركة",
    messageZupassOnly: "تتطلب هذه المحادثة التحقق من تذكرة الحدث للمشاركة",
    labelOk: "تسجيل الدخول",
    labelOkZupass: "التحقق من التذكرة",
    labelCancel: "إلغاء",
  },
  es: {
    title: "Iniciar sesión en Ágora",
    titleZupassOnly: "Verificar Boleto del Evento",
    message: "Inicia sesión para participar en las discusiones",
    messageBothRequired: "Esta conversación requiere inicio de sesión y verificación de boleto del evento para participar",
    messageZupassOnly: "Esta conversación requiere verificación de boleto del evento para participar",
    labelOk: "Iniciar Sesión",
    labelOkZupass: "Verificar Boleto",
    labelCancel: "Cancelar",
  },
  fr: {
    title: "Se connecter à Agora",
    titleZupassOnly: "Vérifier le Billet d'Événement",
    message: "Connectez-vous pour participer aux discussions",
    messageBothRequired: "Cette conversation nécessite une connexion et une vérification de billet d'événement pour participer",
    messageZupassOnly: "Cette conversation nécessite une vérification de billet d'événement pour participer",
    labelOk: "Se Connecter",
    labelOkZupass: "Vérifier le Billet",
    labelCancel: "Annuler",
  },
  "zh-Hans": {
    title: "登录 Agora",
    titleZupassOnly: "验证活动门票",
    message: "登录以参与讨论",
    messageBothRequired: "此对话需要登录和活动门票验证才能参与",
    messageZupassOnly: "此对话需要活动门票验证才能参与",
    labelOk: "登录",
    labelOkZupass: "验证门票",
    labelCancel: "取消",
  },
  "zh-Hant": {
    title: "登入 Agora",
    titleZupassOnly: "驗證活動門票",
    message: "登入以參與討論",
    messageBothRequired: "此對話需要登入和活動門票驗證才能參與",
    messageZupassOnly: "此對話需要活動門票驗證才能參與",
    labelOk: "登入",
    labelOkZupass: "驗證門票",
    labelCancel: "取消",
  },
  ja: {
    title: "Agora にログイン",
    titleZupassOnly: "イベントチケットの確認",
    message: "ログインして議論に参加",
    messageBothRequired: "この会話に参加するにはログインとイベントチケットの確認が必要です",
    messageZupassOnly: "この会話に参加するにはイベントチケットの確認が必要です",
    labelOk: "ログイン",
    labelOkZupass: "チケット確認",
    labelCancel: "キャンセル",
  },
};
