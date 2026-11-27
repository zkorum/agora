import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PreParticipationIntentionDialogTranslations {
  title: string;
  message: string;
  labelOk: string;
  labelCancel: string;
  subMessageConversationDraft: string;
}

export const preParticipationIntentionDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  PreParticipationIntentionDialogTranslations
> = {
  en: {
    title: "Log in to Agora",
    message: "Log in to participate in the discussions",
    labelOk: "Log In",
    labelCancel: "Cancel",
    subMessageConversationDraft: "Your conversation draft will be saved.",
  },
  de: {
    title: "In Agora anmelden",
    message: "Melden Sie sich an, um an den Diskussionen teilzunehmen",
    labelOk: "Anmelden",
    labelCancel: "Abbrechen",
    subMessageConversationDraft: "Ihr Diskussionsentwurf wird gespeichert.",
  },
  hi: {
    title: "Agora में लॉग इन करें",
    message: "चर्चाओं में भाग लेने के लिए लॉग इन करें",
    labelOk: "लॉगिन करें",
    labelCancel: "रद्द करें",
    subMessageConversationDraft: "आपकी चर्चा का मसौदा सहेजा जाएगा।",
  },
  fa: {
    title: "ورود به Agora",
    message: "برای مشارکت در بحث‌ها وارد شوید",
    labelOk: "ورود",
    labelCancel: "لغو",
    subMessageConversationDraft: "پیش‌نویس گفتگوی شما ذخیره خواهد شد.",
  },
  ar: {
    title: "تسجيل الدخول إلى أغورا",
    message: "سجّل دخولك للمشاركة في النقاشات",
    labelOk: "تسجيل الدخول",
    labelCancel: "إلغاء",
    subMessageConversationDraft: "سيتم حفظ مسودة المحادثة الخاصة بك.",
  },
  es: {
    title: "Iniciar sesión en Ágora",
    message: "Inicie sesión para participar en las discusiones",
    labelOk: "Iniciar Sesión",
    labelCancel: "Cancelar",
    subMessageConversationDraft: "Su borrador de conversación se guardará.",
  },
  fr: {
    title: "Se connecter à Agora",
    message: "Connectez-vous pour participer aux discussions",
    labelOk: "Se Connecter",
    labelCancel: "Annuler",
    subMessageConversationDraft:
      "Votre brouillon de conversation sera sauvegardé.",
  },
  "zh-Hans": {
    title: "登录 Agora",
    message: "登录以参与讨论",
    labelOk: "登录",
    labelCancel: "取消",
    subMessageConversationDraft: "您的对话草稿将被保存。",
  },
  "zh-Hant": {
    title: "登入 Agora",
    message: "登入以參與討論",
    labelOk: "登入",
    labelCancel: "取消",
    subMessageConversationDraft: "您的對話草稿將被儲存。",
  },
  he: {
    title: "התחברות ל-Agora",
    message: "התחברו כדי להשתתף בדיונים",
    labelOk: "התחברות",
    labelCancel: "ביטול",
    subMessageConversationDraft: "טיוטת השיחה שלך תישמר.",
  },
  ja: {
    title: "Agora にログイン",
    message: "ログインして議論に参加",
    labelOk: "ログイン",
    labelCancel: "キャンセル",
    subMessageConversationDraft: "あなたの会話の下書きは保存されます。",
  },
  ky: {
    title: "Agora'га кирүү",
    message: "Талкууларга катышуу үчүн кириңиз",
    labelOk: "Кирүү",
    labelCancel: "Жокко чыгаруу",
    subMessageConversationDraft: "Талкуу черновигиңиз сакталат.",
  },
  ru: {
    title: "Войти в Agora",
    message: "Войдите, чтобы участвовать в обсуждениях",
    labelOk: "Войти",
    labelCancel: "Отмена",
    subMessageConversationDraft: "Черновик вашего обсуждения будет сохранён.",
  },
};
